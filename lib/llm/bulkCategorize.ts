import type { ParsedTransaction } from "../ingestion/types";
import type { LlmBulkProvider, LlmMerchantRequest } from "./types";
import {
  getMerchantCacheEntry,
  persistMerchantCacheEntry,
  updateMerchantEnrichment,
} from "../merchants/repository";
import { getOrCreateCategories } from "../categories/repository";
import { getUserSettings } from "../settings/repository";
import { lookupMerchant } from "../merchants/webLookup";

export type BulkCategorizationResult = {
  transactions: ParsedTransaction[];
  warnings: string[];
};

export async function enrichTransactionsWithLlm({
  transactions,
  provider,
  userId,
  apiKey,
}: {
  transactions: ParsedTransaction[];
  provider: LlmBulkProvider;
  userId?: string;
  apiKey?: string;
}): Promise<BulkCategorizationResult> {
  const warnings: string[] = [];
  const uniqueMerchants = new Map<string, LlmMerchantRequest>();

  for (const tx of transactions) {
    const key = tx.originalMerchantName.trim().toLowerCase();
    if (!key) continue;
    if (!uniqueMerchants.has(key)) {
      uniqueMerchants.set(key, {
        originalName: tx.originalMerchantName,
        merchantCategoryHint: tx.merchantCategoryHint,
        notes: tx.notes,
      });
    }
  }

  const unknownMerchants: LlmMerchantRequest[] = [];
  for (const merchant of uniqueMerchants.values()) {
    const cached = await getMerchantCacheEntry(merchant.originalName);
    if (!cached) {
      unknownMerchants.push(merchant);
    }
  }

  if (unknownMerchants.length > 0) {
    const categories = userId ? await getOrCreateCategories(userId) : [];
    const settings = userId ? await getUserSettings(userId) : {};
    const response = await provider(unknownMerchants, {
      userId,
      apiKey,
      categories,
    });
    warnings.push(...response.warnings);
    const categoryLookup = new Map(
      categories.map((category) => [
        category.name.toLowerCase(),
        category.id,
      ])
    );
    for (const result of response.results) {
      let categoryId = result.categoryId;
      if (!categoryId && result.categoryName) {
        categoryId =
          categoryLookup.get(result.categoryName.toLowerCase()) ?? undefined;
      }
      const merchantId = await persistMerchantCacheEntry({
        originalName: result.originalName,
        normalizedName: result.normalizedName,
        categoryId,
        confidenceScore: result.confidenceScore,
        isBusiness: result.isBusiness,
        masterFlag: result.masterFlag,
        isReimbursement: result.isReimbursement,
      });

      if (result.confidenceScore < 0.6) {
        const lookup = await lookupMerchant(
          result.normalizedName,
          Boolean(settings.merchant_lookup_enabled)
        );
        if (lookup?.normalizedName) {
          const updatedMerchantId = await persistMerchantCacheEntry({
            originalName: result.originalName,
            normalizedName: lookup.normalizedName,
            categoryId,
            confidenceScore: lookup.confidence ?? result.confidenceScore,
          });
          const targetId = updatedMerchantId ?? merchantId;
          if (targetId) {
            await updateMerchantEnrichment({
              merchantId: targetId,
              displayName: lookup.normalizedName,
              website: lookup.website,
              enrichment: lookup.raw,
            });
          }
        }
      }
    }
  }

  const enriched: ParsedTransaction[] = [];
  for (const tx of transactions) {
    const cached = await getMerchantCacheEntry(tx.originalMerchantName);
    if (!cached) {
      enriched.push(tx);
      continue;
    }
    enriched.push({
      ...tx,
      normalizedMerchantName: cached.normalizedName,
      categoryId: cached.categoryId ?? tx.categoryId,
      confidenceScore: cached.confidenceScore ?? tx.confidenceScore,
      isBusiness: cached.isBusiness ?? tx.isBusiness,
      masterFlag: cached.masterFlag ?? tx.masterFlag,
      isReimbursement: cached.isReimbursement ?? tx.isReimbursement,
    });
  }

  return { transactions: enriched, warnings };
}

import type { ParsedTransaction } from "./types";
import type { Rule } from "../rules/types";
import { applyRules } from "../rules/engine";
import type { LlmBulkProvider } from "../llm/types";
import { enrichTransactionsWithLlm } from "../llm/bulkCategorize";
import { localHeuristicProvider } from "../llm/providers";
import { geminiBulkProvider } from "../llm/geminiProvider";
import { anthropicBulkProvider } from "../llm/anthropicProvider";
import { openaiBulkProvider } from "../llm/openaiProvider";
import { getUserSettings } from "../settings/repository";

export type EnrichmentResult = {
  transactions: ParsedTransaction[];
  warnings: string[];
};

export async function enrichTransactions({
  transactions,
  rules,
  userId,
  provider,
}: {
  transactions: ParsedTransaction[];
  rules: Rule[];
  userId?: string;
  provider?: LlmBulkProvider;
}): Promise<EnrichmentResult> {
  const warnings: string[] = [];
  const ruleApplied = transactions.map((tx) => {
    const { updated, appliedRuleIds } = applyRules(
      {
        originalMerchantName: tx.originalMerchantName,
        normalizedMerchantName: tx.normalizedMerchantName,
        merchantCategoryHint: tx.merchantCategoryHint,
        notes: tx.notes,
        categoryId: tx.categoryId,
        isBusiness: tx.isBusiness,
        masterFlag: tx.masterFlag,
        isReimbursement: tx.isReimbursement,
      },
      rules
    );

    return {
      ...tx,
      normalizedMerchantName: updated.normalizedMerchantName,
      categoryId: updated.categoryId,
      isBusiness: updated.isBusiness,
      masterFlag: updated.masterFlag,
      isReimbursement: updated.isReimbursement,
      appliedRuleIds,
    };
  });

  const providerToUse = provider ?? localHeuristicProvider;
  const settings = userId ? await getUserSettings(userId) : {};
  const providerSetting =
    settings.llm_provider ?? process.env.LLM_PROVIDER ?? "anthropic";
  const resolvedProvider =
    providerSetting === "anthropic"
      ? anthropicBulkProvider
      : providerSetting === "gemini"
      ? geminiBulkProvider
      : providerSetting === "openai"
      ? openaiBulkProvider
      : providerToUse;
  const llmEnriched = await enrichTransactionsWithLlm({
    transactions: ruleApplied,
    provider: resolvedProvider,
    userId,
    apiKey:
      providerSetting === "anthropic"
        ? settings.anthropic_api_key ?? undefined
        : providerSetting === "gemini"
        ? settings.gemini_api_key ?? undefined
        : providerSetting === "openai"
        ? settings.openai_api_key ?? undefined
        : undefined,
  });
  warnings.push(...llmEnriched.warnings);

  return { transactions: llmEnriched.transactions, warnings };
}

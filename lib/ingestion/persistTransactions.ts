import { getSupabaseServerClient } from "../supabase/server";
import type { ParsedTransaction } from "./types";
import { getFxRate } from "../fx/rates";
import { getUserSettings } from "../settings/repository";
import { createHash } from "crypto";

const hasSupabase =
  Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function persistTransactions({
  userId,
  sourceKey,
  filename,
  transactions,
  attachmentId,
}: {
  userId: string;
  sourceKey: string;
  filename: string;
  transactions: ParsedTransaction[];
  attachmentId?: string;
}) {
  if (!hasSupabase) return { count: 0, sourceId: null };
  const supabase = getSupabaseServerClient();

  const { data: source } = await supabase
    .from("sources")
    .insert({
      user_id: userId,
      provider: sourceKey,
      account_label: filename,
      currency_base: "ILS",
    })
    .select("id")
    .single();

  const sourceId = source?.id ?? null;
  const settings = await getUserSettings(userId);
  const baseCurrency = settings.base_currency ?? "ILS";
  const rows = [];
  for (const tx of transactions) {
    const rate =
      tx.currencyOriginal && tx.currencyOriginal !== baseCurrency
        ? await getFxRate({
            date: tx.transactionDate,
            base: baseCurrency,
            quote: tx.currencyOriginal,
          })
        : 1;
    const amountBase = tx.amountOriginal / (rate ?? 1);
    const transactionHash = hashTransaction({
      date: tx.transactionDate,
      merchant: tx.normalizedMerchantName ?? tx.originalMerchantName,
      amount: tx.amountOriginal,
      currency: tx.currencyOriginal,
      source: sourceId ?? "unknown",
    });
    rows.push({
      user_id: userId,
      source_id: sourceId,
      transaction_date: tx.transactionDate,
      original_merchant_name: tx.originalMerchantName,
      normalized_merchant_name: tx.normalizedMerchantName ?? null,
      category_id: tx.categoryId ?? null,
      amount_original: tx.amountOriginal,
      currency_original: tx.currencyOriginal,
      amount_base: amountBase,
      currency_base: baseCurrency,
      installment_total: tx.installmentTotal ?? null,
      installment_monthly: tx.installmentMonthly ?? null,
      installment_remaining: tx.installmentRemaining ?? null,
      confidence_score: tx.confidenceScore ?? null,
      is_business: tx.isBusiness ?? false,
      master_flag: tx.masterFlag ?? false,
      is_reimbursement: tx.isReimbursement ?? false,
      transaction_hash: transactionHash,
      notes: tx.notes ?? null,
    });
  }

  if (rows.length === 0) return { count: 0, sourceId };

  const { error } = await supabase.from("transactions").upsert(rows, {
    onConflict: "user_id,transaction_hash",
    ignoreDuplicates: true,
  });
  if (error) {
    return { count: 0, sourceId };
  }

  if (attachmentId) {
    await supabase
      .from("attachments")
      .update({ source_id: sourceId, parsed_at: new Date().toISOString() })
      .eq("id", attachmentId);
  }

  return { count: rows.length, sourceId };
}

function hashTransaction({
  date,
  merchant,
  amount,
  currency,
  source,
}: {
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  source: string;
}) {
  return createHash("sha256")
    .update(`${date}|${merchant}|${amount}|${currency}|${source}`)
    .digest("hex");
}

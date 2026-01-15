import type { MerchantCacheEntry } from "./cache";
import { getSupabaseServerClient } from "../supabase/server";
import { getMerchantCacheEntry as getMemoryEntry, setMerchantCacheEntry } from "./cache";

const hasSupabase =
  Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function getMerchantCacheEntry(
  originalName: string
): Promise<MerchantCacheEntry | null> {
  const cached = getMemoryEntry(originalName);
  if (cached) return cached;

  if (!hasSupabase) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("merchant_aliases")
    .select(
      "original_name,normalized_name,category_id,confidence_score,is_business,master_flag,is_reimbursement"
    )
    .eq("original_name", originalName)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const entry: MerchantCacheEntry = {
    originalName: data.original_name,
    normalizedName: data.normalized_name,
    categoryId: data.category_id ?? undefined,
    confidenceScore: data.confidence_score ?? undefined,
    isBusiness: data.is_business ?? undefined,
    masterFlag: data.master_flag ?? undefined,
    isReimbursement: data.is_reimbursement ?? undefined,
  };

  setMerchantCacheEntry(entry);
  return entry;
}

export async function persistMerchantCacheEntry(entry: MerchantCacheEntry) {
  setMerchantCacheEntry(entry);

  if (!hasSupabase) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const merchantId = await ensureMerchantId(
    supabase,
    entry.normalizedName
  );

  const { data: existing } = await supabase
    .from("merchant_aliases")
    .select("id")
    .eq("original_name", entry.originalName)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("merchant_aliases")
      .update({
        normalized_name: entry.normalizedName,
        category_id: entry.categoryId ?? null,
        confidence_score: entry.confidenceScore ?? null,
        is_business: entry.isBusiness ?? null,
        master_flag: entry.masterFlag ?? null,
        is_reimbursement: entry.isReimbursement ?? null,
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("merchant_aliases").insert({
    merchant_id: merchantId,
    original_name: entry.originalName,
    normalized_name: entry.normalizedName,
    category_id: entry.categoryId ?? null,
    confidence_score: entry.confidenceScore ?? null,
    is_business: entry.isBusiness ?? null,
    master_flag: entry.masterFlag ?? null,
    is_reimbursement: entry.isReimbursement ?? null,
  });
  return merchantId;
}

export async function updateMerchantEnrichment({
  merchantId,
  displayName,
  website,
  enrichment,
}: {
  merchantId: string;
  displayName?: string;
  website?: string;
  enrichment?: Record<string, unknown>;
}) {
  if (!hasSupabase) return;
  const supabase = getSupabaseServerClient();
  await supabase
    .from("merchants")
    .update({
      display_name: displayName ?? null,
      website: website ?? null,
      enrichment_json: enrichment ?? null,
      enriched_at: new Date().toISOString(),
    })
    .eq("id", merchantId);
}

async function ensureMerchantId(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  canonicalName: string
) {
  const { data } = await supabase
    .from("merchants")
    .select("id")
    .eq("canonical_name", canonicalName)
    .limit(1)
    .maybeSingle();

  if (data?.id) {
    return data.id as string;
  }

  const { data: inserted } = await supabase
    .from("merchants")
    .insert({ canonical_name: canonicalName })
    .select("id")
    .single();

  return inserted?.id as string;
}

import { getSupabaseServerClient } from "../supabase/server";
import type { Rule } from "./types";

const hasSupabase =
  Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function getRules(userId: string): Promise<Rule[]> {
  if (!hasSupabase) return [];
  const supabase = getSupabaseServerClient();
  const { data } = await supabase.from("rules").select("*").eq("user_id", userId);
  if (!data) return [];
  return data.map((rule) => ({
    id: rule.id,
    ruleType: rule.rule_type,
    matchValue: rule.match_value,
    categoryId: rule.category_id ?? undefined,
    isBusiness: rule.is_business ?? undefined,
    masterFlag: rule.master_flag ?? undefined,
  }));
}

export async function upsertRule(userId: string, rule: Omit<Rule, "id">) {
  if (!hasSupabase) return;
  const supabase = getSupabaseServerClient();
  await supabase.from("rules").insert({
    user_id: userId,
    rule_type: rule.ruleType,
    match_value: rule.matchValue,
    category_id: rule.categoryId ?? null,
    is_business: rule.isBusiness ?? null,
    master_flag: rule.masterFlag ?? null,
  });
}

export async function applyNormalizationOverride({
  userId,
  originalName,
  normalizedName,
}: {
  userId: string;
  originalName: string;
  normalizedName: string;
}) {
  if (!hasSupabase) return;
  const supabase = getSupabaseServerClient();

  await supabase.from("merchant_aliases").upsert(
    {
      user_id: userId,
      original_name: originalName,
      normalized_name: normalizedName,
    },
    { onConflict: "user_id,original_name" }
  );

  await supabase.from("transactions").update({
    normalized_merchant_name: normalizedName,
  }).eq("user_id", userId).eq("original_merchant_name", originalName);
}

import { getSupabaseServerClient } from "../supabase/server";
import { decryptSecret } from "../security/crypto";

const hasSupabase =
  Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export type UserSettings = {
  llm_provider?: string;
  monthly_budget_usd?: number | null;
  hard_limit_enabled?: boolean;
  anthropic_api_key?: string | null;
  gemini_api_key?: string | null;
  openai_api_key?: string | null;
  base_currency?: string | null;
  ocr_provider?: string | null;
  paywall_enabled?: boolean;
  paywall_unlocked?: boolean;
  merchant_lookup_enabled?: boolean;
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  if (!hasSupabase) return {};
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return {};
  return {
    ...data,
    anthropic_api_key: data.anthropic_api_key
      ? safeDecrypt(data.anthropic_api_key)
      : null,
    gemini_api_key: data.gemini_api_key
      ? safeDecrypt(data.gemini_api_key)
      : null,
    openai_api_key: data.openai_api_key
      ? safeDecrypt(data.openai_api_key)
      : null,
  };
}

function safeDecrypt(value: string) {
  try {
    return decryptSecret(value);
  } catch {
    return value;
  }
}

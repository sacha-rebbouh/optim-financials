import { getSupabaseServerClient } from "../supabase/server";

const PROVIDER_PRICING: Record<
  string,
  { input: number; output: number }
> = {
  anthropic: { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  gemini: { input: 1.25 / 1_000_000, output: 10 / 1_000_000 },
  openai: { input: 2 / 1_000_000, output: 8 / 1_000_000 },
};

const hasSupabase =
  Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function recordUsage({
  provider,
  inputTokens,
  outputTokens,
  userId,
}: {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  userId?: string;
}) {
  if (!hasSupabase || !userId) return;
  const supabase = getSupabaseServerClient();
  const periodMonth = new Date().toISOString().slice(0, 7);
  const pricing = PROVIDER_PRICING[provider] ?? PROVIDER_PRICING.anthropic;
  const costUsd =
    inputTokens * pricing.input + outputTokens * pricing.output;

  const { data } = await supabase
    .from("api_usage")
    .select("id,input_tokens,output_tokens,cost_usd")
    .eq("user_id", userId)
    .eq("period_month", periodMonth)
    .eq("provider", provider)
    .maybeSingle();

  if (data?.id) {
    await supabase
      .from("api_usage")
      .update({
        input_tokens: (data.input_tokens ?? 0) + inputTokens,
        output_tokens: (data.output_tokens ?? 0) + outputTokens,
        cost_usd: Number(data.cost_usd ?? 0) + costUsd,
      })
      .eq("id", data.id);
  } else {
    await supabase.from("api_usage").insert({
      user_id: userId,
      period_month: periodMonth,
      provider,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
    });
  }
}

export async function isOverBudget(userId: string, provider: string) {
  if (!hasSupabase) return false;
  const supabase = getSupabaseServerClient();
  const { data: settings } = await supabase
    .from("user_settings")
    .select("monthly_budget_usd,hard_limit_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (!settings?.monthly_budget_usd || !settings.hard_limit_enabled) {
    return false;
  }

  const periodMonth = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabase
    .from("api_usage")
    .select("cost_usd")
    .eq("user_id", userId)
    .eq("period_month", periodMonth)
    .eq("provider", provider)
    .maybeSingle();

  return Number(usage?.cost_usd ?? 0) >= Number(settings.monthly_budget_usd);
}

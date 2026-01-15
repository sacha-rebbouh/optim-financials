import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { encryptSecret } from "../../../lib/security/crypto";
import { requireUser } from "../../../lib/auth/verify";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return Response.json({
      settings: data
        ? {
            llm_provider: data.llm_provider,
            monthly_budget_usd: data.monthly_budget_usd,
            hard_limit_enabled: data.hard_limit_enabled,
            anthropic_api_key_present: Boolean(data.anthropic_api_key),
            gemini_api_key_present: Boolean(data.gemini_api_key),
            openai_api_key_present: Boolean(data.openai_api_key),
            base_currency: data.base_currency,
            ocr_provider: data.ocr_provider,
            paywall_enabled: data.paywall_enabled,
            paywall_unlocked: data.paywall_unlocked,
            merchant_lookup_enabled: data.merchant_lookup_enabled,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, settings } = body ?? {};

  if (!userId || !settings) {
    return new Response("Missing userId or settings", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    if (
      (settings.anthropicApiKey ||
        settings.geminiApiKey ||
        settings.openaiApiKey) &&
      !process.env.SETTINGS_ENCRYPTION_KEY
    ) {
      return new Response("Missing SETTINGS_ENCRYPTION_KEY", { status: 500 });
    }

    const supabase = getSupabaseServerClient();
    const { data: existing } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const payload = {
      user_id: userId,
      llm_provider: settings.llmProvider ?? "anthropic",
      monthly_budget_usd:
        settings.monthlyBudgetUsd !== undefined
          ? Number(settings.monthlyBudgetUsd)
          : null,
      hard_limit_enabled: Boolean(settings.hardLimitEnabled),
      base_currency: settings.baseCurrency ?? "ILS",
      ocr_provider: settings.ocrProvider ?? "ocrspace",
      paywall_enabled: Boolean(settings.paywallEnabled),
      paywall_unlocked: Boolean(settings.paywallUnlocked),
      merchant_lookup_enabled: Boolean(settings.merchantLookupEnabled),
      anthropic_api_key: settings.anthropicApiKey
        ? encryptSecret(settings.anthropicApiKey)
        : existing?.anthropic_api_key ?? null,
      gemini_api_key: settings.geminiApiKey
        ? encryptSecret(settings.geminiApiKey)
        : existing?.gemini_api_key ?? null,
      openai_api_key: settings.openaiApiKey
        ? encryptSecret(settings.openaiApiKey)
        : existing?.openai_api_key ?? null,
    };

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return Response.json({ settings: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

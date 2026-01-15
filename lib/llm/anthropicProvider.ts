import type { LlmBulkProvider, LlmBulkResult } from "./types";
import { recordUsage } from "../usage/track";

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-5";

export const anthropicBulkProvider: LlmBulkProvider = async (
  merchants,
  context
) => {
  const apiKey = context?.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      results: merchants.map((merchant) => ({
        originalName: merchant.originalName,
        normalizedName: merchant.originalName,
        confidenceScore: 0.2,
      })),
      warnings: ["ANTHROPIC_API_KEY absent, fallback local."],
    };
  }

  const prompt = buildPrompt(merchants, context?.categories ?? []);
  const response = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return {
      results: merchants.map((merchant) => ({
        originalName: merchant.originalName,
        normalizedName: merchant.originalName,
        confidenceScore: 0.2,
      })),
      warnings: [`Anthropic error: ${text}`],
    };
  }

  const data = await response.json();
  const content = data?.content?.[0]?.text ?? "";
  const parsed = safeJsonParse(content);
  const usage = data?.usage;
  if (usage) {
    await recordUsage({
      provider: "anthropic",
      inputTokens: usage.input_tokens ?? 0,
      outputTokens: usage.output_tokens ?? 0,
      userId: context?.userId,
    });
  }

  if (!parsed || !Array.isArray(parsed.results)) {
    return {
      results: merchants.map((merchant) => ({
        originalName: merchant.originalName,
        normalizedName: merchant.originalName,
        confidenceScore: 0.2,
      })),
      warnings: ["Réponse Anthropic invalide, fallback local."],
    };
  }

  return {
    results: parsed.results.map((item: any) => ({
      originalName: String(item.originalName ?? ""),
      normalizedName: String(item.normalizedName ?? ""),
      categoryId: item.categoryId ? String(item.categoryId) : undefined,
      categoryName: item.categoryName ? String(item.categoryName) : undefined,
      confidenceScore: Number(item.confidenceScore ?? 0.5),
      isBusiness: item.isBusiness ?? undefined,
      masterFlag: item.masterFlag ?? undefined,
      isReimbursement: item.isReimbursement ?? undefined,
    })),
    warnings: parsed.warnings ?? [],
  };
};

function buildPrompt(
  merchants: { originalName: string; merchantCategoryHint?: string; notes?: string }[],
  categories: { id: string; name: string }[]
) {
  const payload = merchants.map((merchant) => ({
    originalName: merchant.originalName,
    merchantCategoryHint: merchant.merchantCategoryHint ?? "",
    notes: merchant.notes ?? "",
  }));

  return [
    "Tu es un assistant de normalisation de marchands.",
    "Retourne uniquement un JSON strict avec la clé results.",
    "Chaque item doit contenir:",
    "- originalName",
    "- normalizedName (nom clair, normalisé, sans détails de transaction)",
    "- categoryName (choisir dans la liste fournie)",
    "- confidenceScore (0 à 1)",
    "- isBusiness (optionnel)",
    "- masterFlag (optionnel)",
    "- isReimbursement (optionnel)",
    "",
    "Liste des categories:",
    JSON.stringify(categories.map((c) => c.name), null, 2),
    "",
    "Liste des marchands:",
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const cleaned = text.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

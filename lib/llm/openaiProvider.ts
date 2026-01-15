import type { LlmBulkProvider } from "./types";
import { recordUsage } from "../usage/track";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1";

export const openaiBulkProvider: LlmBulkProvider = async (
  merchants,
  context
) => {
  const apiKey = context?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      results: merchants.map((merchant) => ({
        originalName: merchant.originalName,
        normalizedName: merchant.originalName,
        confidenceScore: 0.2,
      })),
      warnings: ["OPENAI_API_KEY absent, fallback local."],
    };
  }

  const prompt = buildPrompt(merchants, context?.categories ?? []);
  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_MODEL,
      input: prompt,
      temperature: 0.2,
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
      warnings: [`OpenAI error: ${text}`],
    };
  }

  const data = await response.json();
  const content =
    data?.output?.[0]?.content?.[0]?.text ??
    data?.output_text ??
    "";
  const parsed = safeJsonParse(content);

  if (data?.usage) {
    await recordUsage({
      provider: "openai",
      inputTokens: data.usage.input_tokens ?? 0,
      outputTokens: data.usage.output_tokens ?? 0,
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
      warnings: ["Réponse OpenAI invalide, fallback local."],
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

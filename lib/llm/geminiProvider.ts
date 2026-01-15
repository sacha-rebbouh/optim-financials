import type { LlmBulkProvider, LlmBulkResult } from "./types";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

export const geminiBulkProvider: LlmBulkProvider = async (
  merchants,
  context
) => {
  const apiKey = context?.apiKey ?? process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      results: merchants.map((merchant) => ({
        originalName: merchant.originalName,
        normalizedName: merchant.originalName,
        confidenceScore: 0.2,
      })),
      warnings: ["GEMINI_API_KEY absent, fallback local."],
    };
  }

  const prompt = buildPrompt(merchants, context?.categories ?? []);
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
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
      warnings: [`Gemini error: ${text}`],
    };
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = safeJsonParse(content);

  if (!parsed || !Array.isArray(parsed.results)) {
    return {
      results: merchants.map((merchant) => ({
        originalName: merchant.originalName,
        normalizedName: merchant.originalName,
        confidenceScore: 0.2,
      })),
      warnings: ["Réponse Gemini invalide, fallback local."],
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

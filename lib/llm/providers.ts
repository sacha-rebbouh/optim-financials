import type { LlmBulkProvider, LlmBulkResult } from "./types";

export const localHeuristicProvider: LlmBulkProvider = async (merchants) => {
  const results = merchants.map((merchant) => ({
    originalName: merchant.originalName,
    normalizedName: normalizeMerchant(merchant.originalName),
    confidenceScore: 0.35,
  }));

  const response: LlmBulkResult = {
    results,
    warnings: [
      "LLM provider non configuré. Utilisation d'une normalisation locale.",
    ],
  };

  return response;
};

function normalizeMerchant(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

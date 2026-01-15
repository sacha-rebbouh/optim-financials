export type LlmMerchantRequest = {
  originalName: string;
  merchantCategoryHint?: string;
  notes?: string;
};

export type LlmMerchantResult = {
  originalName: string;
  normalizedName: string;
  categoryId?: string;
  categoryName?: string;
  confidenceScore: number;
  isBusiness?: boolean;
  masterFlag?: boolean;
  isReimbursement?: boolean;
};

export type LlmBulkResult = {
  results: LlmMerchantResult[];
  warnings: string[];
};

export type LlmBulkProvider = (
  merchants: LlmMerchantRequest[],
  context?: {
    userId?: string;
    apiKey?: string;
    categories?: { id: string; name: string }[];
  }
) => Promise<LlmBulkResult>;

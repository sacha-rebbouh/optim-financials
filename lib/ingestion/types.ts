export type IngestFileInput = {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  userId?: string;
  attachmentId?: string;
};

export type ParsedTransaction = {
  transactionDate: string;
  originalMerchantName: string;
  amountOriginal: number;
  currencyOriginal: string;
  amountCharged?: number;
  transactionType?: string;
  merchantCategoryHint?: string;
  installmentTotal?: number;
  installmentMonthly?: number;
  installmentRemaining?: number;
  notes?: string;
  normalizedMerchantName?: string;
  categoryId?: string;
  confidenceScore?: number;
  isBusiness?: boolean;
  masterFlag?: boolean;
  isReimbursement?: boolean;
  appliedRuleIds?: string[];
};

export type IngestSummary = {
  status: "pending_review" | "failed";
  source: string;
  sourceKey: string;
  fileType: "csv" | "xlsx" | "pdf" | "unknown";
  filename: string;
  size: number;
  parsedTransactions: number;
  pendingReview: number;
  persistedTransactions?: number;
  sourceId?: string;
  warnings: string[];
  sampleRows: string[][];
  sampleTransactions: ParsedTransaction[];
};

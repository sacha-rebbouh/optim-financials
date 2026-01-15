export type RuleType =
  | "merchant_exact"
  | "merchant_contains"
  | "normalized_exact"
  | "category_hint"
  | "note_contains";

export type Rule = {
  id: string;
  ruleType: RuleType;
  matchValue: string;
  categoryId?: string;
  isBusiness?: boolean;
  masterFlag?: boolean;
  isReimbursement?: boolean;
  normalizedMerchantName?: string;
};

export type RuleTarget = {
  originalMerchantName: string;
  normalizedMerchantName?: string;
  merchantCategoryHint?: string;
  notes?: string;
  categoryId?: string;
  isBusiness?: boolean;
  masterFlag?: boolean;
  isReimbursement?: boolean;
};

import type { Rule, RuleTarget } from "./types";

export type RuleApplication = {
  updated: RuleTarget;
  appliedRuleIds: string[];
};

export function applyRules(
  transaction: RuleTarget,
  rules: Rule[]
): RuleApplication {
  const applied: string[] = [];
  const updated: RuleTarget = { ...transaction };

  for (const rule of orderRules(rules)) {
    if (!matchesRule(transaction, rule)) {
      continue;
    }
    applyRule(updated, rule);
    applied.push(rule.id);
  }

  return { updated, appliedRuleIds: applied };
}

function orderRules(rules: Rule[]) {
  const priority: Record<Rule["ruleType"], number> = {
    merchant_exact: 1,
    normalized_exact: 2,
    merchant_contains: 3,
    category_hint: 4,
    note_contains: 5,
  };
  return [...rules].sort((a, b) => priority[a.ruleType] - priority[b.ruleType]);
}

function matchesRule(transaction: RuleTarget, rule: Rule) {
  const matchValue = rule.matchValue.trim().toLowerCase();
  if (!matchValue) return false;

  const original = transaction.originalMerchantName.toLowerCase();
  const normalized = (transaction.normalizedMerchantName ?? "").toLowerCase();
  const hint = (transaction.merchantCategoryHint ?? "").toLowerCase();
  const notes = (transaction.notes ?? "").toLowerCase();

  switch (rule.ruleType) {
    case "merchant_exact":
      return original === matchValue;
    case "merchant_contains":
      return original.includes(matchValue);
    case "normalized_exact":
      return normalized === matchValue;
    case "category_hint":
      return hint.includes(matchValue);
    case "note_contains":
      return notes.includes(matchValue);
    default:
      return false;
  }
}

function applyRule(target: RuleTarget, rule: Rule) {
  if (rule.categoryId) target.categoryId = rule.categoryId;
  if (rule.isBusiness !== undefined) target.isBusiness = rule.isBusiness;
  if (rule.masterFlag !== undefined) target.masterFlag = rule.masterFlag;
  if (rule.isReimbursement !== undefined)
    target.isReimbursement = rule.isReimbursement;
  if (rule.normalizedMerchantName)
    target.normalizedMerchantName = rule.normalizedMerchantName;
}

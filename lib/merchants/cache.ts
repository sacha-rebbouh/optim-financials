export type MerchantCacheEntry = {
  originalName: string;
  normalizedName: string;
  categoryId?: string;
  confidenceScore?: number;
  isBusiness?: boolean;
  masterFlag?: boolean;
  isReimbursement?: boolean;
};

const merchantCache = new Map<string, MerchantCacheEntry>();

export function getMerchantCacheEntry(originalName: string) {
  return merchantCache.get(toKey(originalName));
}

export function setMerchantCacheEntry(entry: MerchantCacheEntry) {
  merchantCache.set(toKey(entry.originalName), entry);
}

export function clearMerchantCache() {
  merchantCache.clear();
}

function toKey(value: string) {
  return value.trim().toLowerCase();
}

const hasLookupConfig =
  Boolean(process.env.MERCHANT_LOOKUP_API_URL) &&
  Boolean(process.env.MERCHANT_LOOKUP_API_KEY);

export type MerchantLookupResult = {
  normalizedName?: string;
  website?: string;
  confidence?: number;
  raw?: Record<string, unknown>;
};

export async function lookupMerchant(
  name: string,
  enabled = true
): Promise<MerchantLookupResult | null> {
  if (!enabled) return null;
  if (!hasLookupConfig) return null;
  const response = await fetch(process.env.MERCHANT_LOOKUP_API_URL as string, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.MERCHANT_LOOKUP_API_KEY}`,
    },
    body: JSON.stringify({ query: name }),
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return {
    normalizedName: data.normalizedName ?? data.name ?? undefined,
    website: data.website ?? data.url ?? undefined,
    confidence: data.confidence ?? undefined,
    raw: data,
  };
}

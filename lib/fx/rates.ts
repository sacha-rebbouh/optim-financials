import { getSupabaseServerClient } from "../supabase/server";

const hasSupabase =
  Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function getFxRate({
  date,
  base,
  quote,
}: {
  date: string;
  base: string;
  quote: string;
}) {
  if (!hasSupabase) return 1;
  const supabase = getSupabaseServerClient();
  if (base === quote) return 1;
  const { data } = await supabase
    .from("fx_rates")
    .select("rate")
    .eq("as_of_date", date)
    .eq("base_currency", base)
    .eq("quote_currency", quote)
    .maybeSingle();

  if (data?.rate) {
    return Number(data.rate);
  }

  const response = await fetch(
    `https://api.exchangerate.host/${date}?base=${base}&symbols=${quote}`
  );
  if (!response.ok) {
    return 1;
  }
  const payload = await response.json();
  const rate = Number(payload?.rates?.[quote]);
  if (!rate) return 1;

  await supabase.from("fx_rates").insert({
    as_of_date: date,
    base_currency: base,
    quote_currency: quote,
    rate,
  });

  return rate;
}

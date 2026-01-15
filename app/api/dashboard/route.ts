import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { requireUser } from "../../../lib/auth/verify";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const periodMonthsParam = Number(searchParams.get("periodMonths") ?? "1");
  const scope = searchParams.get("scope") ?? "all";
  const sourceId = searchParams.get("sourceId");
  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("transactions")
      .select(
        "amount_base,transaction_date,is_business,is_reimbursement,installment_remaining,normalized_merchant_name,category_id,categories(name)"
      )
      .eq("user_id", userId);

    if (sourceId) {
      query = query.eq("source_id", sourceId);
    }

    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7);
    const periodMonths = Number.isNaN(periodMonthsParam)
      ? 1
      : Math.max(1, Math.min(12, periodMonthsParam));
    const windowMonths = Math.max(periodMonths, 12);
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (windowMonths - 1), 1)
    );
    const periodStartKey = periodStart.toISOString().slice(0, 7);

    query = query.gte("transaction_date", periodStart.toISOString().slice(0, 10));

    const { data, error } = await query;

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("paywall_enabled,paywall_unlocked")
      .eq("user_id", userId)
      .maybeSingle();

    let totalMonth = 0;
    let totalAll = 0;
    let businessMonth = 0;
    let personalMonth = 0;
    let reimbursementsMonth = 0;
    let installmentsRemaining = 0;
    const categoryTotals = new Map<string, number>();
    const merchantMonths = new Map<
      string,
      { months: Set<string>; total: number; count: number; category?: string }
    >();
    const subscriptions = new Map<string, number>();
    const monthlyTotals = new Map<string, number>();

    for (const row of data ?? []) {
      const amount = Number(row.amount_base ?? 0);
      totalAll += amount;
      const month = String(row.transaction_date).slice(0, 7);
      monthlyTotals.set(month, (monthlyTotals.get(month) ?? 0) + amount);
      const matchesScope =
        scope === "all"
          ? true
          : scope === "business"
          ? Boolean(row.is_business)
          : !row.is_business;
      const inPeriod = month >= periodStartKey;
      if (month === currentMonth) {
        totalMonth += amount;
        if (row.is_business) {
          businessMonth += amount;
        } else {
          personalMonth += amount;
        }
        if (row.is_reimbursement) {
          reimbursementsMonth += amount;
        }
      }
      installmentsRemaining += Number(row.installment_remaining ?? 0);

      if (inPeriod && matchesScope) {
        const categoryName =
          (row.categories as { name?: string } | null)?.name ?? "Non classé";
        categoryTotals.set(
          categoryName,
          (categoryTotals.get(categoryName) ?? 0) + amount
        );
      }

      const merchant = row.normalized_merchant_name ?? "Marchand inconnu";
      const merchantEntry =
        merchantMonths.get(merchant) ??
        {
          months: new Set<string>(),
          total: 0,
          count: 0,
          category: (row.categories as { name?: string } | null)?.name ?? undefined,
        };
      if (inPeriod && matchesScope) {
        merchantEntry.months.add(month);
        merchantEntry.total += amount;
        merchantEntry.count += 1;
        merchantMonths.set(merchant, merchantEntry);
      }

      const categoryName =
        (row.categories as { name?: string } | null)?.name ?? "";
      if (inPeriod && matchesScope && categoryName.toLowerCase() === "abonnements") {
        subscriptions.set(
          merchant,
          (subscriptions.get(merchant) ?? 0) + amount
        );
      }
    }

    const recurringMerchants = [...merchantMonths.entries()]
      .filter(([, value]) => value.months.size >= 2 && value.count >= 2)
      .map(([merchant, value]) => ({
        merchant,
        months: value.months.size,
        total: value.total,
        count: value.count,
        category: value.category,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const categoryBreakdown = [...categoryTotals.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const subscriptionList = [...subscriptions.entries()]
      .map(([merchant, total]) => ({ merchant, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const monthlySeries = [...monthlyTotals.entries()]
      .map(([month, total]) => ({ month, total }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const paywallEnabled = Boolean(settings?.paywall_enabled);
    const paywallUnlocked = Boolean(settings?.paywall_unlocked);

    return Response.json({
      currentMonth,
      periodMonths,
      totalMonth,
      totalAll,
      businessMonth,
      personalMonth,
      reimbursementsMonth,
      installmentsRemaining,
      transactionCount: data?.length ?? 0,
      categoryBreakdown: paywallEnabled && !paywallUnlocked ? [] : categoryBreakdown,
      recurringMerchants:
        paywallEnabled && !paywallUnlocked ? [] : recurringMerchants,
      subscriptions:
        paywallEnabled && !paywallUnlocked ? [] : subscriptionList,
      monthlySeries,
      paywallEnabled,
      paywallUnlocked,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

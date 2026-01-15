import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { requireUser } from "../../../../lib/auth/verify";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const periodMonthsParam = Number(searchParams.get("periodMonths") ?? "1");
  const scope = searchParams.get("scope") ?? "all";
  const sourceId = searchParams.get("sourceId");
  const mode = searchParams.get("mode") ?? "filtered";

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
        "transaction_date,original_merchant_name,normalized_merchant_name,amount_base,currency_base,is_business,is_reimbursement,installment_remaining,categories(name)"
      )
      .eq("user_id", userId);

    if (sourceId) {
      query = query.eq("source_id", sourceId);
    }

    const { data, error } = await query;
    if (error) {
      return new Response(error.message, { status: 500 });
    }

    const now = new Date();
    const periodMonths = Number.isNaN(periodMonthsParam)
      ? 1
      : Math.max(1, Math.min(12, periodMonthsParam));
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (periodMonths - 1), 1)
    );
    const periodStartKey = periodStart.toISOString().slice(0, 7);

    const rows = (data ?? []).filter((row) => {
      const month = String(row.transaction_date).slice(0, 7);
      const matchesScope =
        scope === "all"
          ? true
          : scope === "business"
          ? Boolean(row.is_business)
          : !row.is_business;
      if (mode === "full") {
        return matchesScope;
      }
      if (mode === "subscriptions") {
        const categoryName =
          (row.categories as { name?: string } | null)?.name ?? "";
        return (
          month >= periodStartKey &&
          matchesScope &&
          categoryName.toLowerCase() === "abonnements"
        );
      }
      return month >= periodStartKey && matchesScope;
    });

    const header =
      mode === "accounting"
        ? [
            "date",
            "merchant",
            "merchant_normalized",
            "category",
            "amount",
            "currency",
            "business",
            "reimbursement",
            "installment_remaining",
          ]
        : [
            "transaction_date",
            "original_merchant_name",
            "normalized_merchant_name",
            "category",
            "amount_base",
            "currency_base",
            "is_business",
            "is_reimbursement",
            "installment_remaining",
          ];

    if (mode === "ifrs") {
      return new Response(buildIfrsExport(rows), {
        headers: {
          "content-type": "text/csv",
          "content-disposition": `attachment; filename=\"export-ifrs-${periodMonths}m.csv\"`,
        },
      });
    }

    const csvLines = [header.join(",")].concat(
      rows.map((row) => {
        const payload =
          mode === "accounting"
            ? [
                row.transaction_date,
                sanitize(row.original_merchant_name),
                sanitize(row.normalized_merchant_name ?? ""),
                sanitize((row.categories as { name?: string } | null)?.name ?? ""),
                row.amount_base,
                row.currency_base,
                row.is_business ? "true" : "false",
                row.is_reimbursement ? "true" : "false",
                row.installment_remaining ?? "",
              ]
            : [
                row.transaction_date,
                sanitize(row.original_merchant_name),
                sanitize(row.normalized_merchant_name ?? ""),
                sanitize((row.categories as { name?: string } | null)?.name ?? ""),
                row.amount_base,
                row.currency_base,
                row.is_business ? "true" : "false",
                row.is_reimbursement ? "true" : "false",
                row.installment_remaining ?? "",
              ];
        return payload.join(",");
      })
    );

    return new Response(csvLines.join("\n"), {
      headers: {
        "content-type": "text/csv",
        "content-disposition": `attachment; filename=\"export-${mode}-${periodMonths}m.csv\"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

function sanitize(value: string) {
  const cleaned = String(value ?? "").replace(/\"/g, "\"\"");
  return `"${cleaned}"`;
}

function buildIfrsExport(rows: any[]) {
  const header = [
    "posting_date",
    "description",
    "amount",
    "currency",
    "category",
    "business_unit",
    "source",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.transaction_date,
        sanitize(row.normalized_merchant_name ?? row.original_merchant_name),
        row.amount_base,
        row.currency_base,
        sanitize((row.categories as { name?: string } | null)?.name ?? ""),
        row.is_business ? "business" : "personal",
        "optim-financials",
      ].join(",")
    );
  }
  return lines.join("\n");
}

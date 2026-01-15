import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { requireUser } from "../../../lib/auth/verify";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "50");
  const search = searchParams.get("search");
  const unclassified = searchParams.get("unclassified") === "true";
  const reimbursements = searchParams.get("reimbursements") === "true";
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
        "id,transaction_date,original_merchant_name,normalized_merchant_name,amount_base,currency_base,is_business,master_flag,is_reimbursement,category_id,notes"
      )
      .eq("user_id", userId)
      .order("transaction_date", { ascending: false });

    if (search) {
      query = query.ilike("original_merchant_name", `%${search}%`);
    }
    if (unclassified) {
      query = query.is("category_id", null);
    }
    if (reimbursements) {
      query = query.eq("is_reimbursement", true);
    }

    const safeLimit = Number.isNaN(limit) ? 50 : Math.min(200, Math.max(10, limit));
    const safePage = Number.isNaN(page) ? 1 : Math.max(1, page);
    const from = (safePage - 1) * safeLimit;
    const to = from + safeLimit - 1;

    const { data, error } = await query.range(from, to);

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return Response.json({ transactions: data ?? [], page: safePage, limit: safeLimit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, transactionId, updates } = body ?? {};
  if (!userId || !transactionId || !updates) {
    return new Response("Missing userId or transactionId", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("transactions")
      .update({
        normalized_merchant_name: updates.normalized_merchant_name ?? null,
        category_id: updates.category_id ?? null,
        is_business: Boolean(updates.is_business),
        master_flag: Boolean(updates.master_flag),
        is_reimbursement: Boolean(updates.is_reimbursement),
        notes: updates.notes ?? null,
      })
      .eq("id", transactionId)
      .eq("user_id", userId);

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

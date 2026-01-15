import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { requireUser } from "../../../lib/auth/verify";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("transactions")
      .select("id,transaction_date,normalized_merchant_name,amount_base,currency_base")
      .eq("user_id", userId)
      .eq("is_reimbursement", true)
      .order("transaction_date", { ascending: false });

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return Response.json({ reimbursements: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, transactionId, isReimbursement } = body ?? {};
  if (!userId || !transactionId) {
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
      .update({ is_reimbursement: Boolean(isReimbursement) })
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

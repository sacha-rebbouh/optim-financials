import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { requireUser } from "../../../../lib/auth/verify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, ids, updates } = body ?? {};
  if (!userId || !Array.isArray(ids) || ids.length === 0 || !updates) {
    return new Response("Missing payload", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    const supabase = getSupabaseServerClient();
    const payload: Record<string, unknown> = {};
    if ("category_id" in updates) payload.category_id = updates.category_id;
    if ("is_business" in updates) payload.is_business = updates.is_business;
    if ("master_flag" in updates) payload.master_flag = updates.master_flag;
    if ("is_reimbursement" in updates)
      payload.is_reimbursement = updates.is_reimbursement;

    const { error } = await supabase
      .from("transactions")
      .update(payload)
      .eq("user_id", userId)
      .in("id", ids);

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

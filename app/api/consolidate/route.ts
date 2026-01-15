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
      .select("transaction_hash,source_id,transaction_date,amount_base")
      .eq("user_id", userId);

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    const total = data?.length ?? 0;
    const unique = new Set((data ?? []).map((row) => row.transaction_hash));
    const duplicates = total - unique.size;

    return Response.json({
      total,
      unique: unique.size,
      duplicates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

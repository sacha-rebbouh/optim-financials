import { getSupabaseServerClient } from "../../../lib/supabase/server";
import { requireUser } from "../../../lib/auth/verify";

export const runtime = "nodejs";
export const revalidate = 60;

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
    const periodMonth = new Date().toISOString().slice(0, 7);
    const { data, error } = await supabase
      .from("api_usage")
      .select("*")
      .eq("user_id", userId)
      .eq("period_month", periodMonth);

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return Response.json({ usage: data ?? [], periodMonth });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

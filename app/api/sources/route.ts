import { getSupabaseServerClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("sources")
      .select("id,provider,account_label")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return Response.json({ sources: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

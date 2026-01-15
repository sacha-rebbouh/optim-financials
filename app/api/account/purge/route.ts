import { getSupabaseServerClient } from "../../../../lib/supabase/server";
import { deleteAttachments } from "../../../../lib/storage/attachments";
import { requireUser } from "../../../../lib/auth/verify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const { userId } = body ?? {};
  if (!userId) {
    return new Response("Missing userId", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    const supabase = getSupabaseServerClient();
    const { data: attachments } = await supabase
      .from("attachments")
      .select("storage_path")
      .eq("user_id", userId);
    const paths = (attachments ?? [])
      .map((item) => item.storage_path)
      .filter(Boolean);
    await deleteAttachments(paths);
    await supabase.from("transactions").delete().eq("user_id", userId);
    await supabase.from("merchant_aliases").delete().eq("user_id", userId);
    await supabase.from("merchants").delete().eq("user_id", userId);
    await supabase.from("rules").delete().eq("user_id", userId);
    await supabase.from("categories").delete().eq("user_id", userId);
    await supabase.from("sources").delete().eq("user_id", userId);
    await supabase.from("attachments").delete().eq("user_id", userId);
    await supabase.from("api_usage").delete().eq("user_id", userId);
    await supabase.from("user_settings").delete().eq("user_id", userId);

    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

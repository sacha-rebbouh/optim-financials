import { getSupabaseServerClient } from "../../../../lib/supabase/server";
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
    const { data, error } = await supabase
      .from("transactions")
      .select("id,transaction_hash,created_at")
      .eq("user_id", userId);

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    const grouped = new Map<string, { id: string; created_at: string }[]>();
    for (const row of data ?? []) {
      if (!row.transaction_hash) continue;
      const bucket = grouped.get(row.transaction_hash) ?? [];
      bucket.push({ id: row.id, created_at: row.created_at });
      grouped.set(row.transaction_hash, bucket);
    }

    const toDelete: string[] = [];
    for (const entries of grouped.values()) {
      if (entries.length <= 1) continue;
      entries.sort((a, b) => a.created_at.localeCompare(b.created_at));
      toDelete.push(...entries.slice(1).map((entry) => entry.id));
    }

    if (toDelete.length > 0) {
      await supabase.from("transactions").delete().in("id", toDelete);
    }

    return Response.json({ deleted: toDelete.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

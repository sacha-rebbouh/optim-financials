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
      .from("rules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return Response.json({ rules: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, rule } = body ?? {};

  if (!userId || !rule) {
    return new Response("Missing userId or rule", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("rules").insert({
      user_id: userId,
      rule_type: rule.ruleType,
      match_value: rule.matchValue,
      category_id: rule.categoryId ?? null,
      is_business: rule.isBusiness ?? null,
      master_flag: rule.masterFlag ?? null,
      is_reimbursement: rule.isReimbursement ?? null,
    }).select("*").single();

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return Response.json({ rule: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const ruleId = searchParams.get("ruleId");

  if (!userId || !ruleId) {
    return new Response("Missing userId or ruleId", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    const supabase = getSupabaseServerClient();
    const { error } = await supabase
      .from("rules")
      .delete()
      .eq("user_id", userId)
      .eq("id", ruleId);

    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

import { getSupabaseServerClient } from "../supabase/server";

const hasSupabase =
  Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_CATEGORIES = [
  "Logement",
  "Transport",
  "Abonnements",
  "Restaurants",
  "Supermarché",
  "Santé",
  "Éducation",
  "Loisirs",
  "Famille",
  "Voyage",
  "Assurances",
  "Impôts",
  "Tsedaka",
  "Maaser",
];

export async function getOrCreateCategories(userId: string) {
  if (!hasSupabase) return [];
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("id,name")
    .eq("user_id", userId);

  if (data && data.length > 0) {
    return data;
  }

  const { data: created } = await supabase
    .from("categories")
    .insert(
      DEFAULT_CATEGORIES.map((name) => ({
        user_id: userId,
        name,
        is_system: true,
      }))
    )
    .select("id,name");

  return created ?? [];
}

export async function createCategory(userId: string, name: string) {
  if (!hasSupabase) return null;
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .insert({ user_id: userId, name })
    .select("id,name")
    .single();
  return data ?? null;
}

export async function deleteCategory(userId: string, categoryId: string) {
  if (!hasSupabase) return;
  const supabase = getSupabaseServerClient();
  await supabase
    .from("categories")
    .delete()
    .eq("user_id", userId)
    .eq("id", categoryId);
}

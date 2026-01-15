import {
  createCategory,
  deleteCategory,
  getOrCreateCategories,
} from "../../../lib/categories/repository";
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
    const categories = await getOrCreateCategories(userId);
    return Response.json({ categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, name } = body ?? {};
  if (!userId || !name) {
    return new Response("Missing userId or name", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    const category = await createCategory(userId, name);
    return Response.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const categoryId = searchParams.get("categoryId");
  if (!userId || !categoryId) {
    return new Response("Missing userId or categoryId", { status: 400 });
  }

  try {
    const user = await requireUser(request);
    if (user.id !== userId) {
      return new Response("Unauthorized", { status: 403 });
    }
    await deleteCategory(userId, categoryId);
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

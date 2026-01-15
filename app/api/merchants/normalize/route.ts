import { applyNormalizationOverride } from "../../../../lib/rules/repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, originalName, normalizedName } = body ?? {};

  if (!userId || !originalName || !normalizedName) {
    return new Response("Missing userId or merchant names", { status: 400 });
  }

  try {
    await applyNormalizationOverride({
      userId,
      originalName,
      normalizedName,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(message, { status: 500 });
  }
}

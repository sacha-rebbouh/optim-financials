import { ingestFile } from "../../../lib/ingestion/ingestFile";
import { isOverBudget } from "../../../lib/usage/track";
import { getUserSettings } from "../../../lib/settings/repository";
import { requireUser } from "../../../lib/auth/verify";
import {
  deleteAttachment,
  uploadAttachment,
} from "../../../lib/storage/attachments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("files");
  const file = formData.get("file");

  const selectedFiles: File[] =
    files.length > 0
      ? (files.filter((item): item is File => item instanceof File))
      : file instanceof File
      ? [file]
      : [];

  if (selectedFiles.length === 0) {
    return new Response("Missing file", { status: 400 });
  }

  const userIdValue = formData.get("userId");
  const userId =
    typeof userIdValue === "string" && userIdValue.trim().length > 0
      ? userIdValue.trim()
      : undefined;

  try {
    const user = await requireUser(request);
    const authUserId = user.id;
    const resolvedUserId = userId ?? authUserId;
    if (resolvedUserId !== authUserId) {
      return new Response("Unauthorized userId", { status: 403 });
    }

    const settings = userId ? await getUserSettings(userId) : {};
    const provider = settings.llm_provider ?? "anthropic";
    if (resolvedUserId && (await isOverBudget(resolvedUserId, provider))) {
      return new Response("Budget LLM atteint", { status: 402 });
    }

    const results = [];
    for (const selected of selectedFiles) {
      const arrayBuffer = await selected.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let attachmentId: string | undefined;
      let storagePath: string | undefined;
      if (resolvedUserId) {
        const attachment = await uploadAttachment({
          userId: resolvedUserId,
          filename: selected.name,
          buffer,
          mimeType: selected.type,
        });
        attachmentId = attachment?.id;
        storagePath = attachment?.storage_path;
      }

      const result = await ingestFile({
        filename: selected.name,
        mimeType: selected.type,
        buffer,
        userId: resolvedUserId,
        attachmentId,
      });
      results.push(result);

      if (storagePath) {
        await deleteAttachment(storagePath);
      }
    }

    return Response.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return new Response(message, { status: 500 });
  }
}

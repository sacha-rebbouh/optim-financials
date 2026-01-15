import { getSupabaseServerClient } from "../supabase/server";

const hasSupabase =
  Boolean(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

const bucketName = process.env.SUPABASE_STORAGE_BUCKET ?? "uploads";

export async function uploadAttachment({
  userId,
  filename,
  buffer,
  mimeType,
}: {
  userId: string;
  filename: string;
  buffer: Buffer;
  mimeType: string;
}) {
  if (!hasSupabase) {
    return null;
  }

  const supabase = getSupabaseServerClient();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (error) {
    return null;
  }

  const { data: attachment } = await supabase
    .from("attachments")
    .insert({
      user_id: userId,
      storage_path: path,
      original_filename: filename,
      mime_type: mimeType,
    })
    .select("id,storage_path")
    .single();

  return attachment ?? null;
}

export async function markAttachmentParsed({
  attachmentId,
  sourceId,
}: {
  attachmentId: string;
  sourceId?: string | null;
}) {
  if (!hasSupabase) return;
  const supabase = getSupabaseServerClient();
  await supabase
    .from("attachments")
    .update({
      parsed_at: new Date().toISOString(),
      source_id: sourceId ?? null,
    })
    .eq("id", attachmentId);
}

export async function deleteAttachment(storagePath: string) {
  if (!hasSupabase) return;
  const supabase = getSupabaseServerClient();
  await supabase.storage.from(bucketName).remove([storagePath]);
}

export async function deleteAttachments(paths: string[]) {
  if (!hasSupabase || paths.length === 0) return;
  const supabase = getSupabaseServerClient();
  await supabase.storage.from(bucketName).remove(paths);
}

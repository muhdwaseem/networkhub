import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "./supabaseAdmin";

// SVG is deliberately excluded: an uploaded SVG can carry an inline <script>
// that executes on this origin when its public URL is opened directly.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const BUCKET = "images";

function extFromType(type) {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

// Uploads a File (from a multipart FormData request) into the public
// "images" Supabase Storage bucket under <subdir>/ and returns the full
// public CDN URL to store alongside the product/brand/settings record.
export async function saveUploadedImage(file, subdir) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return null;
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type || "unknown"}`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Image is larger than 8MB.");
  }

  const db = getSupabaseAdmin();
  const objectPath = `${subdir}/${randomUUID()}.${extFromType(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await db.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = db.storage.from(BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

const PUBLIC_URL_MARKER = `/storage/v1/object/public/${BUCKET}/`;

// Only ever deletes objects from the "images" bucket — seed placeholders
// under /images/ (a static public/ asset, unrelated despite the similar
// name) are shared and must never be removed by a product edit.
export async function deleteUploadedImage(publicUrl) {
  if (!publicUrl || !publicUrl.includes(PUBLIC_URL_MARKER)) return;
  const objectPath = publicUrl.split(PUBLIC_URL_MARKER)[1];
  if (!objectPath) return;
  try {
    const db = getSupabaseAdmin();
    await db.storage.from(BUCKET).remove([objectPath]);
  } catch {
    // Already gone — fine.
  }
}

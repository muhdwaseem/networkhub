import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getSupabaseAdmin } from "./supabaseAdmin";

// SVG is deliberately excluded: an uploaded SVG can carry an inline <script>
// that executes on this origin when its URL is opened directly.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const BUCKET = "images";
const SIGNED_URL_TTL = 60 * 60; // 1 hour — short enough that a URL copied out
const MAX_WIDTH = 1600; // matches the recipe used for the homepage category photos

// Caps dimensions and re-encodes at a lossy quality so a full-size phone/
// camera photo doesn't sit in Storage (and later get served in full via
// next.config.mjs's images.unoptimized) at 5x the size it needs to be. GIF
// is deliberately left untouched — sharp only processes the first frame of
// an animated GIF, so resizing one would silently destroy the animation.
// Falls back to the original buffer on any processing error rather than
// failing the upload outright, matching this file's fail-open posture
// elsewhere (see resolveImageUrl below).
async function optimizeImage(buffer, type) {
  if (type === "image/gif") return buffer;
  try {
    const image = sharp(buffer).resize({ width: MAX_WIDTH, withoutEnlargement: true });
    switch (type) {
      case "image/jpeg":
        return await image.jpeg({ quality: 80 }).toBuffer();
      case "image/png":
        return await image.png({ quality: 80 }).toBuffer();
      case "image/webp":
        return await image.webp({ quality: 80 }).toBuffer();
      default:
        return buffer;
    }
  } catch {
    return buffer;
  }
}

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

// Uploads a File (from a multipart FormData request) into the private
// "images" Supabase Storage bucket under <subdir>/ and returns the bucket
// object PATH (not a URL) to store alongside the product/brand/settings
// record. The bucket is private, so there is no permanent public URL for
// it — resolveImageUrl() below signs a fresh, short-lived URL for it on
// every read instead.
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
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const buffer = await optimizeImage(rawBuffer, file.type);
  const { error } = await db.storage.from(BUCKET).upload(objectPath, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  return objectPath;
}

// Given a value stored in the database, returns what <Image src> should
// actually use:
// - falsy -> null
// - already a full URL (e.g. a signed URL that slipped through, or an old
//   pre-migration public URL) -> returned as-is
// - a static /images/... asset (logo, seed placeholders) -> returned as-is,
//   these are checked into public/ and aren't in Storage at all
// - anything else is treated as a private-bucket object path and signed
export async function resolveImageUrl(value) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;

  const db = getSupabaseAdmin();
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(value, SIGNED_URL_TTL);
  if (error) return null; // object gone or path stale — render with no image rather than throw
  return data.signedUrl;
}

// Only ever deletes objects from the "images" bucket — seed placeholders
// under /images/ (a static public/ asset, unrelated despite the similar
// name) are shared and must never be removed by a product edit.
export async function deleteUploadedImage(storedValue) {
  if (!storedValue || storedValue.startsWith("/") || storedValue.startsWith("http")) return;
  try {
    const db = getSupabaseAdmin();
    await db.storage.from(BUCKET).remove([storedValue]);
  } catch {
    // Already gone — fine.
  }
}

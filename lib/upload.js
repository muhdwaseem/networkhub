import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// SVG is deliberately excluded: an uploaded SVG can carry an inline <script>
// that executes on this origin when its /uploads/ URL is opened directly.
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_SIZE = 8 * 1024 * 1024; // 8MB

// Defaults to public/uploads so local dev (and Next's static file server)
// keep working unchanged. On a host with a persistent volume (e.g. Railway),
// set UPLOADS_DIR to a path on that volume so uploads survive redeploys.
const UPLOADS_BASE = process.env.UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");

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

// Saves a File (from a multipart FormData request) under UPLOADS_BASE/<subdir>/
// and returns the public URL path to store alongside the product/settings record.
export async function saveUploadedImage(file, subdir) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return null;
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type || "unknown"}`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Image is larger than 8MB.");
  }

  const dir = path.join(UPLOADS_BASE, subdir);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${extFromType(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);
  return `/uploads/${subdir}/${filename}`;
}

// Only ever deletes files under /uploads/ — seed placeholders under /images/
// are shared static assets and must never be removed by a product edit.
export async function deleteUploadedImage(publicPath) {
  if (!publicPath || !publicPath.startsWith("/uploads/")) return;
  const filePath = path.join(UPLOADS_BASE, publicPath.slice("/uploads/".length));
  try {
    await fs.unlink(filePath);
  } catch {
    // Already gone — fine.
  }
}

// Resolves the /uploads/<...segments> URL a request hits back to a real file
// path under UPLOADS_BASE, used by app/uploads/[...path]/route.js to serve
// images from a volume where Next's static file server can't see them.
// Returns null if the resolved path would escape UPLOADS_BASE.
export function resolveUploadFilePath(segments) {
  const filePath = path.join(/* turbopackIgnore: true */ UPLOADS_BASE, ...segments);
  const base = path.join(UPLOADS_BASE, path.sep);
  if (filePath !== UPLOADS_BASE && !filePath.startsWith(base)) return null;
  return filePath;
}

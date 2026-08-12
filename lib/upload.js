import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const MAX_SIZE = 8 * 1024 * 1024; // 8MB

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
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

// Saves a File (from a multipart FormData request) under public/uploads/<subdir>/
// and returns the public URL path to store alongside the product/settings record.
export async function saveUploadedImage(file, subdir) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return null;
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported image type: ${file.type || "unknown"}`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Image is larger than 8MB.");
  }

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
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
  const filePath = path.join(process.cwd(), "public", publicPath);
  try {
    await fs.unlink(filePath);
  } catch {
    // Already gone — fine.
  }
}

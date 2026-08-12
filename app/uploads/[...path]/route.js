import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveUploadFilePath } from "@/lib/upload";

// Serves uploaded images from UPLOADS_DIR when it points somewhere outside
// public/ (e.g. a Railway volume), where Next's built-in static file server
// can't see them. In local dev, real files already sit under
// public/uploads/, so Next serves those directly and this route never runs.
const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(request, { params }) {
  const { path: segments } = await params;
  const filePath = resolveUploadFilePath(segments);
  if (!filePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()];
  if (!contentType) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const buffer = await fs.readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

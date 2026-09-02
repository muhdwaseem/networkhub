// One-off backfill: re-encodes every image already sitting in the Supabase
// "images" bucket with the same resize/compress recipe lib/upload.js now
// applies to new uploads (see optimizeImage() there) - max 1600px wide,
// quality 80 JPEG/PNG/WebP. Existing uploads predate that fix and are
// sitting in Storage at their original, unprocessed size.
//
// Each object is downloaded, compressed, and re-uploaded to the SAME
// object path (upsert) - no database changes needed, since products/
// brands rows only ever store the path, not the bytes (see
// lib/upload.js's resolveImageUrl comment).
//
// GIFs are left untouched - sharp only processes the first frame of an
// animated GIF, so compressing one would silently destroy the animation.
//
// Usage:
//   node scripts/backfill-compress-images.mjs
//     Dry run: downloads and compresses every object, reports the total
//     size saved, uploads nothing.
//
//   node scripts/backfill-compress-images.mjs --limit=10
//     Dry run limited to the first 10 objects per subfolder - use this
//     first to sanity-check output before a full --commit run.
//
//   node scripts/backfill-compress-images.mjs --commit
//     Full run: uploads the compressed replacement over every object
//     whose compressed size is meaningfully smaller than the original.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import sharp from "sharp";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;

// Skip re-uploading if compression didn't save at least this fraction -
// avoids pointless writes for images that were already small/efficient.
const MIN_SAVINGS_RATIO = 0.05;
const MAX_WIDTH = 1600;
const BUCKET = "images";
const SUBFOLDERS = ["products", "brands", "site"];

const env = Object.fromEntries(
  readFileSync(".env.local", "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx), l.slice(idx + 1)];
    })
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function typeFromExt(name) {
  const ext = name.split(".").pop().toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return null;
  }
}

// Same recipe as lib/upload.js's optimizeImage - duplicated here rather
// than imported, matching how the other scripts/ backfills already
// duplicate lib/upload.js's upload logic rather than importing app code
// that assumes the Next runtime.
async function optimizeImage(buffer, type) {
  const image = sharp(buffer).resize({ width: MAX_WIDTH, withoutEnlargement: true });
  switch (type) {
    case "image/jpeg":
      return image.jpeg({ quality: 80 }).toBuffer();
    case "image/png":
      return image.png({ quality: 80 }).toBuffer();
    case "image/webp":
      return image.webp({ quality: 80 }).toBuffer();
    default:
      return buffer;
  }
}

async function listAllObjects(prefix) {
  const objects = [];
  let offset = 0;
  const pageSize = 100;
  for (;;) {
    const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: pageSize, offset });
    if (error) throw new Error(`list(${prefix}) failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      // Storage returns folders as entries with id: null - none expected
      // at this depth (subfolders are flat), but skip defensively.
      if (entry.id) objects.push(`${prefix}/${entry.name}`);
    }
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return objects;
}

async function main() {
  console.log(COMMIT ? "COMMIT run - will overwrite compressed objects in place.\n" : "DRY RUN - no uploads will be made.\n");

  let totalOriginal = 0;
  let totalOptimized = 0;
  let processed = 0;
  let skippedGif = 0;
  let skippedNoSavings = 0;
  let failed = 0;

  for (const subdir of SUBFOLDERS) {
    const paths = await listAllObjects(subdir);
    console.log(`${subdir}/: ${paths.length} object(s)`);

    for (const path of paths.slice(0, LIMIT)) {
      const type = typeFromExt(path);
      if (!type) {
        console.log(`  skip (unknown type): ${path}`);
        continue;
      }
      if (type === "image/gif") {
        skippedGif++;
        continue;
      }

      try {
        const { data: blob, error: downloadError } = await db.storage.from(BUCKET).download(path);
        if (downloadError) throw new Error(downloadError.message);
        const original = Buffer.from(await blob.arrayBuffer());
        const optimized = await optimizeImage(original, type);

        const savingsRatio = 1 - optimized.length / original.length;
        totalOriginal += original.length;

        if (savingsRatio < MIN_SAVINGS_RATIO) {
          totalOptimized += original.length;
          skippedNoSavings++;
          continue;
        }

        totalOptimized += optimized.length;
        processed++;
        console.log(
          `  ${path}: ${(original.length / 1024).toFixed(0)}KB -> ${(optimized.length / 1024).toFixed(0)}KB (${(savingsRatio * 100).toFixed(0)}% smaller)`
        );

        if (COMMIT) {
          const { error: uploadError } = await db.storage.from(BUCKET).update(path, optimized, {
            contentType: type,
            upsert: true,
          });
          if (uploadError) throw new Error(uploadError.message);
        }
      } catch (err) {
        failed++;
        console.error(`  FAILED ${path}: ${err.message}`);
      }
    }
  }

  console.log("\n---");
  console.log(`Processed (compressed): ${processed}`);
  console.log(`Skipped (GIF, untouched): ${skippedGif}`);
  console.log(`Skipped (already efficient): ${skippedNoSavings}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total before: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Total after:  ${(totalOptimized / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Saved:        ${((totalOriginal - totalOptimized) / 1024 / 1024).toFixed(2)}MB`);
  if (!COMMIT) console.log("\nDry run only - re-run with --commit to actually overwrite objects in Storage.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

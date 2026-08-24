// Uploads the images resolved by scripts/rainbowstone_resolve_images.py (a
// Python step, not this one, because rainbowstone.ae 403s plain Node
// fetch()/curl-style requests - Scrapling's stealthy Fetcher, which
// impersonates real browser TLS/header fingerprints, gets a clean 200 on
// the exact same URLs). That script writes real product photos to local
// files and a manifest at scripts/_rainbowstone_manifest.json; this script
// just does the ordinary upload-to-Storage + update-product-row step,
// identical in shape to every other backfill script here.
//
// Usage:
//   node scripts/backfill-rainbowstone-images-from-manifest.mjs --limit=10
//     Dry run: reads local files but does not upload or write to Supabase.
//
//   node scripts/backfill-rainbowstone-images-from-manifest.mjs --commit
//     Full run: uploads images to Supabase Storage and updates product rows.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const MANIFEST_PATH = "scripts/_rainbowstone_manifest.json";

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
const BUCKET = "images";

function contentTypeFor(ext) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
  console.log(`Loaded ${manifest.length} resolved images from ${MANIFEST_PATH}.`);

  const toProcess = manifest.slice(0, LIMIT);
  console.log(`Processing ${toProcess.length} products${COMMIT ? " (--commit: will upload + write)" : " (dry run: no writes)"} ...`);

  let ok = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    try {
      const buffer = readFileSync(p.localPath);

      if (COMMIT) {
        const objectPath = `products/${randomUUID()}.${p.ext}`;
        const { error: uploadError } = await db.storage.from(BUCKET).upload(objectPath, buffer, {
          contentType: contentTypeFor(p.ext),
          upsert: false,
        });
        if (uploadError) {
          failed++;
          failures.push({ id: p.id, name: p.name, reason: `storage upload failed: ${uploadError.message}` });
          continue;
        }
        const { error: updateError } = await db
          .from("products")
          .update({ images: [objectPath], updated_at: new Date().toISOString() })
          .eq("id", p.id);
        if (updateError) {
          failed++;
          failures.push({ id: p.id, name: p.name, reason: `product update failed: ${updateError.message}` });
          continue;
        }
      }

      ok++;
      console.log(`  [${i + 1}/${toProcess.length}] ok=${ok} failed=${failed}  (${p.brand}: ${p.name.slice(0, 50)})`);
    } catch (err) {
      failed++;
      failures.push({ id: p.id, name: p.name, reason: err.message });
    }
  }

  console.log(`\nDone. ok=${ok} failed=${failed}${COMMIT ? "" : " (dry run - nothing written)"}`);
  if (failures.length) {
    console.log(`\nFailures:`);
    failures.forEach((f) => console.log(`  [${f.id}] ${f.name}: ${f.reason}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// One-off fetcher for the homepage's 5 remaining category hero photos
// (Copper & Fiber Cabling, Patch Cords, Routers & Gateways, NAS Hard
// Drives, Floor Server Racks) that still fall back to the generic
// "Accessories" SVG icon - see app/(site)/page.js's CATEGORY_IMAGES.
//
// Rather than generating new stock photography (see the now-unused
// generate-category-images.mjs), this reuses a REAL product photo already
// sitting in this catalog's own Supabase Storage for each target category -
// same real-brand photography already scraped for every other product on
// the site, so there's no new licensing question and the style matches the
// 3 categories already done by hand.
//
// Two modes:
//   node scripts/backfill-category-hero-images.mjs --list
//     For each target category, downloads the first few candidate products'
//     images (unprocessed) into a scratch directory for manual review -
//     nothing is written into the repo.
//
//   node scripts/backfill-category-hero-images.mjs --pick copper-fiber-cabling=p-<id> patch-cords=p-<id> ...
//     For each slug=productId pair, downloads that product's first image,
//     resizes/compresses it with the same recipe as lib/upload.js, and
//     writes it to public/images/placeholders/<slug>.jpg.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const MODE = args.includes("--pick") ? "pick" : "list";
const MAX_WIDTH = 1600;
const BUCKET = "images";
const CANDIDATES_PER_CATEGORY = 6;
const SCRATCH_DIR = "D:/tools/claude-config/jobs/26d1f315/tmp/hero-candidates";

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

const TARGETS = [
  { slug: "copper-fiber-cabling", categories: ["Copper Bulk Cable", "Fiber Patch Cords", "Fiber Accessories", "Fiber Optic Bulk", "Fiber Panels & ODF"] },
  { slug: "patch-cords", categories: ["Patch Cords"] },
  { slug: "routers-gateways", categories: ["Routers & Gateways"] },
  { slug: "nas-hard-drives", categories: ["NAS Hard Drives"] },
  { slug: "floor-server-racks", categories: ["Floor Server Racks"] },
];

function extFromPath(p) {
  const ext = p.split(".").pop().toLowerCase();
  return ext === "jpeg" ? "jpg" : ext;
}

// Output is always re-encoded as real JPEG regardless of the source
// format - these are written to public/images/placeholders/<slug>.jpg, and
// a PNG/WebP source re-encoded as .png/.webp bytes but written under a
// .jpg filename would be a format/extension mismatch.
async function optimizeImage(buffer) {
  return sharp(buffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .flatten({ background: "#ffffff" }) // drop any alpha channel before JPEG encode
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function downloadObject(objectPath) {
  const { data, error } = await db.storage.from(BUCKET).download(objectPath);
  if (error) throw new Error(error.message);
  return Buffer.from(await data.arrayBuffer());
}

async function listMode() {
  mkdirSync(SCRATCH_DIR, { recursive: true });
  for (const target of TARGETS) {
    console.log(`\n=== ${target.slug} (categories: ${target.categories.join(", ")}) ===`);
    const { data: products, error } = await db
      .from("products")
      .select("id, name, category, images")
      .in("category", target.categories)
      .not("images", "is", null)
      .limit(200);
    if (error) throw new Error(error.message);

    const withImages = products.filter((p) => Array.isArray(p.images) && p.images.length > 0);
    const picks = withImages.slice(0, CANDIDATES_PER_CATEGORY);
    if (picks.length === 0) {
      console.log("  (no candidates with images found)");
      continue;
    }

    for (const p of picks) {
      const objectPath = p.images[0];
      try {
        const buffer = await downloadObject(objectPath);
        const ext = extFromPath(objectPath);
        const dest = path.join(SCRATCH_DIR, `${target.slug}__${p.id}.${ext}`);
        writeFileSync(dest, buffer);
        console.log(`  ${p.id}  ${p.name}  -> ${dest} (${(buffer.length / 1024).toFixed(0)}KB)`);
      } catch (err) {
        console.log(`  ${p.id}  ${p.name}  FAILED: ${err.message}`);
      }
    }
  }
}

async function pickMode() {
  const pairs = args.filter((a) => a.includes("=")).map((a) => {
    const idx = a.indexOf("=");
    return [a.slice(0, idx), a.slice(idx + 1)];
  });
  const outDir = path.resolve("public/images/placeholders");
  mkdirSync(outDir, { recursive: true });

  for (const [slug, productId] of pairs) {
    const { data: p, error } = await db.from("products").select("id, name, images").eq("id", productId).single();
    if (error) throw new Error(`${productId}: ${error.message}`);
    if (!p.images || p.images.length === 0) throw new Error(`${productId}: no images`);

    const objectPath = p.images[0];
    const raw = await downloadObject(objectPath);
    const optimized = await optimizeImage(raw);
    const dest = path.join(outDir, `${slug}.jpg`);
    writeFileSync(dest, optimized);
    console.log(`${slug}: ${p.name} (${productId}) -> ${dest} (${(raw.length / 1024).toFixed(0)}KB -> ${(optimized.length / 1024).toFixed(0)}KB)`);
  }
}

(MODE === "pick" ? pickMode() : listMode()).catch((err) => {
  console.error(err);
  process.exit(1);
});

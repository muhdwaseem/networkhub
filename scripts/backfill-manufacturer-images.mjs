// Backfills product photos sourced directly from each manufacturer's own
// site, for brands where the vendor's official product page is reachable
// by a predictable URL built from the DB's `sku` field. This is a separate,
// narrower source than scripts/backfill-rainbowstone-images.mjs (which
// scrapes the RainbowStone catalog's own reference links) - use this one
// for brands whose manufacturer site has per-model pages with a stable
// URL pattern, confirmed against real samples before adding a brand here:
//   - QNAP:     https://www.qnap.com/en-us/product/<sku lowercased>
//   - Synology: https://www.synology.com/en-us/products/<sku>
// Every manufacturer page in practice carries a standard <meta
// property="og:image"> tag (used for social-share previews), which is a
// far more universal signal than hunting for brand-specific markup, so
// that's what this script extracts rather than a page-specific selector.
//
// Usage:
//   node scripts/backfill-manufacturer-images.mjs --brands=QNAP,Synology --limit=10
//     Dry run: fetches pages/images but does not upload or write to Supabase.
//
//   node scripts/backfill-manufacturer-images.mjs --brands=QNAP,Synology --limit=10 --commit
//     Same, but uploads images to Supabase Storage and updates product rows.
//
//   node scripts/backfill-manufacturer-images.mjs --brands=QNAP,Synology --commit
//     Full run (no --limit) for the given brands.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const brandsArg = args.find((a) => a.startsWith("--brands="));
const TARGET_BRANDS = brandsArg ? brandsArg.slice("--brands=".length).split(",") : [];
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const DELAY_MS = 1000; // politeness delay between manufacturer-site requests

if (!TARGET_BRANDS.length) {
  console.error("Usage: node scripts/backfill-manufacturer-images.mjs --brands=QNAP,Synology [--limit=N] [--commit]");
  process.exit(1);
}

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
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const FETCH_TIMEOUT_MS = 20000;

// Each entry returns a list of candidate page URLs to try in order for a
// given product (sku, name) - the first one that responds 200 with a
// usable og:image wins. Multiple candidates handle case-sensitivity and
// SKUs that carry extra config suffixes the product page URL omits.
// QNAP SKUs often carry a trailing memory/region config the product page
// URL omits (e.g. "TS-H973AX-8G" -> page is .../ts-h973ax, not .../ts-h973ax-8g).
// Progressively drop trailing "-segment" pieces (up to 3) as fallback slugs.
function qnapSlugCandidates(sku) {
  const base = sku.toLowerCase();
  const parts = base.split("-");
  const slugs = [base];
  for (let cut = 1; cut < parts.length && cut <= 3; cut++) {
    slugs.push(parts.slice(0, parts.length - cut).join("-"));
  }
  return [...new Set(slugs)];
}

const BRAND_CONFIG = {
  QNAP: {
    candidates: (sku) => qnapSlugCandidates(sku).map((slug) => `https://www.qnap.com/en-us/product/${slug}`),
  },
  Synology: {
    candidates: (sku) => [
      `https://www.synology.com/en-us/products/${sku}`,
      `https://www.synology.com/en-us/products/${sku.toUpperCase()}`,
    ],
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithTimeout(url, opts = {}) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

function extractOgImage(html) {
  const m =
    html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i) ||
    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i);
  return m ? m[1] : null;
}

function extFromContentType(ct) {
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

async function findProductImage(candidateUrls) {
  for (const pageUrl of candidateUrls) {
    try {
      const res = await fetchWithTimeout(pageUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!res.ok) continue;
      const html = await res.text();
      const imgUrl = extractOgImage(html);
      if (imgUrl) return { pageUrl, imgUrl };
    } catch {
      // try next candidate
    }
  }
  return { error: "no candidate URL resolved to a page with an og:image" };
}

async function main() {
  console.log(`Target brands: ${TARGET_BRANDS.join(", ")}`);
  console.log("\nFetching current products from Supabase ...");
  const products = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await db
      .from("products")
      .select("id, brand, sku, name, images")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    products.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`  ${products.length} products in DB.`);

  const candidates = products.filter(
    (p) => (!p.images || p.images.length === 0) && TARGET_BRANDS.includes((p.brand || "").trim()) && (p.sku || "").trim()
  );
  console.log(`  ${candidates.length} missing-image products in target brands with a usable SKU.`);

  const toProcess = candidates.slice(0, LIMIT);
  console.log(`\nProcessing ${toProcess.length} products${COMMIT ? " (--commit: will upload + write)" : " (dry run: fetch only, no writes)"} ...`);

  let ok = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    const config = BRAND_CONFIG[p.brand.trim()];
    try {
      const { pageUrl, imgUrl, error } = await findProductImage(config.candidates(p.sku.trim()));
      if (error) {
        failed++;
        failures.push({ id: p.id, name: p.name, reason: error });
        continue;
      }

      const imgRes = await fetchWithTimeout(imgUrl, { headers: { "User-Agent": UA } });
      if (!imgRes.ok) {
        failed++;
        failures.push({ id: p.id, name: p.name, reason: `image fetch failed: ${imgRes.status}` });
        continue;
      }
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const ext = extFromContentType(imgRes.headers.get("content-type"));

      if (COMMIT) {
        const objectPath = `products/${randomUUID()}.${ext}`;
        const { error: uploadError } = await db.storage.from(BUCKET).upload(objectPath, buffer, {
          contentType: imgRes.headers.get("content-type") || "image/jpeg",
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
      console.log(`  [${i + 1}/${toProcess.length}] ok=${ok} failed=${failed}  (${p.sku} -> ${pageUrl})`);
    } catch (err) {
      failed++;
      failures.push({ id: p.id, name: p.name, reason: err.message });
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone. ok=${ok} failed=${failed}${COMMIT ? "" : " (dry run - nothing written)"}`);
  if (failures.length) {
    console.log(`\nFirst ${Math.min(15, failures.length)} failures:`);
    failures.slice(0, 15).forEach((f) => console.log(`  [${f.id}] ${f.name}: ${f.reason}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

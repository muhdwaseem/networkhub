// Backfills product photos for Ruckus products imported by
// scripts/import-multibrand-catalog.mjs, sourced from ruckusnetworks.com
// (RUCKUS's official site, now under CommScope).
//
// Unlike scripts/backfill-multibrand-images.mjs (Teltonika - scrapes the
// source workbook's own reference link) this brand needed a hand-verified
// URL template per product category, since the workbook's ithub.ae
// reference links mostly 404 (only ~29% hit rate - see that script's header
// comment). Verified against ruckusnetworks.com's real URL structure via
// web search before building this:
//   - Access Points:    https://www.ruckusnetworks.com/products/wireless-access-points/<model>/
//     <model> is the SKU's middle hyphen-segment lowercased, e.g.
//     "901-R770-WW00" -> "r770". Some outdoor "T-series" variants (T350c,
//     T350d, T350se, T750SE) don't have their own page - they roll up under
//     the base family page (T350, T750), so that's tried as a fallback.
//   - Network Switches: https://www.ruckusnetworks.com/products/ethernet-switches/item<model>/
//     <model> is the SKU's first two hyphen-segments joined, lowercased,
//     e.g. "ICX7150-C12P-2X1G" -> "icx7150-c12p".
// Full dry-run scan against these two categories: 28/30 (93%). Wireless
// Controllers, Wireless Management Software (licenses), and Accessories
// categories are NOT covered - no verified pattern for those, and licenses
// have no physical product to photograph anyway.
//
// Usage:
//   node scripts/backfill-ruckus-images.mjs --limit=10
//     Dry run: fetches pages/images but does not upload or write to Supabase.
//
//   node scripts/backfill-ruckus-images.mjs --commit
//     Full run: uploads images to Supabase Storage and updates product rows.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const DELAY_MS = 1000;

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
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 20000;

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

function apCandidates(sku) {
  const parts = sku.split("-");
  const slugs = new Set();
  if (parts.length >= 2) {
    const model = parts[1].toLowerCase();
    slugs.add(model);
    slugs.add(model.replace(/[a-z]+$/i, "")); // T350c/T350d/T350se/T750SE -> base family page
  }
  slugs.add(sku.toLowerCase());
  return [...slugs].map((s) => `https://www.ruckusnetworks.com/products/wireless-access-points/${s}/`);
}

function switchCandidates(sku) {
  const parts = sku.split("-");
  const slugs = new Set();
  if (parts.length >= 2) slugs.add(`${parts[0]}-${parts[1]}`.toLowerCase());
  slugs.add(sku.toLowerCase());
  return [...slugs].map((s) => `https://www.ruckusnetworks.com/products/ethernet-switches/item${s}/`);
}

const CATEGORY_CANDIDATES = {
  "Access Points": apCandidates,
  "Network Switches": switchCandidates,
};

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
  console.log("Fetching current products from Supabase ...");
  const products = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await db
      .from("products")
      .select("id, brand, sku, name, category, images")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    products.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`  ${products.length} products in DB.`);

  const candidates = products.filter(
    (p) =>
      (!p.images || p.images.length === 0) &&
      (p.brand || "").trim() === "Ruckus" &&
      CATEGORY_CANDIDATES[(p.category || "").trim()] &&
      (p.sku || "").trim()
  );
  console.log(`  ${candidates.length} missing-image Ruckus products in a covered category (Access Points / Network Switches).`);

  const toProcess = candidates.slice(0, LIMIT);
  console.log(`\nProcessing ${toProcess.length} products${COMMIT ? " (--commit: will upload + write)" : " (dry run: fetch only, no writes)"} ...`);

  let ok = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    const genCandidates = CATEGORY_CANDIDATES[p.category.trim()];
    try {
      const { pageUrl, imgUrl, error } = await findProductImage(genCandidates(p.sku.trim()));
      if (error) {
        failed++;
        failures.push({ id: p.id, name: p.name, reason: error });
        await sleep(DELAY_MS);
        continue;
      }

      const imgRes = await fetchWithTimeout(imgUrl, { headers: { "User-Agent": UA } });
      if (!imgRes.ok) {
        failed++;
        failures.push({ id: p.id, name: p.name, reason: `image fetch failed: ${imgRes.status}` });
        await sleep(DELAY_MS);
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
          await sleep(DELAY_MS);
          continue;
        }
        const { error: updateError } = await db
          .from("products")
          .update({ images: [objectPath], updated_at: new Date().toISOString() })
          .eq("id", p.id);
        if (updateError) {
          failed++;
          failures.push({ id: p.id, name: p.name, reason: `product update failed: ${updateError.message}` });
          await sleep(DELAY_MS);
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
    console.log(`\nFailures:`);
    failures.forEach((f) => console.log(`  [${f.id}] ${f.name}: ${f.reason}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Backfills product photos for the Ruckus/Teltonika/Dahua catalog imported by
// scripts/import-multibrand-catalog.mjs, using the "Datasheet / Reference
// Link" column from the same source workbook (col index 7 on the "All
// Products Master" sheet) as a per-SKU page to scrape, rather than guessing
// a URL template the way scripts/backfill-manufacturer-images.mjs does for
// QNAP/Synology. Verified per-brand before building this:
//   - Teltonika (teltonika-networks.com): reference link resolves directly
//     to the real product page in the vast majority of cases; og:image is
//     product-specific. ~84% hit rate on a full dry-run scan (42/50) - the
//     rest are either SKUs not yet live on the site (4 switch models) or
//     software/license SKUs with no physical product photo (4 RMS plans).
//   - Ruckus (ithub.ae): reference links mostly 404 (slugs in the workbook
//     don't match the live site) - only ~29% hit rate. NOT included in
//     BRAND_CONFIG below; needs a different sourcing approach.
//   - Dahua (dahuasecurity.com): reference links resolve (200) but to a
//     generic category listing page, not the specific product - og:image is
//     Dahua's generic brand logo, not a real photo. NOT included below;
//     needs a different sourcing approach (e.g. Dahua's product search API).
//
// Usage:
//   node scripts/backfill-multibrand-images.mjs <path-to-xlsx> --limit=10
//     Dry run: fetches pages/images but does not upload or write to Supabase.
//
//   node scripts/backfill-multibrand-images.mjs <path-to-xlsx> --commit
//     Full run: uploads images to Supabase Storage and updates product rows.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import XLSX from "xlsx";

const args = process.argv.slice(2);
const xlsxPath = args.find((a) => !a.startsWith("--"));
const COMMIT = args.includes("--commit");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const DELAY_MS = 1000;

if (!xlsxPath) {
  console.error("Usage: node scripts/backfill-multibrand-images.mjs <path-to-xlsx> [--limit=N] [--commit]");
  process.exit(1);
}

const TARGET_BRANDS = ["Teltonika"]; // see header comment - Ruckus/Dahua excluded until a working source is found

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
const SHEET_NAME = "All Products Master";
const SKIP_ROWS = 2;

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

function loadReferenceLinks(path) {
  const wb = XLSX.readFile(path);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet "${SHEET_NAME}" not found.`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }).slice(SKIP_ROWS);
  const bySkuKey = new Map();
  for (const r of rows) {
    const name = (r[4] || "").toString().trim();
    if (!name) continue;
    const brand = (r[2] || "").toString().trim();
    const sku = (r[3] || "").toString().trim();
    const link = (r[7] || "").toString().trim();
    if (!sku || !link || link === "-") continue;
    bySkuKey.set(`${brand.toLowerCase()}|||${sku.toLowerCase()}`, link);
  }
  return bySkuKey;
}

async function main() {
  console.log(`Loading reference links from ${xlsxPath} ...`);
  const refLinks = loadReferenceLinks(xlsxPath);
  console.log(`  ${refLinks.size} sku->link entries loaded.`);

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
    (p) =>
      (!p.images || p.images.length === 0) &&
      TARGET_BRANDS.includes((p.brand || "").trim()) &&
      refLinks.has(`${(p.brand || "").trim().toLowerCase()}|||${(p.sku || "").trim().toLowerCase()}`)
  );
  console.log(`  ${candidates.length} missing-image products in target brands with a known reference link.`);

  const toProcess = candidates.slice(0, LIMIT);
  console.log(`\nProcessing ${toProcess.length} products${COMMIT ? " (--commit: will upload + write)" : " (dry run: fetch only, no writes)"} ...`);

  let ok = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    const pageUrl = refLinks.get(`${p.brand.trim().toLowerCase()}|||${p.sku.trim().toLowerCase()}`);
    try {
      const res = await fetchWithTimeout(pageUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (!res.ok) {
        failed++;
        failures.push({ id: p.id, name: p.name, reason: `page fetch ${res.status}` });
        await sleep(DELAY_MS);
        continue;
      }
      const html = await res.text();
      const imgUrl = extractOgImage(html);
      if (!imgUrl) {
        failed++;
        failures.push({ id: p.id, name: p.name, reason: "no og:image on page" });
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

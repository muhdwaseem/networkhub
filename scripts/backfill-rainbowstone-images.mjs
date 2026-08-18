// Backfills product photos scraped from each product's rainbowstone.ae page
// (the workbook's "Datasheet / Reference Link" column, which was deliberately
// excluded from the original import - see import-rainbowstone-catalog.mjs -
// so it's re-read directly from the xlsx here rather than the database).
//
// Matching a DB product back to its source row uses the exact same
// (brand, sku, cleanProductName(rawName)) triple that
// clean-rainbowstone-product-names.mjs used to build the current DB rows,
// so this only works correctly against a DB in that state.
//
// Each rainbowstone.ae product page embeds its main photo in a single
// unambiguous element: <img id="productImageView" src="...">. Verified
// against samples from every sheet. Some reference links 404 or redirect to
// the generic /Products listing (their catalog has moved on since this
// workbook was exported) - those are skipped and logged, not treated as
// fatal.
//
// Usage:
//   node scripts/backfill-rainbowstone-images.mjs <path-to-xlsx> --match-only
//     Builds the match map and reports how many DB products resolve to a
//     reference link, without making any network requests to rainbowstone.ae
//     or writing anything. Safe to run repeatedly.
//
//   node scripts/backfill-rainbowstone-images.mjs <path-to-xlsx> --limit=20
//     Dry run of the scrape itself against the first N matched products:
//     fetches pages/images but does not upload or write to Supabase.
//
//   node scripts/backfill-rainbowstone-images.mjs <path-to-xlsx> --limit=20 --commit
//     Same, but uploads images to Supabase Storage and updates product rows.
//
//   node scripts/backfill-rainbowstone-images.mjs <path-to-xlsx> --commit
//     Full run (no --limit) - all matched products missing an image.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import XLSX from "xlsx";

const args = process.argv.slice(2);
const xlsxPath = args.find((a) => !a.startsWith("--"));
const COMMIT = args.includes("--commit");
const MATCH_ONLY = args.includes("--match-only");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const DELAY_MS = 1500; // politeness delay between rainbowstone.ae requests

if (!xlsxPath) {
  console.error("Usage: node scripts/backfill-rainbowstone-images.mjs <path-to-xlsx> [--match-only | --limit=N] [--commit]");
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

const SHEET_CONFIG = {
  "Active Networking": { skip: 2 },
  "Passive & Cabling": { skip: 2 },
  "Telecom & Security": { skip: 2 },
  "UPS & Storage": { skip: 2 },
  "PC&LAPTOP": { skip: 0 },
  "Specialty & Peripherals": { skip: 2 },
  "Racks & cabinet": { skip: 1 },
};

const TRAILING_PUNCT = /[-,:;|\s]+$/;
const NAME_MAX = 110;

function cleanCell(v) {
  const s = (v ?? "").toString().trim();
  return s === "-" ? "" : s;
}

function cleanProductName(raw) {
  let name = raw.trim();
  const semi = name.indexOf(";");
  const pipe = name.indexOf("|");
  const cutPoints = [semi, pipe].filter((i) => i !== -1);
  if (cutPoints.length) name = name.slice(0, Math.min(...cutPoints));
  name = name.trim().replace(TRAILING_PUNCT, "");

  if (name.length > NAME_MAX) {
    const truncated = name.slice(0, NAME_MAX);
    const lastSpace = truncated.lastIndexOf(" ");
    name = (lastSpace > 60 ? truncated.slice(0, lastSpace) : truncated).trim();
    name = name.replace(TRAILING_PUNCT, "");
  }
  return name;
}

function matchKey(brand, sku, name) {
  return `${brand}|||${sku}|||${name}`;
}

function buildLinkMap(path) {
  const wb = XLSX.readFile(path);
  const map = new Map();
  let rowsWithLink = 0;

  for (const sheetName of wb.SheetNames) {
    const cfg = SHEET_CONFIG[sheetName];
    if (!cfg) continue;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }).slice(cfg.skip);

    for (const r of rows) {
      const rawName = cleanCell(r[4]);
      if (!rawName) continue;
      const brand = cleanCell(r[2]);
      const sku = cleanCell(r[3]);
      const link = cleanCell(r[7]);
      if (!link) continue;
      rowsWithLink++;
      const key = matchKey(brand, sku, cleanProductName(rawName));
      if (!map.has(key)) map.set(key, link);
    }
  }

  return { map, rowsWithLink };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The productImageView element is the one unambiguous main-photo reference
// on the page (verified against samples from every sheet) - other <img>
// tags on the same page belong to a "related products" strip.
function extractMainImagePath(html) {
  const tagMatch = html.match(/<img[^>]*id=["']productImageView["'][^>]*>/i);
  if (!tagMatch) return null;
  const srcMatch = tagMatch[0].match(/src=["']([^"']+)["']/i);
  return srcMatch ? srcMatch[1] : null;
}

function extFromContentType(ct) {
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

const FETCH_TIMEOUT_MS = 20000;

function fetchWithTimeout(url, opts = {}) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

async function fetchProductImagePath(link) {
  const res = await fetchWithTimeout(link, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) return { error: `page fetch failed: ${res.status}` };
  if (res.url === "https://rainbowstone.ae/Products" || res.url.endsWith("/Products")) {
    return { error: "redirected to generic listing - product not found on live site" };
  }
  const html = await res.text();
  const imgPath = extractMainImagePath(html);
  if (!imgPath) return { error: "no productImageView element on page" };
  return { imgPath };
}

async function main() {
  console.log(`Reading ${xlsxPath} ...`);
  const { map: linkMap, rowsWithLink } = buildLinkMap(xlsxPath);
  console.log(`Workbook: ${rowsWithLink} rows have a reference link, ${linkMap.size} unique (brand, sku, name) keys.`);

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

  const withoutImages = products.filter((p) => !p.images || p.images.length === 0);
  console.log(`  ${withoutImages.length} have no image yet.`);

  let matched = 0;
  const matchedProducts = [];
  for (const p of withoutImages) {
    const key = matchKey(p.brand || "", p.sku || "", p.name || "");
    const link = linkMap.get(key);
    if (link) {
      matched++;
      matchedProducts.push({ ...p, link });
    }
  }
  console.log(`  ${matched} of those matched to a reference link (${((matched / withoutImages.length) * 100).toFixed(1)}%).`);

  if (MATCH_ONLY) {
    console.log("\n--match-only: stopping here, no network requests made to rainbowstone.ae.");
    console.log("\nSample matches:");
    matchedProducts.slice(0, 5).forEach((p) => console.log(`  [${p.brand}] ${p.name} -> ${p.link}`));
    return;
  }

  const toProcess = matchedProducts.slice(0, LIMIT);
  console.log(`\nProcessing ${toProcess.length} products${COMMIT ? " (--commit: will upload + write)" : " (dry run: fetch only, no writes)"} ...`);

  let ok = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    try {
      const { imgPath, error } = await fetchProductImagePath(p.link);
      if (error) {
        failed++;
        failures.push({ id: p.id, name: p.name, reason: error });
        continue;
      }

      const imgUrl = `https://rainbowstone.ae${imgPath}`;
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
      if (ok % 25 === 0 || i === toProcess.length - 1) {
        console.log(`  [${i + 1}/${toProcess.length}] ok=${ok} failed=${failed}`);
      }
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

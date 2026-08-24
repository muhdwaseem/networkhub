// Backfills product photos for TP-Link products, sourced from tp-link.com.
//
// TP-Link's product-page URLs are category-scoped (e.g.
// /home-networking/wifi-router/<model>/, /home-networking/range-extender/<model>/,
// /home-networking/deco/<model>/, /business-networking/soho-switch-unmanaged/<model>/)
// with no single guessable template and no SKU-based routing that ignores
// category (unlike Dahua - see backfill-multibrand-images.mjs's header).
// Instead this resolves each SKU's real URL from TP-Link's own sitemap
// (https://www.tp-link.com/nl/sitemap.xml - the "nl" region one happens to
// be a single flat <urlset>, not a sitemap index, and covers the same
// product catalog as other regions; page content/images don't depend on
// locale). For a SKU matching multiple sitemap entries (a real product page
// plus a /support/... page), the non-support page is preferred since only
// the real product page carries a genuine og:image - TP-Link's support
// pages have the same generic-logo-only problem seen on Dahua.
//
// Verified: 47/72 missing-image TP-Link products matched a real product
// page in the sitemap (65%). The rest aren't in this sitemap at all -
// likely region-specific models (e.g. newer RE-series Wi-Fi 6E extenders,
// some LS-series switches, PoE++ TL-SG12xx models).
//
// Usage:
//   node scripts/backfill-tplink-images.mjs --limit=10
//     Dry run: fetches pages/images but does not upload or write to Supabase.
//
//   node scripts/backfill-tplink-images.mjs --commit
//     Full run: uploads images to Supabase Storage and updates product rows.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const DELAY_MS = 1000;
const SITEMAP_URL = "https://www.tp-link.com/nl/sitemap.xml";

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

function slugify(sku) {
  return sku.trim().toLowerCase().replace(/\s+/g, "-");
}

async function loadSitemapUrls() {
  const res = await fetchWithTimeout(SITEMAP_URL, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

function resolveProductUrl(sitemapUrls, sku) {
  const slug = slugify(sku);
  const re = new RegExp(`/nl/[^"']*/${slug}/?$`, "i");
  const hits = sitemapUrls.filter((u) => re.test(u));
  return hits.find((u) => !u.includes("/support/")) || null;
}

async function main() {
  console.log(`Loading TP-Link sitemap from ${SITEMAP_URL} ...`);
  const sitemapUrls = await loadSitemapUrls();
  console.log(`  ${sitemapUrls.length} URLs loaded.`);

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

  const candidates = products
    .filter((p) => (!p.images || p.images.length === 0) && (p.brand || "").trim() === "TP-Link" && (p.sku || "").trim())
    .map((p) => ({ ...p, pageUrl: resolveProductUrl(sitemapUrls, p.sku) }))
    .filter((p) => p.pageUrl);
  console.log(`  ${candidates.length} missing-image TP-Link products with a resolved sitemap page.`);

  const toProcess = candidates.slice(0, LIMIT);
  console.log(`\nProcessing ${toProcess.length} products${COMMIT ? " (--commit: will upload + write)" : " (dry run: fetch only, no writes)"} ...`);

  let ok = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    try {
      const res = await fetchWithTimeout(p.pageUrl, { headers: { "User-Agent": UA }, redirect: "follow" });
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
      console.log(`  [${i + 1}/${toProcess.length}] ok=${ok} failed=${failed}  (${p.sku} -> ${p.pageUrl})`);
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

// One-off import: "Combined_MultiBrand_Product_Master_Catalog.xlsx" -> Supabase.
// Adds Ruckus, Teltonika, and Dahua products. Reads only the "All Products
// Master" sheet - verified (see conversation) to be a duplicate-free union
// of the workbook's other three sheets, so it's the single source of truth.
//
// Column mapping note: this workbook's broad "Category" column (Active
// Networking, CCTV & Security, ...) is coarser than this site's existing
// category taxonomy (49 categories like "Access Points", "IP Cameras
// (Bullet)"), which actually matches the workbook's "Sub-Category" column
// instead - confirmed 6 exact-name matches against the categories table.
// So product.category is filled from Sub-Category (col 1), not Category
// (col 0), to stay consistent with every other imported product.
//
// Drops "Key Features" (marketing copy) and the "Datasheet / Reference
// Link" column from the DB write, matching import-rainbowstone-catalog.mjs's
// precedent - the source xlsx stays on disk as the place to look those up
// later (e.g. as a reference-link source for an image backfill script, the
// same role RainbowStone_Product_Master_Catalog_Cleaned.xlsx played).
//
// All three brands are active-type equipment (APs, routers, switches,
// cameras, NVRs, licenses) - no cabling/passive gear in this file - so
// brand type is fixed to "active" rather than inferred per-sheet.
//
// Usage:
//   node scripts/import-multibrand-catalog.mjs <path-to-xlsx>           (dry run, prints summary only)
//   node scripts/import-multibrand-catalog.mjs <path-to-xlsx> --commit  (writes to Supabase)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import XLSX from "xlsx";

const args = process.argv.slice(2);
const xlsxPath = args.find((a) => !a.startsWith("--"));
const COMMIT = args.includes("--commit");
if (!xlsxPath) {
  console.error("Usage: node scripts/import-multibrand-catalog.mjs <path-to-xlsx> [--commit]");
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
const SHEET_NAME = "All Products Master";
const SKIP_ROWS = 2; // merged title row + column-header row

function cleanCell(v) {
  const s = (v ?? "").toString().trim();
  return s === "-" ? "" : s;
}

function parseWorkbook(path) {
  const wb = XLSX.readFile(path);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) throw new Error(`Sheet "${SHEET_NAME}" not found. Sheets present: ${wb.SheetNames.join(", ")}`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }).slice(SKIP_ROWS);

  const products = [];
  for (const r of rows) {
    const name = cleanCell(r[4]);
    if (!name) continue; // blank row / stray row
    const category = cleanCell(r[1]); // Sub-Category column - see header comment
    const brand = cleanCell(r[2]);
    const sku = cleanCell(r[3]);
    const specText = cleanCell(r[5]);
    const specs = specText ? specText.split(";").map((s) => s.trim()).filter(Boolean) : [];
    products.push({ category, brand, sku, name, specs });
  }
  return products;
}

async function main() {
  console.log(`Reading ${xlsxPath} ...`);
  const products = parseWorkbook(xlsxPath);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();

  console.log(`\nParsed ${products.length} product rows.`);
  console.log(`${categories.length} distinct categories: ${categories.join(", ")}`);
  console.log(`${brands.length} distinct brands: ${brands.join(", ")}`);

  console.log("\nSample rows:");
  for (const p of products.slice(0, 3).concat(products.slice(-3))) {
    console.log(JSON.stringify(p));
  }

  console.log("\n-- Checking for collisions against existing Supabase data --");
  const { data: existingProducts, error: pErr } = await db.from("products").select("brand, sku");
  if (pErr) throw new Error(pErr.message);
  const existingSkuKeys = new Set(
    existingProducts.map((p) => `${(p.brand || "").toLowerCase()}|||${(p.sku || "").toLowerCase()}`)
  );
  const skuCollisions = products.filter(
    (p) => p.sku && existingSkuKeys.has(`${p.brand.toLowerCase()}|||${p.sku.toLowerCase()}`)
  );
  console.log(`  SKU collisions with existing products: ${skuCollisions.length}`);
  skuCollisions.forEach((p) => console.log(`    [${p.brand}] ${p.sku} - ${p.name}`));

  if (!COMMIT) {
    console.log("\nDry run only - no changes written. Re-run with --commit to write to Supabase.");
    return;
  }

  console.log("\n-- Fetching existing categories/brands from Supabase --");
  const { data: existingCategories, error: catErr } = await db.from("categories").select("name");
  if (catErr) throw new Error(catErr.message);
  const existingCategoryNames = new Set(existingCategories.map((c) => c.name));

  const { data: existingBrands, error: brandErr } = await db.from("brands").select("id,name");
  if (brandErr) throw new Error(brandErr.message);
  const existingBrandByLowerName = new Map(existingBrands.map((b) => [b.name.toLowerCase(), b]));

  console.log("\n-- Inserting missing categories --");
  const newCategories = categories.filter((c) => !existingCategoryNames.has(c));
  for (const name of newCategories) {
    const { error } = await db.from("categories").insert({ name });
    if (error && error.code !== "23505") console.error(`  ! ${name}: ${error.message}`);
    else console.log(`  ok: ${name}`);
  }

  console.log("\n-- Inserting missing brands (type: active) --");
  const now = new Date().toISOString();
  for (const name of brands) {
    if (existingBrandByLowerName.has(name.toLowerCase())) {
      console.log(`  skip (exists): ${name}`);
      continue;
    }
    const row = {
      id: `b-${randomUUID()}`,
      name,
      type: "active",
      logo: "",
      created_at: now,
      updated_at: now,
    };
    const { error } = await db.from("brands").insert(row);
    if (error) console.error(`  ! ${name}: ${error.message}`);
    else {
      console.log(`  ok: ${name}`);
      existingBrandByLowerName.set(name.toLowerCase(), row);
    }
  }

  console.log("\n-- Inserting products (skipping SKU collisions) --");
  const toInsert = products.filter(
    (p) => !(p.sku && existingSkuKeys.has(`${p.brand.toLowerCase()}|||${p.sku.toLowerCase()}`))
  );
  const productRows = toInsert.map((p) => ({
    id: `p-${randomUUID()}`,
    name: p.name,
    category: p.category || "Uncategorised",
    brand: p.brand || "",
    sku: p.sku || "",
    price: "",
    in_stock: true,
    featured: false,
    specs: p.specs,
    description: "",
    images: [],
    created_at: now,
    updated_at: now,
  }));

  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < productRows.length; i += CHUNK) {
    const chunk = productRows.slice(i, i + CHUNK);
    const { error } = await db.from("products").insert(chunk);
    if (error) {
      console.error(`  ! chunk ${i}-${i + chunk.length}: ${error.message}`);
    } else {
      inserted += chunk.length;
      console.log(`  ok: rows ${i + 1}-${i + chunk.length}`);
    }
  }

  console.log(`\nDone. Inserted ${inserted}/${productRows.length} products.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

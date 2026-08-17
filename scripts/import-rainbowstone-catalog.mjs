// One-off import: RainbowStone_Product_Master_Catalog_Cleaned.xlsx -> Supabase.
// Imports only factual fields (category, brand, SKU, model name, technical specs).
// Deliberately drops the "Key Features" marketing copy and the "Datasheet /
// Reference Link" column (a direct link to a competitor's product page) per
// explicit decision - see conversation.
//
// Usage:
//   node scripts/import-rainbowstone-catalog.mjs <path-to-xlsx>           (dry run, prints summary only)
//   node scripts/import-rainbowstone-catalog.mjs <path-to-xlsx> --commit  (writes to Supabase)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import XLSX from "xlsx";

const args = process.argv.slice(2);
const xlsxPath = args.find((a) => !a.startsWith("--"));
const COMMIT = args.includes("--commit");
if (!xlsxPath) {
  console.error("Usage: node scripts/import-rainbowstone-catalog.mjs <path-to-xlsx> [--commit]");
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

// Sheet -> [rows to skip before data starts, default brand-type for brands
// whose majority of rows live in this sheet]. Determined by inspecting the
// actual workbook: most sheets have a merged title row + a header row (skip
// 2); "Racks & cabinet" has only a header row (skip 1); "PC&LAPTOP" has no
// header row at all (skip 0).
const SHEET_CONFIG = {
  "Active Networking": { skip: 2, type: "active" },
  "Passive & Cabling": { skip: 2, type: "passive" },
  "Telecom & Security": { skip: 2, type: "active" },
  "UPS & Storage": { skip: 2, type: "active" },
  "PC&LAPTOP": { skip: 0, type: "active" },
  "Specialty & Peripherals": { skip: 2, type: "active" },
  "Racks & cabinet": { skip: 1, type: "passive" },
};

function cleanCell(v) {
  const s = (v ?? "").toString().trim();
  return s === "-" ? "" : s;
}

function parseWorkbook(path) {
  const wb = XLSX.readFile(path);
  const products = []; // { category, subCategory, brand, sku, name, specs }
  const brandSheetCounts = new Map(); // brand -> Map(sheet -> count)

  for (const sheetName of wb.SheetNames) {
    const cfg = SHEET_CONFIG[sheetName];
    if (!cfg) {
      console.warn(`! unknown sheet "${sheetName}", skipping`);
      continue;
    }
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }).slice(cfg.skip);

    for (const r of rows) {
      const name = cleanCell(r[4]);
      if (!name) continue; // blank row / stray row
      const category = cleanCell(r[0]);
      const subCategory = cleanCell(r[1]);
      const brand = cleanCell(r[2]);
      const sku = cleanCell(r[3]);
      const specText = cleanCell(r[5]);
      const specs = specText
        ? specText.split(";").map((s) => s.trim()).filter(Boolean)
        : [];

      products.push({ category, subCategory, brand, sku, name, specs, sheet: sheetName });

      if (brand) {
        if (!brandSheetCounts.has(brand)) brandSheetCounts.set(brand, new Map());
        const m = brandSheetCounts.get(brand);
        m.set(sheetName, (m.get(sheetName) || 0) + 1);
      }
    }
  }

  // Assign each brand the type of the sheet it appears in most.
  const brandTypes = new Map();
  for (const [brand, sheetCounts] of brandSheetCounts) {
    let bestSheet = null;
    let bestCount = -1;
    for (const [sheet, count] of sheetCounts) {
      if (count > bestCount) {
        bestSheet = sheet;
        bestCount = count;
      }
    }
    brandTypes.set(brand, SHEET_CONFIG[bestSheet].type);
  }

  return { products, brandTypes };
}

async function main() {
  console.log(`Reading ${xlsxPath} ...`);
  const { products, brandTypes } = parseWorkbook(xlsxPath);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const brands = [...brandTypes.keys()].sort();

  console.log(`\nParsed ${products.length} product rows.`);
  console.log(`${categories.length} distinct categories: ${categories.join(", ")}`);
  console.log(`${brands.length} distinct brands.`);

  const activeBrands = brands.filter((b) => brandTypes.get(b) === "active");
  const passiveBrands = brands.filter((b) => brandTypes.get(b) === "passive");
  console.log(`  active (${activeBrands.length}): ${activeBrands.join(", ")}`);
  console.log(`  passive (${passiveBrands.length}): ${passiveBrands.join(", ")}`);

  console.log("\nSample rows:");
  for (const p of products.slice(0, 3).concat(products.slice(-3))) {
    console.log(JSON.stringify(p));
  }

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

  console.log("\n-- Inserting missing brands --");
  const now = new Date().toISOString();
  for (const name of brands) {
    if (existingBrandByLowerName.has(name.toLowerCase())) {
      console.log(`  skip (exists): ${name}`);
      continue;
    }
    const row = {
      id: `b-${randomUUID()}`,
      name,
      type: brandTypes.get(name),
      logo: "",
      created_at: now,
      updated_at: now,
    };
    const { error } = await db.from("brands").insert(row);
    if (error) console.error(`  ! ${name}: ${error.message}`);
    else {
      console.log(`  ok: ${name} (${row.type})`);
      existingBrandByLowerName.set(name.toLowerCase(), row);
    }
  }

  console.log("\n-- Inserting products --");
  const productRows = products.map((p) => ({
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

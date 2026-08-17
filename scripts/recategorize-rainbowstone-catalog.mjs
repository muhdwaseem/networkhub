// One-off fixup: re-categorize the RainbowStone import using the workbook's
// "Sub-Category" column instead of the coarse per-sheet "Category" column.
// The original import (scripts/import-rainbowstone-catalog.mjs) used
// "Category", which is nearly constant per sheet - e.g. every one of the
// 1,450 rows on "Passive & Cabling" got the single category "Passive
// Cabling". Sub-Category is the actual product-type breakdown (Access
// Points, Copper Bulk Cable, Fiber Patch Cords, ...) and distributes far
// more evenly.
//
// This deletes and re-inserts only the products carrying one of the 9
// original coarse categories (i.e. exactly the RainbowStone-imported rows -
// the pre-existing seed/test products use different category strings and
// are untouched), then replaces those 9 categories with the new
// sub-category-derived set. Brands are untouched (categorization doesn't
// affect brand assignment).
//
// Usage:
//   node scripts/recategorize-rainbowstone-catalog.mjs <path-to-xlsx>           (dry run)
//   node scripts/recategorize-rainbowstone-catalog.mjs <path-to-xlsx> --commit  (writes to Supabase)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import XLSX from "xlsx";

const args = process.argv.slice(2);
const xlsxPath = args.find((a) => !a.startsWith("--"));
const COMMIT = args.includes("--commit");
if (!xlsxPath) {
  console.error("Usage: node scripts/recategorize-rainbowstone-catalog.mjs <path-to-xlsx> [--commit]");
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

const SHEET_CONFIG = {
  "Active Networking": { skip: 2 },
  "Passive & Cabling": { skip: 2 },
  "Telecom & Security": { skip: 2 },
  "UPS & Storage": { skip: 2 },
  "PC&LAPTOP": { skip: 0 },
  "Specialty & Peripherals": { skip: 2 },
  "Racks & cabinet": { skip: 1 },
};

// The 9 coarse categories the original import created - these are what get
// deleted (both the products carrying them and the category rows
// themselves) and replaced.
const OLD_CATEGORIES = [
  "Active Networking",
  "Passive Cabling",
  "CCTV & Security",
  "Telecom & UC",
  "Servers & Storage",
  "UPS",
  "Racks & Power",
  "PC & LAPTOP",
  "Specialty & Tools",
];

// A few sub-categories need renaming: PC&LAPTOP's sheet has no header row so
// its raw values are shouty ("LAPTOP", "AIO", "PC"), and two Specialty
// sub-categories are too small (1 and 4 rows) to stand alone. Everything
// else is used as-is - duplicate sub-category names that appear on more
// than one sheet (e.g. "Wall Mount Racks" on both UPS & Storage and Racks &
// cabinet) merge automatically since they're already the same string.
const RENAME = {
  LAPTOP: "Laptops",
  AIO: "Desktop & AIO PCs",
  PC: "Desktop & AIO PCs",
  "Testing Equipment": "Tools & Testing Equipment",
  "Installation Tools": "Tools & Testing Equipment",
};

function cleanCell(v) {
  const s = (v ?? "").toString().trim();
  return s === "-" ? "" : s;
}

function finalCategory(rawSubCategory) {
  const trimmed = cleanCell(rawSubCategory);
  return RENAME[trimmed] || trimmed;
}

function parseWorkbook(path) {
  const wb = XLSX.readFile(path);
  const products = [];

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
      if (!name) continue;
      const category = finalCategory(r[1]) || "Uncategorised";
      const brand = cleanCell(r[2]);
      const sku = cleanCell(r[3]);
      const specText = cleanCell(r[5]);
      const specs = specText
        ? specText.split(";").map((s) => s.trim()).filter(Boolean)
        : [];

      products.push({ category, brand, sku, name, specs });
    }
  }

  return products;
}

async function main() {
  console.log(`Reading ${xlsxPath} ...`);
  const products = parseWorkbook(xlsxPath);
  const categories = [...new Set(products.map((p) => p.category))].sort();

  const counts = new Map();
  for (const p of products) counts.set(p.category, (counts.get(p.category) || 0) + 1);

  console.log(`\nParsed ${products.length} product rows into ${categories.length} categories:`);
  [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${String(n).padStart(4)}  ${c}`));

  if (!COMMIT) {
    console.log("\nDry run only - no changes written. Re-run with --commit to write to Supabase.");
    return;
  }

  console.log("\n-- Deleting previously-imported RainbowStone products --");
  const { data: deleted, error: delErr } = await db.from("products").delete().in("category", OLD_CATEGORIES).select("id");
  if (delErr) throw new Error(delErr.message);
  console.log(`  deleted ${deleted.length} products`);

  console.log("\n-- Removing the old coarse categories --");
  const { error: delCatErr } = await db.from("categories").delete().in("name", OLD_CATEGORIES);
  if (delCatErr) throw new Error(delCatErr.message);
  console.log(`  removed ${OLD_CATEGORIES.length} categories`);

  console.log("\n-- Inserting new categories --");
  const { data: existingCategories, error: catErr } = await db.from("categories").select("name");
  if (catErr) throw new Error(catErr.message);
  const existingNames = new Set(existingCategories.map((c) => c.name));
  for (const name of categories) {
    if (existingNames.has(name)) {
      console.log(`  skip (exists): ${name}`);
      continue;
    }
    const { error } = await db.from("categories").insert({ name });
    if (error && error.code !== "23505") console.error(`  ! ${name}: ${error.message}`);
    else console.log(`  ok: ${name}`);
  }

  console.log("\n-- Re-inserting products with corrected categories --");
  const now = new Date().toISOString();
  const productRows = products.map((p) => ({
    id: `p-${randomUUID()}`,
    name: p.name,
    category: p.category,
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

  console.log(`\nDone. Inserted ${inserted}/${productRows.length} products across ${categories.length} categories.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

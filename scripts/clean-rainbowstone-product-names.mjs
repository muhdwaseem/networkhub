// One-off fixup: clean up RainbowStone product names.
// The workbook's "Product Name / Model" column often has feature-bullet text
// bolted onto the end of the actual name (semicolon- or pipe-separated, or
// just run on with commas) - e.g. one row's name was 595 characters of
// marketing copy. That's cosmetically bad on product cards (fine, they
// line-clamp) but a real problem for the <title> tag, the <h1> on the
// product detail page, and the pre-filled WhatsApp enquiry message, none of
// which are clamped.
//
// Truncates at the first ';' or '|' (the actual name is reliably everything
// before it), then hard-caps whatever's left at a word boundary. Re-uses
// the same sub-category-based categorization as
// scripts/recategorize-rainbowstone-catalog.mjs (unchanged) - only names
// differ this run.
//
// Usage:
//   node scripts/clean-rainbowstone-product-names.mjs <path-to-xlsx>           (dry run)
//   node scripts/clean-rainbowstone-product-names.mjs <path-to-xlsx> --commit  (writes to Supabase)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import XLSX from "xlsx";

const args = process.argv.slice(2);
const xlsxPath = args.find((a) => !a.startsWith("--"));
const COMMIT = args.includes("--commit");
if (!xlsxPath) {
  console.error("Usage: node scripts/clean-rainbowstone-product-names.mjs <path-to-xlsx> [--commit]");
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

// Same rename map as recategorize-rainbowstone-catalog.mjs, kept in sync so
// this run produces the identical category set (so the delete-by-category
// filter below matches exactly what's already in the table).
const RENAME = {
  LAPTOP: "Laptops",
  AIO: "Desktop & AIO PCs",
  PC: "Desktop & AIO PCs",
  "Testing Equipment": "Tools & Testing Equipment",
  "Installation Tools": "Tools & Testing Equipment",
};

const TRAILING_PUNCT = /[-,:;|\s]+$/;
const NAME_MAX = 110;

function cleanCell(v) {
  const s = (v ?? "").toString().trim();
  return s === "-" ? "" : s;
}

function finalCategory(rawSubCategory) {
  const trimmed = cleanCell(rawSubCategory);
  return RENAME[trimmed] || trimmed;
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

function parseWorkbook(path) {
  const wb = XLSX.readFile(path);
  const products = [];

  for (const sheetName of wb.SheetNames) {
    const cfg = SHEET_CONFIG[sheetName];
    if (!cfg) continue;
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }).slice(cfg.skip);

    for (const r of rows) {
      const rawName = cleanCell(r[4]);
      if (!rawName) continue;
      const category = finalCategory(r[1]) || "Uncategorised";
      const brand = cleanCell(r[2]);
      const sku = cleanCell(r[3]);
      const specText = cleanCell(r[5]);
      const specs = specText
        ? specText.split(";").map((s) => s.trim()).filter(Boolean)
        : [];

      products.push({ category, brand, sku, name: cleanProductName(rawName), specs });
    }
  }

  return products;
}

async function main() {
  console.log(`Reading ${xlsxPath} ...`);
  const products = parseWorkbook(xlsxPath);
  const categories = [...new Set(products.map((p) => p.category))];
  const changed = products.length;

  const lens = products.map((p) => p.name.length).sort((a, b) => a - b);
  console.log(`\nParsed ${products.length} rows.`);
  console.log(`Name length after cleaning -> median: ${lens[Math.floor(lens.length / 2)]}, max: ${lens[lens.length - 1]}`);
  console.log("\nSample cleaned names:");
  products.slice(0, 5).forEach((p) => console.log(`  ${p.name}`));

  if (!COMMIT) {
    console.log("\nDry run only - no changes written. Re-run with --commit to write to Supabase.");
    return;
  }

  console.log("\n-- Deleting previously-imported RainbowStone products --");
  const { data: deleted, error: delErr } = await db.from("products").delete().in("category", categories).select("id");
  if (delErr) throw new Error(delErr.message);
  console.log(`  deleted ${deleted.length} products`);

  console.log("\n-- Re-inserting products with cleaned names --");
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

  console.log(`\nDone. Inserted ${inserted}/${productRows.length} products with cleaned names.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

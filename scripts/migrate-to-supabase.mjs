// One-off migration: local data/*.json + public/uploads/* -> Supabase.
// Usage: node scripts/migrate-to-supabase.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

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

async function uploadLocalFile(localPublicPath) {
  // localPublicPath looks like "/uploads/products/uuid.png"
  const rel = localPublicPath.replace(/^\/uploads\//, "");
  const diskPath = path.join("public", "uploads", rel);
  if (!existsSync(diskPath)) {
    console.warn(`  ! missing on disk, skipping: ${diskPath}`);
    return localPublicPath; // leave as-is rather than break the record
  }
  const buffer = readFileSync(diskPath);
  const ext = path.extname(rel).slice(1);
  const contentType = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" }[ext] || "application/octet-stream";
  const { error } = await db.storage.from(BUCKET).upload(rel, buffer, { contentType, upsert: true });
  if (error) {
    console.warn(`  ! upload failed for ${rel}: ${error.message}`);
    return localPublicPath;
  }
  const { data } = db.storage.from(BUCKET).getPublicUrl(rel);
  console.log(`  uploaded ${rel} -> ${data.publicUrl}`);
  return data.publicUrl;
}

async function remapImages(images) {
  const out = [];
  for (const img of images || []) {
    if (img.startsWith("/uploads/")) out.push(await uploadLocalFile(img));
    else out.push(img); // already a full URL or a static /images/ placeholder
  }
  return out;
}

async function main() {
  const categories = JSON.parse(readFileSync("data/categories.json", "utf-8"));
  const brands = JSON.parse(readFileSync("data/brands.json", "utf-8"));
  const products = JSON.parse(readFileSync("data/products.json", "utf-8"));
  const settings = JSON.parse(readFileSync("data/settings.json", "utf-8"));

  console.log(`Categories: ${categories.length}, Brands: ${brands.length}, Products: ${products.length}`);

  console.log("\n-- Categories --");
  for (const name of categories) {
    const { error } = await db.from("categories").upsert({ name });
    if (error) console.error(`  ! ${name}: ${error.message}`);
    else console.log(`  ok: ${name}`);
  }

  console.log("\n-- Brands --");
  for (const b of brands) {
    const logo = b.logo ? await remapImages([b.logo]).then((a) => a[0]) : "";
    const { error } = await db.from("brands").upsert({
      id: b.id,
      name: b.name,
      type: b.type,
      logo,
      created_at: b.createdAt,
      updated_at: b.updatedAt,
    });
    if (error) console.error(`  ! ${b.name}: ${error.message}`);
    else console.log(`  ok: ${b.name}`);
  }

  console.log("\n-- Products --");
  for (const p of products) {
    const images = await remapImages(p.images);
    const { error } = await db.from("products").upsert({
      id: p.id,
      name: p.name,
      category: p.category,
      brand: p.brand || "",
      sku: p.sku || "",
      price: p.price || "",
      in_stock: p.inStock !== false,
      featured: !!p.featured,
      specs: p.specs || [],
      description: p.description || "",
      images,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    });
    if (error) console.error(`  ! ${p.name}: ${error.message}`);
    else console.log(`  ok: ${p.name}`);
  }

  console.log("\n-- Settings --");
  const settingsLogo = settings.logo?.startsWith("/uploads/") ? await remapImages([settings.logo]).then((a) => a[0]) : settings.logo;
  const settingsHero = settings.heroImage?.startsWith("/uploads/") ? await remapImages([settings.heroImage]).then((a) => a[0]) : settings.heroImage;
  const { error: sErr } = await db
    .from("settings")
    .upsert({ id: 1, data: { ...settings, logo: settingsLogo, heroImage: settingsHero }, updated_at: new Date().toISOString() });
  if (sErr) console.error(`  ! settings: ${sErr.message}`);
  else console.log("  ok: settings");

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

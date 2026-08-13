import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Defaults to the repo's data/ folder for local dev. On a host with a
// persistent volume (e.g. Railway), set DATA_DIR to a path on that volume
// so product/category/settings edits survive redeploys.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const BRANDS_FILE = path.join(DATA_DIR, "brands.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

// Write via a temp file + rename so a crash mid-write can never truncate
// the real data file — the JSON on disk is either the old version or the
// fully-written new one, never a half-written one.
async function writeJsonAtomic(file, data) {
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

// Serializes read-modify-write sequences per file so two overlapping
// mutations (two admin tabs, a double-submit) can't both read the same
// snapshot and have one silently overwrite the other's write.
const fileLocks = new Map();

function withFileLock(file, fn) {
  const tail = fileLocks.get(file) || Promise.resolve();
  const result = tail.then(fn, fn);
  fileLocks.set(file, result.catch(() => {}));
  return result;
}

// ---------- Products ----------

export async function getProducts() {
  return readJson(PRODUCTS_FILE, []);
}

export async function getProductById(id) {
  const products = await getProducts();
  return products.find((p) => p.id === id) || null;
}

export async function createProduct(data) {
  return withFileLock(PRODUCTS_FILE, async () => {
    const products = await getProducts();
    const now = new Date().toISOString();
    const product = {
      id: `p-${randomUUID()}`,
      name: data.name?.trim() || "Untitled product",
      category: data.category?.trim() || "Uncategorised",
      brand: data.brand?.trim() || "",
      sku: data.sku?.trim() || "",
      price: data.price?.trim() || "",
      inStock: data.inStock !== false,
      featured: !!data.featured,
      specs: Array.isArray(data.specs) ? data.specs.filter(Boolean) : [],
      description: data.description?.trim() || "",
      images: Array.isArray(data.images) ? data.images : [],
      createdAt: now,
      updatedAt: now,
    };
    products.unshift(product);
    await writeJsonAtomic(PRODUCTS_FILE, products);
    return product;
  });
}

export async function updateProduct(id, data) {
  return withFileLock(PRODUCTS_FILE, async () => {
    const products = await getProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const existing = products[idx];
    const updated = {
      ...existing,
      name: data.name?.trim() ?? existing.name,
      category: data.category?.trim() ?? existing.category,
      brand: data.brand?.trim() ?? existing.brand,
      sku: data.sku?.trim() ?? existing.sku,
      price: data.price?.trim() ?? existing.price,
      inStock: data.inStock !== undefined ? !!data.inStock : existing.inStock,
      featured: data.featured !== undefined ? !!data.featured : existing.featured,
      specs: Array.isArray(data.specs) ? data.specs.filter(Boolean) : existing.specs,
      description: data.description?.trim() ?? existing.description,
      images: Array.isArray(data.images) ? data.images : existing.images,
      updatedAt: new Date().toISOString(),
    };
    products[idx] = updated;
    await writeJsonAtomic(PRODUCTS_FILE, products);
    return updated;
  });
}

export async function deleteProduct(id) {
  return withFileLock(PRODUCTS_FILE, async () => {
    const products = await getProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const [removed] = products.splice(idx, 1);
    await writeJsonAtomic(PRODUCTS_FILE, products);
    return removed;
  });
}

// ---------- Categories ----------

export async function getCategories() {
  return readJson(CATEGORIES_FILE, []);
}

export async function addCategory(name) {
  const trimmed = name?.trim();
  if (!trimmed) return getCategories();
  return withFileLock(CATEGORIES_FILE, async () => {
    const categories = await getCategories();
    if (!categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      categories.push(trimmed);
      await writeJsonAtomic(CATEGORIES_FILE, categories);
    }
    return categories;
  });
}

export async function deleteCategory(name) {
  return withFileLock(CATEGORIES_FILE, async () => {
    const categories = await getCategories();
    const next = categories.filter((c) => c !== name);
    await writeJsonAtomic(CATEGORIES_FILE, next);
    return next;
  });
}

// ---------- Brands ----------
// Unlike categories (a bare string list), brands carry an active/passive
// classification and an optional logo, so they need to be objects with an
// id. product.brand still stores the brand's name as a plain string though
// (matching the category precedent) rather than a brandId FK — every read
// path already treats brand as a display string, and a flat-JSON store has
// no join layer to make an FK worth it. reassignProductsBrand() below is
// what keeps that string in sync on rename.

export async function getBrands() {
  return readJson(BRANDS_FILE, []);
}

export async function getBrandById(id) {
  const brands = await getBrands();
  return brands.find((b) => b.id === id) || null;
}

export async function createBrand(data) {
  return withFileLock(BRANDS_FILE, async () => {
    const brands = await getBrands();
    const name = data.name?.trim();
    if (!name) throw new Error("Brand name is required.");
    if (brands.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("A brand with this name already exists.");
    }
    const now = new Date().toISOString();
    const brand = {
      id: `b-${randomUUID()}`,
      name,
      type: data.type === "passive" ? "passive" : "active",
      logo: data.logo?.trim() || "",
      createdAt: now,
      updatedAt: now,
    };
    brands.push(brand);
    await writeJsonAtomic(BRANDS_FILE, brands);
    return brand;
  });
}

export async function updateBrand(id, data) {
  return withFileLock(BRANDS_FILE, async () => {
    const brands = await getBrands();
    const idx = brands.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const existing = brands[idx];
    const nextName = data.name?.trim() || existing.name;
    if (
      nextName.toLowerCase() !== existing.name.toLowerCase() &&
      brands.some((b, i) => i !== idx && b.name.toLowerCase() === nextName.toLowerCase())
    ) {
      throw new Error("A brand with this name already exists.");
    }
    const updated = {
      ...existing,
      name: nextName,
      type: data.type === "passive" || data.type === "active" ? data.type : existing.type,
      logo: data.logo !== undefined ? data.logo?.trim() || "" : existing.logo,
      updatedAt: new Date().toISOString(),
    };
    brands[idx] = updated;
    await writeJsonAtomic(BRANDS_FILE, brands);
    return updated;
  });
}

export async function deleteBrand(id) {
  return withFileLock(BRANDS_FILE, async () => {
    const brands = await getBrands();
    const idx = brands.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    const [removed] = brands.splice(idx, 1);
    await writeJsonAtomic(BRANDS_FILE, brands);
    return removed;
  });
}

// Cascades a brand rename onto every product referencing the old name by
// its string value — necessary because product.brand is a denormalised
// string rather than a brand id (see note above).
export async function reassignProductsBrand(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return 0;
  return withFileLock(PRODUCTS_FILE, async () => {
    const products = await getProducts();
    let changed = 0;
    const next = products.map((p) => {
      if (p.brand === oldName) {
        changed++;
        return { ...p, brand: newName, updatedAt: new Date().toISOString() };
      }
      return p;
    });
    if (changed) await writeJsonAtomic(PRODUCTS_FILE, next);
    return changed;
  });
}

// ---------- Settings ----------

const DEFAULT_SETTINGS = {
  businessName: "Your Company LLC",
  tagline: "",
  description: "",
  whatsappNumber: "",
  email: "",
  phoneDisplay: "",
  address: "",
  logo: "/images/logo.svg",
  heroImage: "",
  socials: { facebook: "", instagram: "", linkedin: "" },
  businessHours: "",
};

export async function getSettings() {
  const settings = await readJson(SETTINGS_FILE, DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings, socials: { ...DEFAULT_SETTINGS.socials, ...settings.socials } };
}

export async function updateSettings(data) {
  return withFileLock(SETTINGS_FILE, async () => {
    const current = await getSettings();
    const updated = {
      ...current,
      ...data,
      socials: { ...current.socials, ...(data.socials || {}) },
    };
    await writeJsonAtomic(SETTINGS_FILE, updated);
    return updated;
  });
}

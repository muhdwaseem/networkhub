import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
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

// ---------- Products ----------

export async function getProducts() {
  return readJson(PRODUCTS_FILE, []);
}

export async function getProductById(id) {
  const products = await getProducts();
  return products.find((p) => p.id === id) || null;
}

export async function createProduct(data) {
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
}

export async function updateProduct(id, data) {
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
}

export async function deleteProduct(id) {
  const products = await getProducts();
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const [removed] = products.splice(idx, 1);
  await writeJsonAtomic(PRODUCTS_FILE, products);
  return removed;
}

// ---------- Categories ----------

export async function getCategories() {
  return readJson(CATEGORIES_FILE, []);
}

export async function addCategory(name) {
  const trimmed = name?.trim();
  if (!trimmed) return getCategories();
  const categories = await getCategories();
  if (!categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    categories.push(trimmed);
    await writeJsonAtomic(CATEGORIES_FILE, categories);
  }
  return categories;
}

export async function deleteCategory(name) {
  const categories = await getCategories();
  const next = categories.filter((c) => c !== name);
  await writeJsonAtomic(CATEGORIES_FILE, next);
  return next;
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
  const current = await getSettings();
  const updated = {
    ...current,
    ...data,
    socials: { ...current.socials, ...(data.socials || {}) },
  };
  await writeJsonAtomic(SETTINGS_FILE, updated);
  return updated;
}

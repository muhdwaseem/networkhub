import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "./supabaseAdmin";

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ---------- Products ----------

function rowToProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    sku: row.sku,
    price: row.price,
    inStock: row.in_stock,
    featured: row.featured,
    specs: row.specs || [],
    description: row.description,
    images: row.images || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProducts() {
  const db = getSupabaseAdmin();
  const rows = unwrap(await db.from("products").select("*").order("created_at", { ascending: false }));
  return rows.map(rowToProduct);
}

export async function getProductById(id) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToProduct(data) : null;
}

export async function createProduct(data) {
  const db = getSupabaseAdmin();
  const now = new Date().toISOString();
  const row = {
    id: `p-${randomUUID()}`,
    name: data.name?.trim() || "Untitled product",
    category: data.category?.trim() || "Uncategorised",
    brand: data.brand?.trim() || "",
    sku: data.sku?.trim() || "",
    price: data.price?.trim() || "",
    in_stock: data.inStock !== false,
    featured: !!data.featured,
    specs: Array.isArray(data.specs) ? data.specs.filter(Boolean) : [],
    description: data.description?.trim() || "",
    images: Array.isArray(data.images) ? data.images : [],
    created_at: now,
    updated_at: now,
  };
  const inserted = unwrap(await db.from("products").insert(row).select().single());
  return rowToProduct(inserted);
}

export async function updateProduct(id, data) {
  const db = getSupabaseAdmin();
  const existing = await getProductById(id);
  if (!existing) return null;
  const row = {
    name: data.name?.trim() ?? existing.name,
    category: data.category?.trim() ?? existing.category,
    brand: data.brand?.trim() ?? existing.brand,
    sku: data.sku?.trim() ?? existing.sku,
    price: data.price?.trim() ?? existing.price,
    in_stock: data.inStock !== undefined ? !!data.inStock : existing.inStock,
    featured: data.featured !== undefined ? !!data.featured : existing.featured,
    specs: Array.isArray(data.specs) ? data.specs.filter(Boolean) : existing.specs,
    description: data.description?.trim() ?? existing.description,
    images: Array.isArray(data.images) ? data.images : existing.images,
    updated_at: new Date().toISOString(),
  };
  const updated = unwrap(await db.from("products").update(row).eq("id", id).select().single());
  return rowToProduct(updated);
}

export async function deleteProduct(id) {
  const db = getSupabaseAdmin();
  const existing = await getProductById(id);
  if (!existing) return null;
  unwrap(await db.from("products").delete().eq("id", id).select());
  return existing;
}

// ---------- Categories ----------

export async function getCategories() {
  const db = getSupabaseAdmin();
  const rows = unwrap(await db.from("categories").select("name").order("name"));
  return rows.map((r) => r.name);
}

export async function addCategory(name) {
  const trimmed = name?.trim();
  if (!trimmed) return getCategories();
  const db = getSupabaseAdmin();
  const existing = await getCategories();
  if (!existing.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
    const { error } = await db.from("categories").insert({ name: trimmed });
    // 23505 = unique_violation — a concurrent request already added it, fine.
    if (error && error.code !== "23505") throw new Error(error.message);
  }
  return getCategories();
}

export async function deleteCategory(name) {
  const db = getSupabaseAdmin();
  unwrap(await db.from("categories").delete().eq("name", name).select());
  return getCategories();
}

// ---------- Brands ----------
// Unlike categories (a bare string list), brands carry an active/passive
// classification and an optional logo, so they need to be objects with an
// id. product.brand still stores the brand's name as a plain string though
// (matching the category precedent) rather than a brandId FK — every read
// path already treats brand as a display string. reassignProductsBrand()
// below is what keeps that string in sync on rename.

function rowToBrand(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    logo: row.logo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getBrands() {
  const db = getSupabaseAdmin();
  const rows = unwrap(await db.from("brands").select("*").order("created_at"));
  return rows.map(rowToBrand);
}

export async function getBrandById(id) {
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("brands").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToBrand(data) : null;
}

export async function createBrand(data) {
  const db = getSupabaseAdmin();
  const name = data.name?.trim();
  if (!name) throw new Error("Brand name is required.");
  const brands = await getBrands();
  if (brands.some((b) => b.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("A brand with this name already exists.");
  }
  const now = new Date().toISOString();
  const row = {
    id: `b-${randomUUID()}`,
    name,
    type: data.type === "passive" ? "passive" : "active",
    logo: data.logo?.trim() || "",
    created_at: now,
    updated_at: now,
  };
  const { data: inserted, error } = await db.from("brands").insert(row).select().single();
  if (error) {
    if (error.code === "23505") throw new Error("A brand with this name already exists.");
    throw new Error(error.message);
  }
  return rowToBrand(inserted);
}

export async function updateBrand(id, data) {
  const db = getSupabaseAdmin();
  const existing = await getBrandById(id);
  if (!existing) return null;
  const nextName = data.name?.trim() || existing.name;
  if (nextName.toLowerCase() !== existing.name.toLowerCase()) {
    const brands = await getBrands();
    if (brands.some((b) => b.id !== id && b.name.toLowerCase() === nextName.toLowerCase())) {
      throw new Error("A brand with this name already exists.");
    }
  }
  const row = {
    name: nextName,
    type: data.type === "passive" || data.type === "active" ? data.type : existing.type,
    logo: data.logo !== undefined ? data.logo?.trim() || "" : existing.logo,
    updated_at: new Date().toISOString(),
  };
  const { data: updated, error } = await db.from("brands").update(row).eq("id", id).select().single();
  if (error) {
    if (error.code === "23505") throw new Error("A brand with this name already exists.");
    throw new Error(error.message);
  }
  return rowToBrand(updated);
}

export async function deleteBrand(id) {
  const db = getSupabaseAdmin();
  const existing = await getBrandById(id);
  if (!existing) return null;
  unwrap(await db.from("brands").delete().eq("id", id).select());
  return existing;
}

// Cascades a brand rename onto every product referencing the old name by
// its string value — necessary because product.brand is a denormalised
// string rather than a brand id (see note above).
export async function reassignProductsBrand(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return 0;
  const db = getSupabaseAdmin();
  const rows = unwrap(
    await db
      .from("products")
      .update({ brand: newName, updated_at: new Date().toISOString() })
      .eq("brand", oldName)
      .select("id")
  );
  return rows.length;
}

// ---------- Settings ----------
// Stored as a single jsonb blob in a one-row table, matching the old
// settings.json shape exactly (including the nested "socials" object) so
// nothing else in the codebase needs to change field-by-field.

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
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("settings").select("data").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  const settings = data?.data || {};
  return { ...DEFAULT_SETTINGS, ...settings, socials: { ...DEFAULT_SETTINGS.socials, ...settings.socials } };
}

export async function updateSettings(data) {
  const db = getSupabaseAdmin();
  const current = await getSettings();
  const updated = {
    ...current,
    ...data,
    socials: { ...current.socials, ...(data.socials || {}) },
  };
  unwrap(
    await db
      .from("settings")
      .upsert({ id: 1, data: updated, updated_at: new Date().toISOString() })
      .select()
  );
  return updated;
}

import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "./supabaseAdmin";

function unwrap({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

// ---------- Products ----------

// Matches the same literal used client-side in ProductsExplorer.js — kept as
// a plain string on both sides rather than a shared import, since this file
// pulls in the service-role Supabase client and can't be imported from a
// "use client" component.
const UNBRANDED_VALUE = "__unbranded__";

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

// Supabase's PostgREST API caps any single request at its project "Max Rows"
// setting (1000 here) regardless of how many rows actually match — an
// unbounded .select() silently truncates rather than erroring. Callers of
// this function expect the *entire* table (category/brand counts, in-use
// checks before a delete, etc.), so it pages through with .range() until
// exhausted. The id tiebreaker keeps each page's ordering deterministic even
// when many rows share a created_at (e.g. a bulk import), which otherwise
// risks Postgres reshuffling ties across page boundaries and silently
// dropping or duplicating rows.
const FETCH_PAGE_SIZE = 1000;

export async function getProducts() {
  const db = getSupabaseAdmin();
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    all.push(...data);
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  return all.map(rowToProduct);
}

// Escape characters that have special meaning in a PostgREST or() filter
// string (comma separates conditions, parens group them, quotes end a
// quoted value) so a search box can't reshape the filter it's embedded in.
function sanitizeForOrFilter(value) {
  return value.replace(/[,()"]/g, " ").trim();
}

function withProductFilters(query, { category, brand, search }) {
  if (category) {
    // A merged homepage/browse entry (see lib/categoryGroups.js) links here
    // with several category names joined by "," - fall back to .in() for
    // those, .eq() for every ordinary single-category link (unchanged).
    const categoryList = category.split(",").map((c) => c.trim()).filter(Boolean);
    query =
      categoryList.length > 1 ? query.in("category", categoryList) : query.eq("category", categoryList[0]);
  }
  if (brand === UNBRANDED_VALUE) query = query.eq("brand", "");
  else if (brand) query = query.eq("brand", brand);

  const q = sanitizeForOrFilter(search);
  if (q) {
    const pattern = `%${q}%`;
    query = query.or(
      `name.ilike.${pattern},brand.ilike.${pattern},category.ilike.${pattern},sku.ilike.${pattern},description.ilike.${pattern}`
    );
  }
  return query;
}

export async function getProductsPage({ search = "", category = "", brand = "", page = 1, pageSize = 24 } = {}) {
  const db = getSupabaseAdmin();
  const filters = { category, brand, search };

  // Count first (cheap - head:true fetches no rows) so an out-of-range page
  // can be clamped before it's used. A page number from a stale bookmarked
  // or shared link (the catalog's size has changed under it repeatedly
  // during this import/cleanup work) would otherwise ask PostgREST for a
  // .range() starting past the last matching row, which it answers with a
  // hard 416 error instead of an empty result - crashing the page instead
  // of just showing nothing.
  const { count, error: countError } = await withProductFilters(
    db.from("products").select("*", { count: "exact", head: true }),
    filters
  );
  if (countError) throw new Error(countError.message);

  const total = count ?? 0;
  if (total === 0) return { products: [], total: 0, page: 1 };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await withProductFilters(
    db
      .from("products")
      .select("*")
      // created_at ties (e.g. a bulk import) need a unique tiebreaker or
      // Postgres can reorder those rows between page requests, corrupting pagination.
      .order("created_at", { ascending: false })
      .order("id", { ascending: true }),
    filters
  ).range(from, to);
  if (error) throw new Error(error.message);

  return { products: data.map(rowToProduct), total, page: safePage };
}

// The homepage and product-detail page used to call getProducts() (the
// entire catalog, every column, paginated) just to derive counts or a
// handful of related items - fine at seed-data scale, but at ~2800 rows
// that's a ~1.2MB payload and a multi-second round trip on every view of
// the site's two busiest pages. These fetch only what each caller needs.

export async function getCategoryCounts() {
  const db = getSupabaseAdmin();
  const counts = new Map();
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("products")
      .select("category")
      .order("id", { ascending: true })
      .range(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    for (const row of data) {
      if (!row.category) continue;
      counts.set(row.category, (counts.get(row.category) || 0) + 1);
    }
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  return counts;
}

export async function getBrandCounts() {
  const db = getSupabaseAdmin();
  const counts = new Map();
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("products")
      .select("brand")
      .order("id", { ascending: true })
      .range(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    for (const row of data) {
      if (!row.brand) continue;
      counts.set(row.brand, (counts.get(row.brand) || 0) + 1);
    }
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  return counts;
}

export async function getProductCount() {
  const db = getSupabaseAdmin();
  const { count, error } = await db.from("products").select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getFeaturedProducts(limit = 8) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  if (data.length) return data.map(rowToProduct);

  // No products flagged featured yet - fall back to a recent sample so the
  // homepage section isn't empty.
  const { data: fallback, error: fallbackError } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (fallbackError) throw new Error(fallbackError.message);
  return fallback.map(rowToProduct);
}

export async function getUnbrandedProducts(limit = 4) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("brand", "")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data.map(rowToProduct);
}

export async function getRelatedProducts(category, excludeId, limit = 4) {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("category", category)
    .neq("id", excludeId)
    .limit(limit);
  if (error) throw new Error(error.message);
  return data.map(rowToProduct);
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
  logo: "/images/logo.png",
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

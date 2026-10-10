import { getSupabaseAdmin } from "./supabaseAdmin";

const TITLE_MAX = 70;
const DESCRIPTION_MAX = 160;
const FETCH_PAGE_SIZE = 1000;

// Finding a duplicate requires comparing every product against every other
// product, so unlike the paginated products list, this genuinely has to
// look at the whole catalog at once. The lesson from the admin products
// slowness bug still applies though: fetch only the handful of text
// columns actually needed (no images, no signed-URL resolution) and never
// render all ~2,900 rows — only the ones that actually have a problem,
// paginated, via getSeoIssuesPage() below.
async function fetchAllProductsLean() {
  const db = getSupabaseAdmin();
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await db
      .from("products")
      .select("id, name, category, seo_title, meta_description, description, specs")
      .order("id", { ascending: true })
      .range(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    all.push(...data);
    if (data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }
  return all;
}

function effectiveTitle(row) {
  return (row.seo_title || row.name || "").trim();
}

function effectiveDescription(row) {
  return (row.meta_description || row.description || (row.specs || []).join(", ") || "").trim();
}

function addToGroup(map, key, productId) {
  if (!key) return;
  const existing = map.get(key);
  if (existing) existing.push(productId);
  else map.set(key, [productId]);
}

// Runs the full catalog-wide scan and returns every flagged issue, newest
// scan always fresh (no caching) — the fetch+loop is a handful of fast
// passes over an in-memory array, the same cost class as the existing
// "is this category still in use" checks elsewhere in lib/db.js.
export async function runSeoAudit() {
  const rows = await fetchAllProductsLean();

  const titleGroups = new Map();
  const descriptionGroups = new Map();
  for (const row of rows) {
    addToGroup(titleGroups, effectiveTitle(row).toLowerCase(), row.id);
    addToGroup(descriptionGroups, effectiveDescription(row).toLowerCase(), row.id);
  }

  const issues = [];
  for (const row of rows) {
    const title = effectiveTitle(row);
    const description = effectiveDescription(row);
    const base = { productId: row.id, productName: row.name, category: row.category };

    if (!description) {
      issues.push({ ...base, type: "missing_description", detail: "No meta description or specs to fall back on." });
    }
    if (title.length > TITLE_MAX) {
      issues.push({ ...base, type: "title_too_long", detail: `${title.length} characters (max ${TITLE_MAX} before Google truncates it).` });
    }
    if (description.length > DESCRIPTION_MAX) {
      issues.push({ ...base, type: "description_too_long", detail: `${description.length} characters (max ${DESCRIPTION_MAX} before Google truncates it).` });
    }
    const titleKey = title.toLowerCase();
    if (title && titleGroups.get(titleKey)?.length > 1) {
      issues.push({ ...base, type: "duplicate_title", detail: `Shared with ${titleGroups.get(titleKey).length - 1} other product(s).` });
    }
    const descKey = description.toLowerCase();
    if (description && descriptionGroups.get(descKey)?.length > 1) {
      issues.push({ ...base, type: "duplicate_description", detail: `Shared with ${descriptionGroups.get(descKey).length - 1} other product(s).` });
    }
  }

  const summary = {
    totalProducts: rows.length,
    missingDescription: issues.filter((i) => i.type === "missing_description").length,
    titleTooLong: issues.filter((i) => i.type === "title_too_long").length,
    descriptionTooLong: issues.filter((i) => i.type === "description_too_long").length,
    duplicateTitle: issues.filter((i) => i.type === "duplicate_title").length,
    duplicateDescription: issues.filter((i) => i.type === "duplicate_description").length,
  };

  return { issues, summary };
}

export function getIssuesPage(issues, { page = 1, pageSize = 50 } = {}) {
  const from = (page - 1) * pageSize;
  return {
    items: issues.slice(from, from + pageSize),
    total: issues.length,
    page,
  };
}

import { getProducts, getCategories } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo";

// Unlike regular page.js routes, this special metadata-route file does NOT
// inherit the root layout's force-dynamic setting — Next.js tries to
// pre-build it once at build time by default, which (a) crashed Preview
// deployments that don't have Supabase credentials available at build time,
// and (b) would otherwise bake in a stale product list until the next
// deploy. Forcing it dynamic makes every /sitemap.xml request fetch the
// current product/category list live, same as every other page.
export const dynamic = "force-dynamic";

// Next.js serves whatever this returns at /sitemap.xml automatically — no
// route file or XML-building needed.
export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  // "Today, on every request" is a meaningless freshness signal — Google
  // uses lastModified to decide whether a page is worth recrawling, so a
  // date that's always "now" regardless of whether anything changed is
  // actively misleading, not just lazy. Use the real data instead:
  const productDates = products
    .map((p) => (p.updatedAt ? new Date(p.updatedAt) : null))
    .filter(Boolean);
  const catalogLastModified = productDates.length
    ? new Date(Math.max(...productDates.map((d) => d.getTime())))
    : undefined;

  // Per-category "last modified" = the most recent update among that
  // category's own products, computed from data already fetched above
  // rather than a second query.
  const categoryLastModified = new Map();
  for (const product of products) {
    if (!product.updatedAt) continue;
    const updated = new Date(product.updatedAt);
    const current = categoryLastModified.get(product.category);
    if (!current || updated > current) categoryLastModified.set(product.category, updated);
  }

  const staticRoutes = [
    // Homepage and /products both surface the live catalog, so the most
    // recent product update is a genuine freshness signal for them.
    { path: "", changeFrequency: "daily", priority: 1, lastModified: catalogLastModified },
    { path: "/products", changeFrequency: "daily", priority: 0.9, lastModified: catalogLastModified },
    // /about and /contact are static marketing copy with no real "last
    // changed" timestamp available — omitting lastModified (rather than
    // claiming "today") is the honest choice; Google treats a missing
    // value as simply unknown, not as "never crawl this."
    { path: "/about", changeFrequency: "monthly", priority: 0.5 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  ].map(({ path, changeFrequency, priority, lastModified }) => ({
    url: `${siteUrl}${path}`,
    ...(lastModified && { lastModified }),
    changeFrequency,
    priority,
  }));

  const categoryRoutes = categories.map((name) => {
    const lastModified = categoryLastModified.get(name);
    return {
      url: `${siteUrl}/products?category=${encodeURIComponent(name)}`,
      ...(lastModified && { lastModified }),
      changeFrequency: "weekly",
      priority: 0.6,
    };
  });

  const productRoutes = products.map((product) => ({
    url: `${siteUrl}/products/${product.id}`,
    ...(product.updatedAt && { lastModified: new Date(product.updatedAt) }),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}

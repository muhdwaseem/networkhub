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

  const staticRoutes = [
    { path: "", changeFrequency: "daily", priority: 1 },
    { path: "/products", changeFrequency: "daily", priority: 0.9 },
    { path: "/about", changeFrequency: "monthly", priority: 0.5 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
  ].map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));

  const categoryRoutes = categories.map((name) => ({
    url: `${siteUrl}/products?category=${encodeURIComponent(name)}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const productRoutes = products.map((product) => ({
    url: `${siteUrl}/products/${product.id}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}

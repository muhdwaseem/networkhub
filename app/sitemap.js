import { getProducts, getCategories } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo";

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

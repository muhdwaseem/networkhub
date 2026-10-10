import { Suspense } from "react";
import { getProductsPage, getCategories } from "@/lib/db";
import { withResolvedProductImages } from "@/lib/images";
import ProductsTable from "@/components/admin/ProductsTable";

export const metadata = { title: "Products" };

const PAGE_SIZE = 50;

export default async function AdminProductsPage({ searchParams }) {
  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" && sp.category !== "All" ? sp.category : "";
  const requestedPage = Math.max(1, parseInt(sp.page, 10) || 1);

  // Fetches only this page's ~50 rows (not the full ~2,900-row catalog) and
  // resolves signed image URLs for only those — the previous version called
  // getProducts() (every row) + withResolvedProductImages() (one signed-URL
  // request per image, across every row) on every single page load, which
  // was the actual cause of the admin products page feeling slow.
  const [{ products: rawProducts, total, page }, categories] = await Promise.all([
    getProductsPage({ search, category, page: requestedPage, pageSize: PAGE_SIZE }),
    getCategories(),
  ]);
  const products = await withResolvedProductImages(rawProducts);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Products</h1>
      <p className="mt-1 text-sm text-slate-500">{total} total</p>
      <div className="mt-6">
        <Suspense fallback={<div className="h-10" />}>
          <ProductsTable
            products={products}
            categories={categories}
            total={total}
            page={page}
            totalPages={totalPages}
            initialSearch={search}
            initialCategory={category}
          />
        </Suspense>
      </div>
    </div>
  );
}

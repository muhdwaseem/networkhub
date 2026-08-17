import { Suspense } from "react";
import { getProductsPage, getCategories, getBrands, getSettings } from "@/lib/db";
import { withResolvedProductImages } from "@/lib/images";
import ProductsExplorer from "@/components/site/ProductsExplorer";

export const metadata = {
  title: "Products",
  description: "Browse our full product catalog and enquire via WhatsApp or email.",
};

const PAGE_SIZE = 24;

export default async function ProductsPage({ searchParams }) {
  const sp = await searchParams;
  const search = typeof sp.q === "string" ? sp.q : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const brand = typeof sp.brand === "string" ? sp.brand : "";
  const requestedPage = Math.max(1, parseInt(sp.page, 10) || 1);

  const [{ products: rawProducts, total, page }, categories, brands, settings] = await Promise.all([
    getProductsPage({ search, category, brand, page: requestedPage, pageSize: PAGE_SIZE }),
    getCategories(),
    getBrands(),
    getSettings(),
  ]);
  const products = await withResolvedProductImages(rawProducts);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container-page py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Product Catalog
        </h1>
        <p className="mt-3 text-slate-600">
          Filter by category or search below. Every product enquiry goes straight to us on
          WhatsApp or email — no account or checkout required.
        </p>
      </div>

      <div className="mt-8">
        <Suspense fallback={<div className="h-10" />}>
          <ProductsExplorer
            products={products}
            categories={categories}
            brands={brands}
            settings={settings}
            total={total}
            page={page}
            totalPages={totalPages}
            initialSearch={search}
          />
        </Suspense>
      </div>
    </div>
  );
}

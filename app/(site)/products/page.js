import { Suspense } from "react";
import { getProducts, getCategories, getBrands, getSettings } from "@/lib/db";
import { withResolvedProductImages } from "@/lib/images";
import ProductsExplorer from "@/components/site/ProductsExplorer";

export const metadata = {
  title: "Products",
  description: "Browse our full product catalog and enquire via WhatsApp or email.",
};

export default async function ProductsPage() {
  const [rawProducts, categories, brands, settings] = await Promise.all([
    getProducts(),
    getCategories(),
    getBrands(),
    getSettings(),
  ]);
  const products = await withResolvedProductImages(rawProducts);

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
          <ProductsExplorer products={products} categories={categories} brands={brands} settings={settings} />
        </Suspense>
      </div>
    </div>
  );
}

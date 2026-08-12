import { getProducts, getCategories } from "@/lib/db";
import ProductsTable from "@/components/admin/ProductsTable";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Products</h1>
      <p className="mt-1 text-sm text-slate-500">{products.length} total</p>
      <div className="mt-6">
        <ProductsTable initialProducts={products} categories={categories} />
      </div>
    </div>
  );
}

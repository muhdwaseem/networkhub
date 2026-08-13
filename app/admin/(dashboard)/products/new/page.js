import { getCategories, getBrands } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";

export const metadata = { title: "Add Product" };

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([getCategories(), getBrands()]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Add Product</h1>
      <div className="mt-6 max-w-3xl">
        <ProductForm mode="create" categories={categories} brands={brands} product={null} />
      </div>
    </div>
  );
}

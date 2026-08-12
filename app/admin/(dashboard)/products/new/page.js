import { getCategories } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";

export const metadata = { title: "Add Product" };

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Add Product</h1>
      <div className="mt-6 max-w-3xl">
        <ProductForm mode="create" categories={categories} product={null} />
      </div>
    </div>
  );
}

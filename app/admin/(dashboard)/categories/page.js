import { getCategories, getProducts } from "@/lib/db";
import CategoryManager from "@/components/admin/CategoryManager";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const counts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Categories</h1>
      <p className="mt-1 text-sm text-slate-500">
        Categories with products can&apos;t be deleted until those products are reassigned.
      </p>
      <div className="mt-6">
        <CategoryManager initialCategories={categories} counts={counts} />
      </div>
    </div>
  );
}

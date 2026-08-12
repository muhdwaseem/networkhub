import { notFound } from "next/navigation";
import { getProductById, getCategories } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  return { title: product ? `Edit ${product.name}` : "Edit Product" };
}

export default async function EditProductPage({ params }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProductById(id), getCategories()]);
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Edit Product</h1>
      <div className="mt-6 max-w-3xl">
        <ProductForm mode="edit" categories={categories} product={product} />
      </div>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { getProducts, getCategories } from "@/lib/db";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  const stats = [
    { label: "Total products", value: products.length },
    { label: "In stock", value: products.filter((p) => p.inStock).length },
    { label: "Categories", value: categories.length },
    { label: "Featured", value: products.filter((p) => p.featured).length },
  ];

  const recent = [...products]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">A quick overview of your catalog.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-2xl font-bold text-ink-900">{s.value}</p>
            <p className="mt-1 text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin-networkhub/products/new" className="btn-primary">+ Add Product</Link>
        <Link href="/admin-networkhub/categories" className="btn-secondary">Manage Categories</Link>
        <Link href="/admin-networkhub/settings" className="btn-secondary">Edit Site Settings</Link>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink-900">Recently updated</h2>
          <Link href="/admin-networkhub/products" className="text-sm font-semibold text-brand-700 hover:text-brand-600">
            View all &rarr;
          </Link>
        </div>

        <div className="mt-4 divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200">
          {recent.map((p) => (
            <Link
              key={p.id}
              href={`/admin-networkhub/products/${p.id}/edit`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50"
            >
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                <Image
                  src={p.images?.[0] || "/images/placeholders/accessory.svg"}
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{p.name}</p>
                <p className="text-xs text-slate-500">{p.category}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${p.inStock ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {p.inStock ? "In stock" : "Out of stock"}
              </span>
            </Link>
          ))}
          {recent.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No products yet — add your first one.</p>
          )}
        </div>
      </div>
    </div>
  );
}

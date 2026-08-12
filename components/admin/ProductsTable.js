"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ProductsTable({ initialProducts, categories }) {
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = category === "All" || p.category === category;
      const matchesQuery = !q || [p.name, p.sku, p.brand].join(" ").toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [products, query, category]);

  async function handleDelete(product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setDeletingId(product.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete product.");
      }
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            className="input sm:max-w-xs"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="input sm:max-w-[200px]"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <Link href="/admin/products/new" className="btn-primary shrink-0">
          + Add Product
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-xl ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => (
              <tr key={p.id} className="align-middle">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                      <Image
                        src={p.images?.[0] || "/images/placeholders/accessory.svg"}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium text-ink-900">{p.name}</p>
                      {p.sku && <p className="text-xs text-slate-500">SKU: {p.sku}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.category}</td>
                <td className="px-4 py-3 text-slate-600">{p.price || "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.inStock ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                    }`}
                  >
                    {p.inStock ? "In stock" : "Out of stock"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.featured ? "★" : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/products/${p.id}/edit`} className="btn-secondary btn-sm">
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      disabled={deletingId === p.id}
                      className="btn-danger btn-sm"
                    >
                      {deletingId === p.id ? "..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No products match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

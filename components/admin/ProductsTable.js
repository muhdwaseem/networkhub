"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

export default function ProductsTable({
  products,
  categories,
  total,
  page,
  totalPages,
  initialSearch,
  initialCategory,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  // Local list only so a delete can remove a row immediately without
  // waiting for a full server round-trip — the URL (search/category/page)
  // remains the single source of truth for what's actually being viewed,
  // same pattern as the public ProductsExplorer.
  const [rows, setRows] = useState(products);
  // useState's initial value only applies on first mount — when the URL
  // changes (new page/search/category), the parent Server Component
  // re-fetches and passes a new `products` prop, but this component stays
  // mounted. Re-syncing inside a useEffect would cause an extra render
  // pass; adjusting state directly during render (React's recommended
  // pattern for this) resets it in the same pass instead.
  const [prevProducts, setPrevProducts] = useState(products);
  if (products !== prevProducts) {
    setPrevProducts(products);
    setRows(products);
  }
  const [query, setQuery] = useState(initialSearch);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  function buildUrl(updates) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, value);
    }
    return `/admin-networkhub/products${params.toString() ? `?${params}` : ""}`;
  }

  function applyFilters(updates) {
    startTransition(() => {
      router.push(buildUrl({ ...updates, page: undefined }));
    });
  }

  function goToPage(n) {
    startTransition(() => {
      router.push(buildUrl({ page: n > 1 ? String(n) : undefined }));
    });
  }

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
      setRows((prev) => prev.filter((p) => p.id !== product.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form
          className="flex flex-1 flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters({ q: query });
          }}
        >
          <input
            className="input sm:max-w-xs"
            placeholder="Search products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="input sm:max-w-[200px]"
            defaultValue={initialCategory || "All"}
            onChange={(e) => applyFilters({ category: e.target.value === "All" ? undefined : e.target.value })}
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button type="submit" className="btn-secondary shrink-0">
            Search
          </button>
        </form>
        <Link href="/admin-networkhub/products/new" className="btn-primary shrink-0">
          + Add Product
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div className={`mt-5 overflow-x-auto rounded-xl ring-1 ring-slate-200 ${isPending ? "opacity-60" : ""}`}>
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
            {rows.map((p) => (
              <tr key={p.id} className="align-middle">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                      <Image
                        src={p.imageUrls?.[0] || "/images/placeholders/accessory.svg"}
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
                    <Link href={`/admin-networkhub/products/${p.id}/edit`} className="btn-secondary btn-sm">
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No products match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || isPending}
            className="btn-secondary btn-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages} — {total} total
          </span>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || isPending}
            className="btn-secondary btn-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

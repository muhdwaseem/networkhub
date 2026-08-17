"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";

const UNBRANDED_VALUE = "__unbranded__";
const SEARCH_DEBOUNCE_MS = 400;

export default function ProductsExplorer({
  products,
  categories,
  brands,
  settings,
  total,
  page,
  totalPages,
  initialSearch,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL is the source of truth for category/brand/search/page, so
  // they're derived directly from searchParams each render instead of
  // duplicated into their own state (which would need an effect to stay in
  // sync). The one exception is the search box: it needs to feel responsive
  // to every keystroke, so it gets local state that's debounced into the URL.
  const category = searchParams.get("category") || "All";
  const brand = searchParams.get("brand") || "All";
  const [query, setQuery] = useState(initialSearch || "");
  const debounceRef = useRef(null);

  // Keep the search box in sync when the URL changes from outside our own
  // debounce (browser back/forward, a pasted link with ?q=...). Adjusting
  // state during render (rather than in an effect) avoids the extra
  // render-then-effect pass — see https://react.dev/learn/you-might-not-need-an-effect
  const [prevInitialSearch, setPrevInitialSearch] = useState(initialSearch);
  if (initialSearch !== prevInitialSearch) {
    setPrevInitialSearch(initialSearch);
    setQuery(initialSearch || "");
  }

  function buildUrl(updates) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "All") params.delete(key);
      else params.set(key, value);
    }
    return `/products${params.toString() ? `?${params.toString()}` : ""}`;
  }

  // Filter/search changes replace the current history entry (so typing or
  // flipping chips doesn't spam Back), and always reset to page 1. Explicit
  // page navigation pushes a new entry, since users expect Back to step
  // through pages they've viewed.
  function updateFilters(updates) {
    router.replace(buildUrl({ ...updates, page: undefined }), { scroll: false });
  }

  function selectCategory(cat) {
    updateFilters({ category: cat });
  }

  function selectBrand(b) {
    updateFilters({ brand: b });
  }

  function handleQueryChange(value) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFilters({ q: value.trim() });
    }, SEARCH_DEBOUNCE_MS);
  }

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  function goToPage(n) {
    router.push(buildUrl({ page: n > 1 ? String(n) : undefined }), { scroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const chips = ["All", ...categories];
  const hasUnbranded = products.some((p) => !p.brand);
  const brandOptions = [
    "All",
    ...brands.map((b) => b.name),
    ...(hasUnbranded ? [UNBRANDED_VALUE] : []),
  ];
  const brandLabel = (b) => {
    if (b === "All") return "All brands";
    if (b === UNBRANDED_VALUE) return "Other Products";
    return b;
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => selectCategory(c)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                category === c
                  ? "bg-ink-900 text-white"
                  : "bg-slate-100 text-ink-800 hover:bg-slate-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            className="input sm:w-56"
            value={brand}
            onChange={(e) => selectBrand(e.target.value)}
            aria-label="Filter by brand"
          >
            {brandOptions.map((b) => (
              <option key={b} value={b}>{brandLabel(b)}</option>
            ))}
          </select>
          <div className="w-full sm:w-64">
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search products..."
              className="input"
              aria-label="Search products"
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {total} product{total === 1 ? "" : "s"} found
        {totalPages > 1 ? ` — page ${page} of ${totalPages}` : ""}
      </p>

      {products.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-500">
            No products match your search. Try a different keyword, or WhatsApp us — we may still
            have it in stock.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} settings={settings} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-ink-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-ink-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

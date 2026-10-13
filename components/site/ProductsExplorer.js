"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { groupCategories, categoryLabel } from "@/lib/categoryGroups";
import ProductCard from "./ProductCard";

const UNBRANDED_VALUE = "__unbranded__";
const SEARCH_DEBOUNCE_MS = 400;

// Previous, first, a window around the current page, last, Next — each of
// them a real link. A bare Previous/Next pair means a crawler (and a human
// who wants page 80) needs ~80 hops; the window keeps every page within a
// couple of clicks of the start.
function pageWindow(page, totalPages) {
  const numbers = new Set([1, totalPages]);
  for (let n = page - 2; n <= page + 2; n++) {
    if (n >= 1 && n <= totalPages) numbers.add(n);
  }
  const sorted = [...numbers].sort((a, b) => a - b);

  const items = [{ n: page - 1, label: "Previous", disabled: page <= 1 }];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) items.push("gap");
    items.push({ n, label: String(n) });
  });
  items.push({ n: page + 1, label: "Next", disabled: page >= totalPages });
  return items;
}

// Renders a real <a href> so crawlers can follow it, but lets normal clicks
// go through the in-app transition (dimmed grid, no full reload). Modified
// clicks (new tab, etc.) are left to the browser.
function PageLink({ n, label, current, disabled, href, onNavigate }) {
  const base =
    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors min-w-10 text-center";
  if (disabled) {
    return <span className={`${base} cursor-not-allowed border-slate-200 text-slate-300`}>{label}</span>;
  }
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        onNavigate(n);
      }}
      className={`${base} ${
        current
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-300 text-ink-800 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );
}

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
  // Wrapping every navigation in a transition gives instant tactile feedback
  // (dim the grid, disable pagination) the moment a filter/page is clicked,
  // rather than the page appearing to do nothing for the ~0.5-1.5s server
  // round trip it now takes with a 2000+ row catalog. It also suppresses
  // the route's loading.js full-skeleton flash for these soft navigations —
  // that fallback still covers slow/direct page loads.
  const [isPending, startTransition] = useTransition();
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
    startTransition(() => {
      router.replace(buildUrl({ ...updates, page: undefined }), { scroll: false });
    });
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
    startTransition(() => {
      router.push(buildUrl({ page: n > 1 ? String(n) : undefined }), { scroll: true });
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // 49+ categories don't work as a chip row (it just wraps into an
  // unreadable wall of buttons), so they're grouped into a select with
  // optgroups instead - same idea as the "Browse All Categories" section
  // on the homepage, just in dropdown form to match the brand filter.
  const categoryGroups = groupCategories(categories);
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
        <div className="flex gap-2">
          <select
            className="input sm:w-56"
            value={category}
            onChange={(e) => selectCategory(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="All">All categories</option>
            {categoryGroups.map((group) => (
              <optgroup key={group.name} label={group.name}>
                {group.categories.map((c) => (
                  <option key={c} value={c}>{categoryLabel(c)}</option>
                ))}
              </optgroup>
            ))}
          </select>
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

      <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        {total} product{total === 1 ? "" : "s"} found
        {totalPages > 1 ? ` — page ${page} of ${totalPages}` : ""}
        {isPending && (
          <span className="inline-flex items-center gap-1 text-brand-700" aria-live="polite">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-300 border-t-brand-700" />
            Loading...
          </span>
        )}
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
          <div
            className={`mt-6 grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 ${
              isPending ? "opacity-50" : "opacity-100"
            }`}
          >
            {products.map((p) => (
              <ProductCard key={p.id} product={p} settings={settings} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center justify-center gap-2">
              {pageWindow(page, totalPages).map((item, i) =>
                item === "gap" ? (
                  <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
                ) : (
                  <PageLink
                    key={item.n}
                    n={item.n}
                    label={item.label}
                    current={item.n === page}
                    disabled={item.disabled || isPending}
                    href={buildUrl({ page: item.n > 1 ? String(item.n) : undefined })}
                    onNavigate={goToPage}
                  />
                )
              )}
            </nav>
          )}
        </>
      )}

      {/* Real <a href> links to every category, always present in the page
          HTML. The dropdown above is a <select>, which crawlers can't follow,
          so without this the deeper categories are only discoverable via the
          sitemap, not through the site's own internal links. */}
      <details className="mt-12 rounded-xl border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-ink-900">
          Browse all categories
        </summary>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categoryGroups.map((group) => (
            <div key={group.name}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.name}</h3>
              <ul className="mt-2 space-y-1">
                {group.categories.map((c) => (
                  <li key={c}>
                    <Link
                      href={`/products?category=${encodeURIComponent(c)}`}
                      className="text-sm text-brand-700 hover:underline"
                    >
                      {categoryLabel(c)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

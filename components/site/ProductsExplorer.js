"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "./ProductCard";

const UNBRANDED_VALUE = "__unbranded__";

export default function ProductsExplorer({ products, categories, brands, settings }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL is the source of truth for the selected category/brand, so
  // they're derived directly from searchParams each render instead of
  // duplicated into their own state (which would need an effect to stay in sync).
  const category = searchParams.get("category") || "All";
  const brand = searchParams.get("brand") || "All";
  const [query, setQuery] = useState("");

  function selectCategory(cat) {
    const params = new URLSearchParams(searchParams.toString());
    if (cat === "All") params.delete("category");
    else params.set("category", cat);
    router.replace(`/products${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  function selectBrand(b) {
    const params = new URLSearchParams(searchParams.toString());
    if (b === "All") params.delete("brand");
    else params.set("brand", b);
    router.replace(`/products${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = category === "All" || p.category === category;
      const matchesBrand =
        brand === "All" ||
        (brand === UNBRANDED_VALUE ? !p.brand : p.brand === brand);
      const matchesQuery =
        !q ||
        [p.name, p.brand, p.category, p.sku, p.description].join(" ").toLowerCase().includes(q);
      return matchesCategory && matchesBrand && matchesQuery;
    });
  }, [products, category, brand, query]);

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
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="input"
              aria-label="Search products"
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {filtered.length} product{filtered.length === 1 ? "" : "s"} found
      </p>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm text-slate-500">
            No products match your search. Try a different keyword, or WhatsApp us — we may still
            have it in stock.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} settings={settings} />
          ))}
        </div>
      )}
    </div>
  );
}

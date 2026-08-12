"use client";

import { useState } from "react";

export default function CategoryManager({ initialCategories, counts }) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add category.");
      setCategories(data.categories);
      setName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(cat) {
    if (!confirm(`Delete category "${cat}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/categories?name=${encodeURIComponent(cat)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete category.");
      setCategories(data.categories);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-3">
        <input
          className="input"
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={busy} className="btn-primary shrink-0">
          Add
        </button>
      </form>

      <ul className="mt-6 divide-y divide-slate-200 rounded-xl ring-1 ring-slate-200">
        {categories.map((cat) => {
          const count = counts[cat] || 0;
          return (
            <li key={cat} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
              <div>
                <span className="text-sm font-medium text-ink-900">{cat}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {count} product{count === 1 ? "" : "s"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(cat)}
                disabled={busy || count > 0}
                title={count > 0 ? "Reassign products before deleting" : undefined}
                className="btn-danger btn-sm"
              >
                Delete
              </button>
            </li>
          );
        })}
        {categories.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">No categories yet.</li>
        )}
      </ul>
    </div>
  );
}

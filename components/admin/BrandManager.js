"use client";

import { useState } from "react";
import Image from "next/image";

function BrandLogo({ brand }) {
  if (brand.logo) {
    return (
      <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
        <Image src={brand.logo} alt="" fill sizes="36px" className="object-contain p-1" />
      </span>
    );
  }
  const initials = brand.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
      {initials}
    </span>
  );
}

function TypeBadge({ type }) {
  return (
    <span
      className={`badge ${
        type === "passive" ? "bg-slate-100 text-slate-600" : "bg-brand-50 text-brand-700"
      }`}
    >
      {type === "passive" ? "Passive" : "Active"}
    </span>
  );
}

export default function BrandManager({ initialBrands, counts }) {
  const [brands, setBrands] = useState(initialBrands);
  const [name, setName] = useState("");
  const [type, setType] = useState("active");
  const [logoFile, setLogoFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("active");
  const [editLogoFile, setEditLogoFile] = useState(null);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("name", trimmed);
      formData.set("type", type);
      if (logoFile) formData.set("logo", logoFile);
      const res = await fetch("/api/admin/brands", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add brand.");
      setBrands(data.brands);
      setName("");
      setType("active");
      setLogoFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(brand) {
    setEditingId(brand.id);
    setEditName(brand.name);
    setEditType(brand.type);
    setEditLogoFile(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("name", trimmed);
      formData.set("type", editType);
      if (editLogoFile) formData.set("logo", editLogoFile);
      const res = await fetch(`/api/admin/brands/${id}`, { method: "PUT", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save brand.");
      setBrands((prev) => prev.map((b) => (b.id === id ? data.brand : b)));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(brand) {
    if (!confirm(`Delete brand "${brand.name}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/brands/${brand.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete brand.");
      setBrands(data.brands);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          className="input"
          placeholder="New brand name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select className="input sm:w-36" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="active">Active</option>
          <option value="passive">Passive</option>
        </select>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 sm:w-56"
        />
        <button type="submit" disabled={busy} className="btn-primary shrink-0">
          Add
        </button>
      </form>

      <ul className="mt-6 divide-y divide-slate-200 rounded-xl ring-1 ring-slate-200">
        {brands.map((brand) => {
          const count = counts[brand.name] || 0;
          const isEditing = editingId === brand.id;

          if (isEditing) {
            return (
              <li key={brand.id} className="flex flex-col gap-3 bg-white px-4 py-3 sm:flex-row sm:items-center">
                <input
                  className="input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <select className="input sm:w-36" value={editType} onChange={(e) => setEditType(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="passive">Passive</option>
                </select>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(e) => setEditLogoFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 sm:w-56"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveEdit(brand.id)} disabled={busy} className="btn-primary btn-sm">
                    Save
                  </button>
                  <button type="button" onClick={cancelEdit} className="btn-secondary btn-sm">
                    Cancel
                  </button>
                </div>
              </li>
            );
          }

          return (
            <li key={brand.id} className="flex items-center justify-between gap-3 bg-white px-4 py-3">
              <div className="flex items-center gap-3">
                <BrandLogo brand={brand} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-900">{brand.name}</span>
                    <TypeBadge type={brand.type} />
                  </div>
                  <span className="text-xs text-slate-500">
                    {count} product{count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => startEdit(brand)} className="btn-secondary btn-sm">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(brand)}
                  disabled={busy || count > 0}
                  title={count > 0 ? "Reassign products before deleting" : undefined}
                  className="btn-danger btn-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
        {brands.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-500">No brands yet.</li>
        )}
      </ul>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const NEW_CATEGORY_VALUE = "__new__";
const NEW_BRAND_VALUE = "__new__";

export default function ProductForm({ mode, product, categories, brands }) {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [fields, setFields] = useState({
    name: product?.name || "",
    category: product?.category || categories[0] || "",
    brand: product?.brand || "",
    sku: product?.sku || "",
    price: product?.price || "",
    description: product?.description || "",
    specs: (product?.specs || []).join("\n"),
    inStock: product?.inStock ?? true,
    featured: product?.featured ?? false,
  });
  const [newCategory, setNewCategory] = useState("");
  const [usingNewCategory, setUsingNewCategory] = useState(categories.length === 0);
  const [newBrand, setNewBrand] = useState({ name: "", type: "active" });
  const [usingNewBrand, setUsingNewBrand] = useState(false);

  // `path` is the stable value stored in the database and resubmitted via
  // keepImages on save; `previewUrl` is a short-lived signed URL only used
  // to actually render the thumbnail (the bucket is private, so the raw
  // path alone isn't a fetchable image src).
  const [existingImages, setExistingImages] = useState(
    (product?.images || []).map((path, i) => ({
      path,
      previewUrl: product?.imageUrls?.[i] || path,
      keep: true,
    }))
  );
  const [newFiles, setNewFiles] = useState([]); // [{ file, previewUrl }]

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => newFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(field) {
    return (e) => {
      const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setFields((f) => ({ ...f, [field]: value }));
    };
  }

  function handleCategoryChange(e) {
    const value = e.target.value;
    if (value === NEW_CATEGORY_VALUE) {
      setUsingNewCategory(true);
    } else {
      setUsingNewCategory(false);
      setFields((f) => ({ ...f, category: value }));
    }
  }

  function handleBrandChange(e) {
    const value = e.target.value;
    if (value === NEW_BRAND_VALUE) {
      setUsingNewBrand(true);
    } else {
      setUsingNewBrand(false);
      setFields((f) => ({ ...f, brand: value }));
    }
  }

  function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    const withPreviews = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setNewFiles((prev) => [...prev, ...withPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeNewFile(index) {
    setNewFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function toggleExistingImage(index) {
    setExistingImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, keep: !img.keep } : img))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    let category = fields.category;
    if (usingNewCategory) {
      const trimmed = newCategory.trim();
      if (!trimmed) {
        setError("Enter a name for the new category.");
        return;
      }
      category = trimmed;
    }
    let brand = fields.brand;
    if (usingNewBrand) {
      const trimmed = newBrand.name.trim();
      if (!trimmed) {
        setError("Enter a name for the new brand.");
        return;
      }
      brand = trimmed;
    }
    if (!fields.name.trim()) {
      setError("Product name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (usingNewCategory) {
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: category }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create category.");
        }
      }

      if (usingNewBrand) {
        const bf = new FormData();
        bf.set("name", brand);
        bf.set("type", newBrand.type);
        const res = await fetch("/api/admin/brands", { method: "POST", body: bf });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create brand.");
        }
      }

      const formData = new FormData();
      formData.set("name", fields.name.trim());
      formData.set("category", category);
      formData.set("brand", brand);
      formData.set("sku", fields.sku);
      formData.set("price", fields.price);
      formData.set("description", fields.description);
      formData.set("specs", fields.specs);
      if (fields.inStock) formData.set("inStock", "on");
      if (fields.featured) formData.set("featured", "on");
      newFiles.forEach(({ file }) => formData.append("images", file));
      if (mode === "edit") {
        existingImages.filter((img) => img.keep).forEach((img) => formData.append("keepImages", img.path));
      }

      const url = mode === "edit" ? `/api/admin/products/${product.id}` : "/api/admin/products";
      const method = mode === "edit" ? "PUT" : "POST";
      const res = await fetch(url, { method, body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save product.");
      }

      router.push("/admin-networkhub/products");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <section className="card space-y-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Basic information
        </h2>

        <div>
          <label className="label" htmlFor="name">Product name</label>
          <input id="name" className="input" value={fields.name} onChange={update("name")} required />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select
              id="category"
              className="input"
              value={usingNewCategory ? NEW_CATEGORY_VALUE : fields.category}
              onChange={handleCategoryChange}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value={NEW_CATEGORY_VALUE}>+ Add new category...</option>
            </select>
            {usingNewCategory && (
              <input
                className="input mt-2"
                placeholder="New category name"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
            )}
          </div>
          <div>
            <label className="label" htmlFor="brand">Brand</label>
            <select
              id="brand"
              className="input"
              value={usingNewBrand ? NEW_BRAND_VALUE : fields.brand}
              onChange={handleBrandChange}
            >
              <option value="">No brand</option>
              <optgroup label="Active Brands">
                {brands.filter((b) => b.type === "active").map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </optgroup>
              <optgroup label="Passive Brands">
                {brands.filter((b) => b.type === "passive").map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </optgroup>
              <option value={NEW_BRAND_VALUE}>+ Add new brand...</option>
            </select>
            {usingNewBrand && (
              <div className="mt-2 flex gap-2">
                <input
                  className="input"
                  placeholder="New brand name"
                  value={newBrand.name}
                  onChange={(e) => setNewBrand((b) => ({ ...b, name: e.target.value }))}
                />
                <select
                  className="input w-36 shrink-0"
                  value={newBrand.type}
                  onChange={(e) => setNewBrand((b) => ({ ...b, type: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="passive">Passive</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sku">SKU (optional)</label>
            <input id="sku" className="input" value={fields.sku} onChange={update("sku")} />
          </div>
          <div>
            <label className="label" htmlFor="price">Price (optional)</label>
            <input
              id="price"
              className="input"
              value={fields.price}
              onChange={update("price")}
              placeholder="Leave blank for 'Contact for price'"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input type="checkbox" checked={fields.inStock} onChange={update("inStock")} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
            In stock
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-800">
            <input type="checkbox" checked={fields.featured} onChange={update("featured")} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
            Featured on homepage
          </label>
        </div>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Description &amp; specs
        </h2>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" className="input min-h-24" value={fields.description} onChange={update("description")} />
        </div>
        <div>
          <label className="label" htmlFor="specs">Key specs (one per line)</label>
          <textarea
            id="specs"
            className="input min-h-28"
            value={fields.specs}
            onChange={update("specs")}
            placeholder={"Intel Core i5, 8GB RAM\n256GB SSD\n14\" display"}
          />
          <p className="field-hint">Shown as a bullet list on the product page.</p>
        </div>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Images</h2>

        {existingImages.length > 0 && (
          <div>
            <p className="field-hint mb-2">Uncheck an image to remove it when you save.</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {existingImages.map((img, i) => (
                <label key={img.path} className={`relative block aspect-square overflow-hidden rounded-lg ring-2 ${img.keep ? "ring-brand-600" : "ring-slate-200 opacity-40"}`}>
                  <Image src={img.previewUrl} alt="" fill sizes="120px" className="object-cover" />
                  <input
                    type="checkbox"
                    checked={img.keep}
                    onChange={() => toggleExistingImage(i)}
                    className="absolute right-1.5 top-1.5 h-4 w-4 rounded border-white"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label" htmlFor="images">Add images</label>
          <input
            id="images"
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            onChange={handleFilesSelected}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
          />
          <p className="field-hint">JPG, PNG, WebP or GIF — up to 8MB each.</p>
        </div>

        {newFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {newFiles.map((f, i) => (
              <div key={f.previewUrl} className="relative aspect-square overflow-hidden rounded-lg ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeNewFile(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                  aria-label="Remove image"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving..." : mode === "edit" ? "Save changes" : "Create product"}
        </button>
        <button type="button" onClick={() => router.push("/admin-networkhub/products")} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}

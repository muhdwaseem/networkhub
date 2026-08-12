"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsForm({ settings }) {
  const router = useRouter();
  const [fields, setFields] = useState({
    businessName: settings.businessName || "",
    tagline: settings.tagline || "",
    description: settings.description || "",
    whatsappNumber: settings.whatsappNumber || "",
    email: settings.email || "",
    phoneDisplay: settings.phoneDisplay || "",
    address: settings.address || "",
    businessHours: settings.businessHours || "",
    facebook: settings.socials?.facebook || "",
    instagram: settings.socials?.instagram || "",
    linkedin: settings.socials?.linkedin || "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [heroFile, setHeroFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(settings.logo);
  const [heroPreview, setHeroPreview] = useState(settings.heroImage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(field) {
    return (e) => setFields((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleHeroChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHeroFile(file);
    setHeroPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);
    try {
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
      if (logoFile) formData.set("logo", logoFile);
      if (heroFile) formData.set("heroImage", heroFile);

      const res = await fetch("/api/admin/settings", { method: "PUT", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save settings.");

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200">
          Settings saved.
        </div>
      )}

      <section className="card space-y-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Business details
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="businessName">Business name</label>
            <input id="businessName" className="input" value={fields.businessName} onChange={update("businessName")} required />
          </div>
          <div>
            <label className="label" htmlFor="tagline">Tagline</label>
            <input id="tagline" className="input" value={fields.tagline} onChange={update("tagline")} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" className="input min-h-24" value={fields.description} onChange={update("description")} />
          <p className="field-hint">Used on the About page and as the site&apos;s meta description.</p>
        </div>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Contact &amp; enquiries
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="whatsappNumber">WhatsApp number</label>
            <input
              id="whatsappNumber"
              className="input"
              value={fields.whatsappNumber}
              onChange={update("whatsappNumber")}
              placeholder="971500000000"
            />
            <p className="field-hint">Digits only, with country code, no + or spaces.</p>
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" value={fields.email} onChange={update("email")} />
          </div>
          <div>
            <label className="label" htmlFor="phoneDisplay">Phone (displayed)</label>
            <input id="phoneDisplay" className="input" value={fields.phoneDisplay} onChange={update("phoneDisplay")} />
          </div>
          <div>
            <label className="label" htmlFor="businessHours">Business hours</label>
            <input id="businessHours" className="input" value={fields.businessHours} onChange={update("businessHours")} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="address">Address</label>
          <input id="address" className="input" value={fields.address} onChange={update("address")} />
        </div>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Social links (optional)
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="facebook">Facebook</label>
            <input id="facebook" className="input" value={fields.facebook} onChange={update("facebook")} placeholder="https://facebook.com/..." />
          </div>
          <div>
            <label className="label" htmlFor="instagram">Instagram</label>
            <input id="instagram" className="input" value={fields.instagram} onChange={update("instagram")} placeholder="https://instagram.com/..." />
          </div>
          <div>
            <label className="label" htmlFor="linkedin">LinkedIn</label>
            <input id="linkedin" className="input" value={fields.linkedin} onChange={update("linkedin")} placeholder="https://linkedin.com/..." />
          </div>
        </div>
      </section>

      <section className="card space-y-6 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Branding</h2>

        <div className="flex items-center gap-5">
          <div className="relative flex h-16 w-40 items-center justify-center overflow-hidden rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {logoPreview && <img src={logoPreview} alt="Logo preview" className="max-h-full max-w-full object-contain" />}
          </div>
          <div>
            <label className="label" htmlFor="logo">Logo</label>
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="block text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="relative h-16 w-24 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {heroPreview && <img src={heroPreview} alt="Hero preview" className="h-full w-full object-cover" />}
          </div>
          <div>
            <label className="label" htmlFor="heroImage">Homepage hero image</label>
            <input
              id="heroImage"
              type="file"
              accept="image/*"
              onChange={handleHeroChange}
              className="block text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
        </div>
      </section>

      <button type="submit" disabled={submitting} className="btn-primary">
        {submitting ? "Saving..." : "Save settings"}
      </button>
    </form>
  );
}

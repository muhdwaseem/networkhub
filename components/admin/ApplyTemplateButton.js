"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApplyTemplateButton({ type, count }) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleApply() {
    if (count === 0) return;
    if (!confirm(`Apply the smart SEO template to all ${count} affected products? This updates them directly — you can still edit any individual product afterward.`)) {
      return;
    }
    setApplying(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/seo-templates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to apply templates.");
      setResult(data.applied);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleApply}
        disabled={applying || count === 0}
        className="btn-primary shrink-0 disabled:opacity-50"
      >
        {applying ? "Applying..." : `Apply to all ${count}`}
      </button>
      {result !== null && (
        <p className="text-xs text-emerald-700">Applied to {result} products.</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

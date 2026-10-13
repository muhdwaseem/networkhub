"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TITLE_MAX = 70;
const DESCRIPTION_MAX = 160;

// items: [{ id, name, category, issues: string[] }] — one page of the queue.
export default function AiSeoReview({ items }) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rows, setRows] = useState(null); // null until generated
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function generate() {
    setGenerating(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/seo-ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: items.map((i) => i.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to generate suggestions.");
      setRows(
        data.results.map((r) => {
          const meta = items.find((i) => i.id === r.id);
          if (r.error) return { id: r.id, name: meta?.name, error: r.error };
          const warnings = r.suggestion.warnings || [];
          return {
            id: r.id,
            name: r.name,
            currentTitle: r.currentTitle,
            currentDescription: r.currentDescription,
            seoTitle: r.suggestion.seoTitle,
            metaDescription: r.suggestion.metaDescription,
            warnings,
            // Anything the checks flagged starts unticked: approving it is a
            // deliberate choice, not the default.
            include: warnings.length === 0,
          };
        })
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function patchRow(id, patch) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const selected = (rows || []).filter((r) => !r.error && r.include);
  const invalid = selected.some(
    (r) => !r.seoTitle.trim() || !r.metaDescription.trim() || r.seoTitle.length > TITLE_MAX || r.metaDescription.length > DESCRIPTION_MAX
  );

  async function apply() {
    setApplying(true);
    setError("");
    try {
      const res = await fetch("/api/admin/seo-ai/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map((r) => ({ id: r.id, seoTitle: r.seoTitle, metaDescription: r.metaDescription })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to apply.");
      setNotice(`Saved ${data.applied} product${data.applied === 1 ? "" : "s"}.`);
      setRows(null);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={generate} disabled={generating || items.length === 0}>
          {generating ? "Generating…" : `Generate AI suggestions for these ${items.length}`}
        </button>
        {notice && <span className="text-sm text-emerald-700">{notice}</span>}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <div className="divide-y divide-slate-100 rounded-xl bg-white ring-1 ring-slate-200">
        {!rows &&
          items.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-ink-900">{i.name}</p>
                <p className="text-xs text-slate-500">{i.category}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {i.issues.map((label) => (
                  <span key={label} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ))}

        {rows &&
          rows.map((r) =>
            r.error ? (
              <div key={r.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-ink-900">{r.name || r.id}</p>
                <p className="text-red-600">Could not generate: {r.error}</p>
              </div>
            ) : (
              <div key={r.id} className="space-y-2 px-4 py-4 text-sm">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={r.include}
                    onChange={(e) => patchRow(r.id, { include: e.target.checked })}
                  />
                  <span className="font-medium text-ink-900">{r.name}</span>
                </label>
                <div className="ml-7 space-y-2">
                  <p className="text-xs text-slate-500">
                    Now: <span className="text-red-600">{r.currentTitle}</span>
                  </p>
                  <input
                    className="input"
                    value={r.seoTitle}
                    onChange={(e) => patchRow(r.id, { seoTitle: e.target.value })}
                    aria-label="SEO title"
                  />
                  <p className={`text-xs ${r.seoTitle.length > TITLE_MAX ? "text-red-600" : "text-slate-400"}`}>
                    {r.seoTitle.length}/{TITLE_MAX}
                  </p>
                  <textarea
                    className="input min-h-16"
                    value={r.metaDescription}
                    onChange={(e) => patchRow(r.id, { metaDescription: e.target.value })}
                    aria-label="Meta description"
                  />
                  <p className={`text-xs ${r.metaDescription.length > DESCRIPTION_MAX ? "text-red-600" : "text-slate-400"}`}>
                    {r.metaDescription.length}/{DESCRIPTION_MAX}
                  </p>
                  {r.warnings.map((w) => (
                    <p key={w} className="text-xs text-amber-700">⚠ {w}</p>
                  ))}
                </div>
              </div>
            )
          )}
      </div>

      {rows && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" disabled={applying || selected.length === 0 || invalid} onClick={apply}>
            {applying ? "Saving…" : `Save ${selected.length} approved`}
          </button>
          <button type="button" className="btn-secondary" disabled={applying} onClick={() => setRows(null)}>
            Discard suggestions
          </button>
          <span className="text-xs text-slate-500">
            Nothing is saved until you click Save. Rows with warnings start unticked.
          </span>
        </div>
      )}
    </div>
  );
}

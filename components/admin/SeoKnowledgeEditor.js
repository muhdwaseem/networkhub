"use client";

import { useState } from "react";

export default function SeoKnowledgeEditor({ initialText, defaultText }) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(valueToSave) {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/seo-ai/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: valueToSave }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      setMessage("Saved. New suggestions will use this.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card space-y-3 p-6">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">Knowledge base</h2>
        <p className="mt-1 text-sm text-slate-500">
          Facts and rules the AI must stay inside when it writes. The more accurate this is about how
          you describe your business — what you sell, how customers order, what you never claim — the
          better and safer the suggestions. Product specs are supplied automatically.
        </p>
      </div>
      <textarea
        className="input min-h-56 font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={4000}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={saving} onClick={() => save(text)}>
          {saving ? "Saving..." : "Save knowledge base"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={() => {
            setText(defaultText);
            save("");
          }}
        >
          Reset to default
        </button>
        <span className="text-xs text-slate-400">{text.length}/4000</span>
        {message && <span className="text-xs text-emerald-700">{message}</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";

export default function ContactForm({ settings }) {
  const [form, setForm] = useState({ name: "", email: "", message: "", company: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function buildWhatsApp() {
    const text = `Hi ${settings.businessName}, my name is ${form.name || "—"}.\n\n${form.message}`;
    const digits = (settings.whatsappNumber || "").replace(/[^0-9]/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  const canSendWhatsApp = form.message.trim().length > 0;
  const canSendEmail = form.message.trim().length > 0 && form.email.trim().length > 0;

  async function handleEmailSend() {
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send. Please try WhatsApp instead.");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  if (status === "sent") {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold text-ink-900">Message sent</p>
        <p className="mt-2 text-sm text-slate-600">
          Thanks, {form.name || "there"} — we&apos;ll reply to {form.email} shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="card space-y-4 p-6">
      {status === "error" && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="label">Your name</label>
        <input id="name" className="input" value={form.name} onChange={update("name")} placeholder="Jane Doe" />
      </div>
      <div>
        <label htmlFor="email" className="label">Your email</label>
        <input id="email" type="email" className="input" value={form.email} onChange={update("email")} placeholder="jane@company.com" />
        <p className="field-hint">Required to send by email, so we can reply to you.</p>
      </div>
      <div>
        <label htmlFor="message" className="label">Message</label>
        <textarea
          id="message"
          className="input min-h-32"
          value={form.message}
          onChange={update("message")}
          placeholder="Tell us what you're looking for..."
        />
      </div>

      {/* Honeypot field — hidden from real visitors, bots often fill every field */}
      <input
        type="text"
        value={form.company}
        onChange={update("company")}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={canSendWhatsApp ? buildWhatsApp() : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!canSendWhatsApp}
          onClick={(e) => { if (!canSendWhatsApp) e.preventDefault(); }}
          className="btn-whatsapp flex-1"
        >
          Send via WhatsApp
        </a>
        <button
          type="button"
          onClick={handleEmailSend}
          disabled={!canSendEmail || status === "sending"}
          className="btn-secondary flex-1"
        >
          {status === "sending" ? "Sending..." : "Send via Email"}
        </button>
      </div>
      <p className="field-hint">
        WhatsApp opens your WhatsApp app with the message pre-filled. Email sends directly from
        this page to {settings.businessName}.
      </p>
    </form>
  );
}

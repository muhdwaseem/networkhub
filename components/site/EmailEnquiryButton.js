"use client";

import { useEffect, useState } from "react";

export default function EmailEnquiryButton({ productName, className = "btn-secondary", label = "Email", children, "aria-label": ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    productName
      ? `Hi, I'm interested in: ${productName}. Could you share price and availability?`
      : "Hi, I'd like to enquire about your products."
  );
  const [company, setCompany] = useState(""); // honeypot — must stay empty
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message, productName, company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send. Please try WhatsApp instead.");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err.message);
    }
  }

  function close() {
    setOpen(false);
    // Reset a moment after the close animation-less unmount so the form
    // doesn't visibly flash back to "idle" while it's still closing.
    setTimeout(() => {
      setStatus("idle");
      setError("");
    }, 150);
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} aria-label={ariaLabel}>
        {children || label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className="absolute inset-0 cursor-default"
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              &times;
            </button>

            {status === "sent" ? (
              <div className="py-6 text-center">
                <p className="text-lg font-semibold text-ink-900">Enquiry sent</p>
                <p className="mt-2 text-sm text-slate-600">
                  Thanks — we&apos;ll get back to you by email shortly.
                </p>
                <button type="button" onClick={close} className="btn-secondary mt-5">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-semibold text-ink-900">
                  {productName ? `Enquire about ${productName}` : "Send an enquiry"}
                </h3>

                {status === "error" && (
                  <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
                    {error}
                  </div>
                )}

                <div>
                  <label className="label" htmlFor="enquiry-email">Your email</label>
                  <input
                    id="enquiry-email"
                    type="email"
                    required
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                  <p className="field-hint">So we can reply directly to you.</p>
                </div>

                <div>
                  <label className="label" htmlFor="enquiry-message">Message</label>
                  <textarea
                    id="enquiry-message"
                    className="input min-h-24"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                {/* Honeypot field — hidden from real visitors via CSS, bots often fill every field */}
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="hidden"
                  aria-hidden="true"
                />

                <button type="submit" disabled={status === "sending"} className="btn-primary w-full">
                  {status === "sending" ? "Sending..." : "Send enquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Central place to resolve the site's own public URL — used by sitemap.js,
// robots.js, and JSON-LD so every generated absolute URL stays consistent
// once a custom domain is added, without hunting down each call site.
export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  // Vercel sets this automatically on every deployment (preview or
  // production) even before a custom domain/env var is configured.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// Product.price is free text (e.g. "AED 250" or "Contact for price") since
// admins type it directly — not a structured number. Only emit a numeric
// price for JSON-LD when one can be confidently extracted; otherwise
// Google Search Console flags the page for invalid/missing price rather
// than just skipping rich-result eligibility for it.
export function parsePriceValue(priceText) {
  if (!priceText) return null;
  const match = priceText.replace(/,/g, "").match(/(\d+(\.\d+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

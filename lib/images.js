import { resolveImageUrl } from "./upload";

// Signs display URLs for a list of products/brands/settings WITHOUT
// mutating the raw stored value (paths, not URLs, are what admin forms
// round-trip on save — see lib/upload.js's resolveImageUrl comment). Call
// these once per Server Component fetch, right before rendering; never
// inside lib/db.js's own read functions, or a signed URL could get saved
// back into the database as if it were the stable path.

export async function withResolvedProductImages(products) {
  return Promise.all(
    products.map(async (p) => ({
      ...p,
      imageUrls: await Promise.all((p.images || []).map(resolveImageUrl)),
    }))
  );
}

export async function withResolvedProductImage(product) {
  if (!product) return product;
  return { ...product, imageUrls: await Promise.all((product.images || []).map(resolveImageUrl)) };
}

export async function withResolvedBrandLogos(brands) {
  return Promise.all(
    brands.map(async (b) => ({ ...b, logoUrl: await resolveImageUrl(b.logo) }))
  );
}

export async function withResolvedSettingsImages(settings) {
  const [logoUrl, heroImageUrl] = await Promise.all([
    resolveImageUrl(settings.logo),
    resolveImageUrl(settings.heroImage),
  ]);
  return { ...settings, logoUrl, heroImageUrl };
}

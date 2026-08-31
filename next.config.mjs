/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel's Hobby (free) plan caps Image Optimization at 1,000 source
    // images/month. This catalog has ~2,900 products, each going through
    // the optimizer on every /_next/image request - confirmed hitting that
    // cap in production (every product image site-wide returning 402
    // "OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED" until the monthly reset).
    // Disabling optimization serves the already-reasonably-sized Supabase
    // images directly instead, at the cost of no server-side resize/WebP
    // conversion - a fine trade for a free-tier deployment this size. If
    // this ever moves to Vercel Pro (much higher quota), flip this back off
    // to regain automatic resizing/format conversion; remotePatterns below
    // is left in place for that switch-back.
    unoptimized: true,
    // Only the built-in logo/placeholder SVGs under public/images/ go through
    // next/image — product uploads can no longer be SVG (see lib/upload.js).
    // Next still requires this flag to optimize any SVG, and applies its own
    // sandboxing CSP to the optimizer's SVG responses when it's set.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Required for next/image to optimize product/brand images uploaded to
    // Supabase Storage — without this, remote images from this host are
    // rejected outright rather than just skipping optimization. Covers both
    // "public/**" and "sign/**" since the "images" bucket is private and
    // every URL is a signed one (see lib/upload.js's resolveImageUrl).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dafjnjvtxnadztvvjsnc.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
};

export default nextConfig;

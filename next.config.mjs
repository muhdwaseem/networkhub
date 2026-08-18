/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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

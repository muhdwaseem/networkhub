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
  },
};

export default nextConfig;

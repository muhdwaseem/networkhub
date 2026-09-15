import { getSiteUrl } from "@/lib/seo";

// Next.js serves whatever this returns at /robots.txt automatically.
export default function robots() {
  const siteUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin-networkhub/", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

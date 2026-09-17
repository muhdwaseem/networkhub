import { getSettings, getCategories } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo";

// Serves /llms.txt following the emerging llms.txt convention (llmstxt.org)
// — a plain-text index that helps AI assistants/crawlers (ChatGPT,
// Perplexity, etc.) understand and correctly cite the site, the same way
// robots.txt/sitemap.xml serve traditional search crawlers. Not a Next.js
// built-in convention (unlike robots.js/sitemap.js), so this is a plain
// route handler under a literal "llms.txt" folder.
export async function GET() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);
  const siteUrl = getSiteUrl();

  const lines = [
    `# ${settings.businessName}`,
    "",
    `> ${settings.description || settings.tagline}`,
    "",
    `${settings.businessName} supplies networking, IT and security equipment to businesses ` +
      `across the UAE. There is no online checkout — every enquiry is handled directly via ` +
      `WhatsApp${settings.whatsappNumber ? ` (+${settings.whatsappNumber})` : ""} or email` +
      `${settings.email ? ` (${settings.email})` : ""}.`,
    "",
    "## Site",
    `- [Homepage](${siteUrl}/): business overview and featured products`,
    `- [Full product catalog](${siteUrl}/products): browse and filter every product by category or brand`,
    `- [About](${siteUrl}/about): company background`,
    `- [Contact](${siteUrl}/contact): WhatsApp/email enquiry options and business details`,
    `- [Sitemap](${siteUrl}/sitemap.xml): machine-readable list of every product and category page`,
    "",
    "## Product categories",
    ...categories.map((name) => `- [${name}](${siteUrl}/products?category=${encodeURIComponent(name)})`),
  ];

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

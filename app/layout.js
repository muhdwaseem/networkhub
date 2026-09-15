import { Inter } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/db";
import { withResolvedSettingsImages } from "@/lib/images";
import { getSiteUrl } from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Every page reads live data from data/*.json via plain fs calls, which Next
// can't detect for its automatic static/dynamic analysis (unlike fetch()).
// Force dynamic rendering everywhere so admin edits show up immediately
// instead of a stale build-time snapshot.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const settings = await getSettings();
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: `${settings.businessName} | ${settings.tagline}`,
      template: `%s | ${settings.businessName}`,
    },
    description: settings.description || settings.tagline,
  };
}

export default async function RootLayout({ children }) {
  const rawSettings = await getSettings();
  const settings = await withResolvedSettingsImages(rawSettings);
  const siteUrl = getSiteUrl();
  // logoUrl is either a fully-resolved Supabase signed URL (admin-uploaded)
  // or null when it's still the default "/images/logo.png" local asset —
  // resolveImageUrl only handles storage keys, so fall back to making that
  // default path absolute ourselves.
  const logoUrl = settings.logoUrl || `${siteUrl}${rawSettings.logo || "/images/logo.png"}`;
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.businessName,
    url: siteUrl,
    description: settings.description || settings.tagline || undefined,
    email: settings.email || undefined,
    telephone: settings.phoneDisplay || undefined,
    address: settings.address ? { "@type": "PostalAddress", streetAddress: settings.address } : undefined,
    logo: logoUrl,
  };

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-ink-900 font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}

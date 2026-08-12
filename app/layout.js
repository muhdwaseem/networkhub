import { Inter } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/lib/db";

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
    title: {
      default: `${settings.businessName} | ${settings.tagline}`,
      template: `%s | ${settings.businessName}`,
    },
    description: settings.description || settings.tagline,
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-ink-900 font-sans">{children}</body>
    </html>
  );
}

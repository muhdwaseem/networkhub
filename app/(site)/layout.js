import { getSettings } from "@/lib/db";
import { withResolvedSettingsImages } from "@/lib/images";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import WhatsAppFloat from "@/components/site/WhatsAppFloat";

export default async function SiteLayout({ children }) {
  const settings = await withResolvedSettingsImages(await getSettings());

  return (
    <>
      <Header settings={settings} />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <WhatsAppFloat settings={settings} />
    </>
  );
}

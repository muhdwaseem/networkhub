import Link from "next/link";
import Image from "next/image";
import { getCategories } from "@/lib/db";
import { waLink, mailLink } from "@/lib/enquiry";

export default async function Footer({ settings }) {
  const categories = await getCategories();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-ink-900 text-slate-300">
      <div className="container-page grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src={settings.logo}
            alt={settings.businessName}
            width={160}
            height={40}
            className="h-9 w-auto brightness-0 invert"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            {settings.description || settings.tagline}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Categories</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {categories.slice(0, 6).map((cat) => (
              <li key={cat}>
                <Link
                  href={`/products?category=${encodeURIComponent(cat)}`}
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Quick Links</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/products" className="text-slate-400 transition-colors hover:text-white">All Products</Link>
            </li>
            <li>
              <Link href="/about" className="text-slate-400 transition-colors hover:text-white">About Us</Link>
            </li>
            <li>
              <Link href="/contact" className="text-slate-400 transition-colors hover:text-white">Contact</Link>
            </li>
            <li>
              <Link href="/admin/login" className="text-slate-500 transition-colors hover:text-white">Admin Login</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            {settings.address && <li>{settings.address}</li>}
            {settings.phoneDisplay && <li>{settings.phoneDisplay}</li>}
            {settings.email && (
              <li>
                <a href={mailLink(settings)} className="transition-colors hover:text-white">
                  {settings.email}
                </a>
              </li>
            )}
            {settings.whatsappNumber && (
              <li>
                <a
                  href={waLink(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-white"
                >
                  Chat on WhatsApp
                </a>
              </li>
            )}
            {settings.businessHours && <li className="text-slate-500">{settings.businessHours}</li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-slate-500 sm:flex-row">
          <p>&copy; {year} {settings.businessName}. All rights reserved.</p>
          <p>Enquire by WhatsApp or email — no account or checkout needed.</p>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import Image from "next/image";
import { getCategories } from "@/lib/db";
import { waLink } from "@/lib/enquiry";
import { IconMail } from "./icons";
import EmailEnquiryButton from "./EmailEnquiryButton";

function IconWhatsapp(p) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" {...p}>
      <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.34.65 4.53 1.78 6.4L4 29l7.78-1.74A11.94 11.94 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.6c-1.98 0-3.83-.55-5.41-1.5l-.39-.23-4.62 1.03 1.05-4.5-.25-.4A9.55 9.55 0 0 1 5.6 15c0-5.19 4.22-9.4 9.4-9.4 5.19 0 9.4 4.21 9.4 9.4 0 5.19-4.21 9.6-9.4 9.6Zm5.15-7.03c-.28-.14-1.66-.82-1.92-.91-.26-.1-.44-.14-.63.14-.18.28-.72.91-.88 1.1-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.24-1.4-.83-.74-1.39-1.66-1.55-1.94-.16-.28-.02-.43.12-.57.13-.13.28-.32.42-.49.14-.16.18-.28.28-.46.09-.18.05-.35-.02-.49-.07-.14-.63-1.53-.87-2.1-.23-.55-.46-.48-.63-.49h-.54c-.18 0-.49.07-.74.35-.26.28-.97.95-.97 2.32 0 1.37 1 2.7 1.14 2.88.14.18 1.97 3.01 4.78 4.22.67.29 1.19.46 1.6.59.67.21 1.28.18 1.76.11.54-.08 1.66-.68 1.89-1.33.24-.65.24-1.21.17-1.33-.07-.11-.25-.18-.53-.32Z" />
    </svg>
  );
}

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
          <div className="mt-5 flex gap-3">
            {settings.whatsappNumber && (
              <a
                href={waLink(settings)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-whatsapp"
              >
                <IconWhatsapp className="h-4 w-4" />
              </a>
            )}
            {settings.email && (
              <EmailEnquiryButton
                aria-label="Email"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 transition hover:bg-brand-600"
              >
                <IconMail className="h-4 w-4" />
              </EmailEnquiryButton>
            )}
          </div>
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
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-400">
            {settings.address && <li>{settings.address}</li>}
            {settings.phoneDisplay && <li>{settings.phoneDisplay}</li>}
            {settings.email && (
              <li>
                <EmailEnquiryButton className="text-slate-400 transition-colors hover:text-white">
                  {settings.email}
                </EmailEnquiryButton>
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

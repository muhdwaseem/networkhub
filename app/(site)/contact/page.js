import Link from "next/link";
import { getSettings } from "@/lib/db";
import { waLink, mailLink } from "@/lib/enquiry";
import ContactForm from "@/components/site/ContactForm";

export const metadata = {
  title: "Contact",
  description: "Get in touch by WhatsApp, email or phone.",
};

export default async function ContactPage() {
  const settings = await getSettings();
  const mapsHref = settings.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`
    : null;

  const cards = [
    {
      title: "WhatsApp",
      value: settings.phoneDisplay || "Chat with us",
      href: waLink(settings),
      external: true,
      cta: "Open WhatsApp",
    },
    {
      title: "Email",
      value: settings.email,
      href: mailLink(settings),
      external: false,
      cta: "Send an email",
    },
    {
      title: "Phone",
      value: settings.phoneDisplay,
      href: settings.phoneDisplay ? `tel:${settings.phoneDisplay.replace(/[^0-9+]/g, "")}` : null,
      external: false,
      cta: "Call now",
    },
    {
      title: "Address",
      value: settings.address,
      href: mapsHref,
      external: true,
      cta: "Get directions",
    },
  ].filter((c) => c.value);

  return (
    <div>
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container-page py-14 sm:py-20">
          <span className="badge">Contact</span>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Let&apos;s talk about what you need
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Reach us on WhatsApp or email for the fastest reply
            {settings.businessHours ? ` — ${settings.businessHours}.` : "."}
          </p>
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target={c.external ? "_blank" : undefined}
              rel={c.external ? "noopener noreferrer" : undefined}
              className="card p-5 transition-shadow hover:shadow-md"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {c.title}
              </h3>
              <p className="mt-2 text-sm font-medium text-ink-900">{c.value}</p>
              <span className="mt-3 inline-block text-sm font-semibold text-brand-700">
                {c.cta} &rarr;
              </span>
            </a>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold text-ink-900">Send us a message</h2>
            <p className="mt-2 text-sm text-slate-600">
              Fill in a few details and we&apos;ll pick up the conversation on WhatsApp or email —
              whichever you prefer.
            </p>
            <div className="mt-6">
              <ContactForm settings={settings} />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Business hours
            </h2>
            <p className="mt-2 text-sm text-ink-900">
              {settings.businessHours || "Contact us for availability"}
            </p>

            <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Prefer to browse first?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Every product page has its own WhatsApp and email enquiry buttons, so you can ask
              about a specific item in one click.
            </p>
            <Link href="/products" className="btn-secondary mt-4">
              Browse the catalog
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

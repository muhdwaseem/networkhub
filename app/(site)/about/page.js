import { getSettings } from "@/lib/db";
import { waLink } from "@/lib/enquiry";

export const metadata = {
  title: "About",
  description: "Learn more about who we are and how we work.",
};

const VALUES = [
  {
    title: "Genuine sourcing",
    desc: "We work directly with trusted brands and distributors, so what you order is what arrives.",
  },
  {
    title: "Straightforward pricing",
    desc: "No hidden fees or account sign-ups. Ask on WhatsApp or email and get a clear quote back.",
  },
  {
    title: "Bulk & retail friendly",
    desc: "Whether it's one unit for an office or a bulk order for a project, we quote both the same way.",
  },
  {
    title: "Fast, human replies",
    desc: "Every enquiry is answered by a real person, usually the same working day.",
  },
];

const STATS = [
  { value: "500+", label: "Products supplied" },
  { value: "24h", label: "Typical response time" },
  { value: "Bulk", label: "& retail pricing" },
];

export default async function AboutPage() {
  const settings = await getSettings();

  return (
    <div>
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container-page py-14 sm:py-20">
          <span className="badge">About Us</span>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            About {settings.businessName}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            {settings.description ||
              `${settings.businessName} supplies networking, IT and security equipment to businesses that need genuine products, clear pricing, and a fast reply — not a long checkout process.`}
          </p>
        </div>
      </section>

      <section className="container-page py-14 sm:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-ink-900">How we work</h2>
            <div className="prose-sm mt-4 space-y-4 text-slate-600">
              <p>
                We keep the buying process simple: browse the catalog, message us the product name
                on WhatsApp or email, and we&apos;ll reply with pricing and availability. No account
                creation, no online checkout — just a direct conversation with the team handling
                your order.
              </p>
              <p>
                We supply single units for offices and homes as well as bulk orders for retailers,
                system integrators and project contractors. If a product isn&apos;t listed yet, ask
                us anyway — our catalog is a sample of what we carry, not the full range.
              </p>
            </div>

            <h2 className="mt-10 text-xl font-bold text-ink-900">Why customers choose us</h2>
            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {VALUES.map((v) => (
                <div key={v.title} className="rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-semibold text-ink-900">{v.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="card h-fit p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              At a glance
            </h3>
            <dl className="mt-4 space-y-4">
              {STATS.map((s) => (
                <div key={s.label} className="flex items-baseline justify-between">
                  <dt className="text-sm text-slate-600">{s.label}</dt>
                  <dd className="text-lg font-bold text-brand-700">{s.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 space-y-2 border-t border-slate-200 pt-5 text-sm text-slate-600">
              {settings.address && <p>{settings.address}</p>}
              {settings.businessHours && <p className="text-slate-500">{settings.businessHours}</p>}
            </div>
            <a
              href={waLink(settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp mt-6 w-full"
            >
              Chat on WhatsApp
            </a>
          </aside>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { getProducts, getCategories, getSettings } from "@/lib/db";
import { waLink } from "@/lib/enquiry";
import ProductCard from "@/components/site/ProductCard";

const CATEGORY_IMAGES = {
  Networking: "/images/placeholders/networking.svg",
  "Laptops & Computers": "/images/placeholders/laptop.svg",
  "Surveillance & Security": "/images/placeholders/cctv.svg",
  Accessories: "/images/placeholders/accessory.svg",
};

export default async function HomePage() {
  const [products, categories, settings] = await Promise.all([
    getProducts(),
    getCategories(),
    getSettings(),
  ]);

  const featured = (products.filter((p) => p.featured).length ? products.filter((p) => p.featured) : products).slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-900">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#1d4ed8_0%,_transparent_50%)] opacity-40" />
        <div className="container-page relative grid grid-cols-1 items-center gap-10 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <span className="badge bg-white/10 text-white ring-white/20">
              {settings.tagline}
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Networking, IT &amp; Security equipment — sourced, stocked, delivered.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Browse the catalog and enquire directly by WhatsApp or email. No account, no
              checkout hassle — just tell us what you need and we&apos;ll quote you fast.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary">
                Browse Products
              </Link>
              <a
                href={waLink(settings)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
          <div className="relative mx-auto hidden aspect-square w-full max-w-md lg:block">
            <div className="absolute inset-0 rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur" />
            <div className="absolute inset-6 rounded-2xl bg-gradient-to-br from-brand-500/20 to-transparent" />
            <div className="relative flex h-full items-center justify-center">
              <Image
                src={settings.heroImage || "/images/placeholders/networking.svg"}
                alt={settings.businessName}
                width={340}
                height={255}
                className="rounded-2xl object-cover shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-14 sm:py-20">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Shop by Category
            </h2>
            <p className="mt-2 text-slate-600">Everything we stock, organised for quick browsing.</p>
          </div>
          <Link href="/products" className="hidden text-sm font-semibold text-brand-700 hover:text-brand-600 sm:block">
            View all &rarr;
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat).length;
            return (
              <Link
                key={cat}
                href={`/products?category=${encodeURIComponent(cat)}`}
                className="group card relative flex aspect-[4/3] flex-col justify-end overflow-hidden p-5"
              >
                <Image
                  src={CATEGORY_IMAGES[cat] || "/images/placeholders/accessory.svg"}
                  alt={cat}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/10 to-transparent" />
                <div className="relative">
                  <h3 className="text-base font-semibold text-white">{cat}</h3>
                  <p className="text-xs text-slate-300">{count} product{count === 1 ? "" : "s"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Featured products */}
      <section className="border-t border-slate-200 bg-slate-50 py-14 sm:py-20">
        <div className="container-page">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                Featured Products
              </h2>
              <p className="mt-2 text-slate-600">A quick look — see the full catalog for everything we carry.</p>
            </div>
            <Link href="/products" className="hidden text-sm font-semibold text-brand-700 hover:text-brand-600 sm:block">
              View all &rarr;
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} settings={settings} />
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link href="/products" className="btn-secondary">View all products</Link>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="container-page py-14 sm:py-20">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {[
            { icon: "📦", title: "Genuine Products", desc: "Sourced from trusted brands and distributors." },
            { icon: "⚡", title: "Fast Response", desc: "Enquiries answered on WhatsApp the same day." },
            { icon: "🤝", title: "Bulk & Retail", desc: "Pricing available for single units and bulk orders." },
          ].map((item) => (
            <div key={item.title} className="text-center sm:text-left">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl sm:mx-0">
                {item.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-900">{item.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="container-page pb-16 sm:pb-24">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-8 py-12 text-center sm:px-16 sm:py-16">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Looking for a specific product?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">
            Message us on WhatsApp with what you need and we&apos;ll get back to you with pricing
            and availability.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href={waLink(settings)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              Enquire on WhatsApp
            </a>
            <Link href="/contact" className="btn-white">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

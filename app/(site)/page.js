import Link from "next/link";
import Image from "next/image";
import { getProducts, getCategories, getBrands, getSettings } from "@/lib/db";
import { withResolvedProductImages, withResolvedBrandLogos, withResolvedSettingsImages } from "@/lib/images";
import { waLink } from "@/lib/enquiry";
import ProductCard from "@/components/site/ProductCard";
import BrandsSection from "@/components/site/BrandsSection";
import { IconCheck, IconArrow, IconShield, IconSpark, IconTruck } from "@/components/site/icons";

const CATEGORY_IMAGES = {
  Networking: "/images/placeholders/networking.svg",
  "Laptops & Computers": "/images/placeholders/laptop.svg",
  "Surveillance & Security": "/images/placeholders/cctv.svg",
  Accessories: "/images/placeholders/accessory.svg",
};

export default async function HomePage() {
  const [rawProducts, categories, rawBrands, rawSettings] = await Promise.all([
    getProducts(),
    getCategories(),
    getBrands(),
    getSettings(),
  ]);
  const [products, brands, settings] = await Promise.all([
    withResolvedProductImages(rawProducts),
    withResolvedBrandLogos(rawBrands),
    withResolvedSettingsImages(rawSettings),
  ]);

  const featured = (products.filter((p) => p.featured).length ? products.filter((p) => p.featured) : products).slice(0, 8);
  const activeBrands = brands.filter((b) => b.type === "active");
  const passiveBrands = brands.filter((b) => b.type === "passive");
  const otherProducts = products.filter((p) => !p.brand).slice(0, 4);
  const quoteSample = products.slice(0, 4);
  const stats = [
    { value: `${products.length}`, label: `Product${products.length === 1 ? "" : "s"} in stock` },
    { value: `${brands.length}`, label: `Brand${brands.length === 1 ? "" : "s"} stocked` },
    { value: "Genuine", label: "Manufacturer warranty" },
    { value: "Same-day", label: "WhatsApp response" },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div className="absolute inset-0">
          <Image
            src={settings.heroImageUrl || "/images/hero-networking.jpg"}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-ink-950/95 via-ink-900/80 to-brand-900/60" />
          <div className="absolute inset-0 bg-grid opacity-40" />
        </div>

        <div className="container-page relative pb-24 pt-20 lg:pb-32 lg:pt-28">
          <div className="grid items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {settings.tagline}
              </div>
              <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Networking, IT &amp; Security equipment —
                <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent"> sourced, stocked, delivered.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/75">
                Browse the catalog and enquire directly by WhatsApp or email. No account, no
                checkout hassle — just tell us what you need and we&apos;ll quote you fast.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={waLink(settings)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-whatsapp shadow-lg shadow-emerald-500/30"
                >
                  Chat on WhatsApp
                </a>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Browse Catalog
                  <IconArrow className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/70">
                <div className="flex items-center gap-2"><IconCheck className="h-4 w-4 text-emerald-400" /> Genuine products</div>
                <div className="flex items-center gap-2"><IconCheck className="h-4 w-4 text-emerald-400" /> No account or checkout</div>
                <div className="flex items-center gap-2"><IconCheck className="h-4 w-4 text-emerald-400" /> Same-day quotes</div>
              </div>
            </div>

            {quoteSample.length > 0 && (
              <div className="hidden lg:col-span-5 lg:block">
                <div className="relative">
                  <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 blur-2xl" />
                  <div className="relative rounded-2xl border border-white/15 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      <div className="ml-auto font-mono text-xs text-white/50">enquiry.txt</div>
                    </div>
                    <div className="space-y-3 text-sm font-mono">
                      {quoteSample.map((p) => (
                        <div key={p.id} className="flex justify-between gap-3 text-white/80">
                          <span className="truncate">{p.name}</span>
                          <span className={p.inStock ? "shrink-0 text-emerald-400" : "shrink-0 text-white/40"}>
                            {p.inStock ? "✓ in stock" : "on order"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <a
                      href={waLink(settings)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-whatsapp mt-5 w-full text-sm"
                    >
                      Enquire on WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-16 grid grid-cols-2 gap-4 lg:mt-20 lg:grid-cols-4 lg:gap-6">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
                <div className="bg-gradient-to-r from-white to-brand-200 bg-clip-text text-2xl font-bold text-transparent lg:text-3xl">
                  {s.value}
                </div>
                <div className="mt-1 text-xs text-white/60 lg:text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-14 sm:py-20">
        <div className="flex items-end justify-between">
          <div>
            <div className="eyebrow">Shop by Category</div>
            <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Everything we stock, organised for quick browsing.
            </h2>
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
                className="group card relative flex aspect-[4/3] flex-col justify-end overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/10"
              >
                <Image
                  src={CATEGORY_IMAGES[cat] || "/images/placeholders/accessory.svg"}
                  alt={cat}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/10 to-transparent" />
                <div className="relative flex items-end justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-white">{cat}</h3>
                    <p className="text-xs text-slate-300">{count} product{count === 1 ? "" : "s"}</p>
                  </div>
                  <IconArrow className="h-4 w-4 shrink-0 text-white/50 transition group-hover:translate-x-1 group-hover:text-white" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Active Brands */}
      {activeBrands.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50">
          <BrandsSection
            title="Active Brands"
            subtitle="Powered networking, computing and security equipment."
            brands={activeBrands}
            products={products}
          />
        </div>
      )}

      {/* Passive Brands */}
      {passiveBrands.length > 0 && (
        <BrandsSection
          title="Passive Brands"
          subtitle="Structured cabling and infrastructure essentials."
          brands={passiveBrands}
          products={products}
        />
      )}

      {/* Products without a brand assigned yet */}
      {otherProducts.length > 0 && (
        <div className="border-t border-slate-200">
          <section className="container-page py-14 sm:py-20">
            <div className="flex items-end justify-between">
              <div>
                <div className="eyebrow">Other Products</div>
                <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                  Everything else in the catalog.
                </h2>
              </div>
              <Link href="/products" className="hidden text-sm font-semibold text-brand-700 hover:text-brand-600 sm:block">
                View all &rarr;
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {otherProducts.map((p) => (
                <ProductCard key={p.id} product={p} settings={settings} />
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Featured products */}
      <section className="border-t border-slate-200 bg-slate-50 py-14 sm:py-20">
        <div className="container-page">
          <div className="flex items-end justify-between">
            <div>
              <div className="eyebrow">Featured Products</div>
              <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                A quick look — see the full catalog for everything we carry.
              </h2>
            </div>
            <Link href="/products" className="hidden text-sm font-semibold text-brand-700 hover:text-brand-600 sm:block">
              View all &rarr;
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
      <section id="why-us" className="border-t border-slate-200 bg-white py-14 sm:py-20">
        <div className="container-page">
          <div className="eyebrow">Why {settings.businessName}</div>
          <h2 className="max-w-2xl text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            A supplier built around the way you actually buy.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { icon: <IconShield className="h-6 w-6" />, title: "Genuine Products", desc: "Sourced from trusted brands and distributors." },
              { icon: <IconSpark className="h-6 w-6" />, title: "Fast Response", desc: "Enquiries answered on WhatsApp the same day." },
              { icon: <IconTruck className="h-6 w-6" />, title: "Bulk & Retail", desc: "Pricing available for single units and bulk orders." },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/25">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink-900">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section id="contact" className="container-page pb-16 sm:pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-12 text-center text-white sm:px-16 sm:py-16">
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Looking for a specific product?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Message us on WhatsApp with what you need and we&apos;ll get back to you with pricing
              and availability.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a href={waLink(settings)} target="_blank" rel="noopener noreferrer" className="btn-whatsapp">
                Chat on WhatsApp
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Contact Us
              </Link>
            </div>
            <div className="mx-auto mt-10 grid max-w-2xl gap-4 text-sm sm:grid-cols-3">
              <div className="flex items-center justify-center gap-2 text-white/85"><IconCheck className="h-4 w-4" /> No account required</div>
              <div className="flex items-center justify-center gap-2 text-white/85"><IconCheck className="h-4 w-4" /> Same-day response</div>
              <div className="flex items-center justify-center gap-2 text-white/85"><IconCheck className="h-4 w-4" /> Bulk pricing available</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

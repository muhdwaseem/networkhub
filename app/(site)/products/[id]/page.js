import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById, getProducts, getSettings } from "@/lib/db";
import { waLink } from "@/lib/enquiry";
import ProductGallery from "@/components/site/ProductGallery";
import ProductCard from "@/components/site/ProductCard";
import EmailEnquiryButton from "@/components/site/EmailEnquiryButton";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description || product.specs?.join(", "),
  };
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const [product, settings, allProducts] = await Promise.all([
    getProductById(id),
    getSettings(),
    getProducts(),
  ]);

  if (!product) notFound();

  const related = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);

  return (
    <div className="container-page py-10 sm:py-14">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-brand-700">Products</Link>
        <span>/</span>
        <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-brand-700">
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-ink-800">{product.name}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <span className="badge">{product.category}</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {product.brand && (
              <Link href={`/products?brand=${encodeURIComponent(product.brand)}`} className="hover:text-brand-700">
                Brand: {product.brand}
              </Link>
            )}
            {product.sku && <span>SKU: {product.sku}</span>}
            <span className={product.inStock ? "text-emerald-600" : "text-red-600"}>
              {product.inStock ? "In stock" : "Out of stock"}
            </span>
          </div>

          <div className="mt-4 text-2xl font-bold text-ink-900">
            {product.price || "Contact for price"}
          </div>

          {product.description && (
            <p className="mt-4 leading-relaxed text-slate-600">{product.description}</p>
          )}

          {product.specs?.length > 0 && (
            <ul className="mt-5 space-y-2">
              {product.specs.map((spec, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-800">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  <span>{spec}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={waLink(settings, product.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp flex-1"
            >
              WhatsApp Enquiry
            </a>
            <EmailEnquiryButton productName={product.name} className="btn-secondary flex-1" label="Email Enquiry" />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Enquiries are answered directly by {settings.businessName} — pricing available for
            single units and bulk orders.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-16 border-t border-slate-200 pt-10">
          <h2 className="text-xl font-bold text-ink-900">More in {product.category}</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} settings={settings} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

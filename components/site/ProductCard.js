import Link from "next/link";
import Image from "next/image";
import { waLink } from "@/lib/enquiry";
import EmailEnquiryButton from "./EmailEnquiryButton";

export default function ProductCard({ product, settings }) {
  const image = product.images?.[0];
  const href = `/products/${product.id}`;

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-brand-500/10">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-slate-50">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-500 to-brand-800">
            <div className="bg-grid absolute inset-0 opacity-40" />
            <svg viewBox="0 0 100 60" className="relative w-3/5 text-white/90 transition duration-500 group-hover:scale-110" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="8" y="20" width="84" height="24" rx="2" />
              <path d="M14 28h4M22 28h4M30 28h4M38 28h4M46 28h4M54 28h4M62 28h4M70 28h4M78 28h4" strokeWidth="2.5" />
              <circle cx="15" cy="38" r="1.5" fill="currentColor" />
              <circle cx="21" cy="38" r="1.5" fill="currentColor" />
            </svg>
          </div>
        )}
        {product.brand && (
          <span className="absolute left-3 top-3 rounded bg-white/15 px-2 py-1 text-[10px] font-bold tracking-widest text-white backdrop-blur">
            {product.brand.toUpperCase()}
          </span>
        )}
        <span
          className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
            product.inStock ? "bg-emerald-500 text-white" : "bg-ink-900/90 text-white"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${product.inStock ? "bg-white" : "bg-white/60"}`} />
          {product.inStock ? "In stock" : "Out of stock"}
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2">
          <span className="badge w-fit">{product.category}</span>
        </div>
        <Link href={href} className="mt-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-700">
            {product.name}
          </h3>
        </Link>
        {product.specs?.[0] && (
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{product.specs[0]}</p>
        )}

        <div className="mt-3 text-sm font-semibold text-ink-900">
          {product.price || "Contact for price"}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={waLink(settings, product.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp btn-sm"
          >
            WhatsApp
          </a>
          <EmailEnquiryButton productName={product.name} className="btn-secondary btn-sm" label="Email" />
        </div>
      </div>
    </article>
  );
}

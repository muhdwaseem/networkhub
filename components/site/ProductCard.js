import Link from "next/link";
import Image from "next/image";
import { waLink } from "@/lib/enquiry";
import EmailEnquiryButton from "./EmailEnquiryButton";

export default function ProductCard({ product, settings }) {
  const image = product.images?.[0] || "/images/placeholders/accessory.svg";
  const href = `/products/${product.id}`;

  return (
    <article className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-slate-50">
        <Image
          src={image}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {!product.inStock && (
          <span className="absolute left-3 top-3 rounded-full bg-ink-900/90 px-2.5 py-1 text-xs font-medium text-white">
            Out of stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <span className="badge w-fit">{product.category}</span>
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

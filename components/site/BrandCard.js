import Link from "next/link";
import Image from "next/image";

export default function BrandCard({ brand, count }) {
  const initials = brand.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Link
      href={`/products?brand=${encodeURIComponent(brand.name)}`}
      className="group card flex flex-col items-center gap-3 p-5 text-center transition-shadow hover:shadow-md"
    >
      <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-50 ring-1 ring-brand-100">
        {brand.logo ? (
          <Image src={brand.logo} alt={brand.name} fill sizes="64px" className="object-contain p-2" />
        ) : (
          <span className="text-lg font-bold text-brand-700">{initials}</span>
        )}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-ink-900">{brand.name}</h3>
        <p className="text-xs text-slate-500">{count} product{count === 1 ? "" : "s"}</p>
      </div>
    </Link>
  );
}

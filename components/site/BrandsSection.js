import BrandCard from "./BrandCard";

export default function BrandsSection({ title, subtitle, brands, products }) {
  if (!brands.length) return null;

  return (
    <div className="container-page py-14 sm:py-20">
      <div className="flex items-end justify-between">
        <div>
          <div className="eyebrow">{title}</div>
          <h2 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">{subtitle}</h2>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {brands.map((b) => (
          <BrandCard key={b.id} brand={b} count={products.filter((p) => p.brand === b.name).length} />
        ))}
      </div>
    </div>
  );
}

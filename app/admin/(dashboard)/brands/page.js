import { getBrands, getProducts } from "@/lib/db";
import BrandManager from "@/components/admin/BrandManager";

export const metadata = { title: "Brands" };

export default async function AdminBrandsPage() {
  const [brands, products] = await Promise.all([getBrands(), getProducts()]);
  const counts = products.reduce((acc, p) => {
    acc[p.brand] = (acc[p.brand] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Brands</h1>
      <p className="mt-1 text-sm text-slate-500">
        Group brands as Active (powered equipment) or Passive (cabling &amp; infrastructure).
        Brands with products can&apos;t be deleted until those products are reassigned.
      </p>
      <div className="mt-6">
        <BrandManager initialBrands={brands} counts={counts} />
      </div>
    </div>
  );
}

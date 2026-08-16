import { NextResponse } from "next/server";
import { getBrandById, updateBrand, deleteBrand, reassignProductsBrand, getBrands, getProducts } from "@/lib/db";
import { saveUploadedImage } from "@/lib/upload";
import { withResolvedBrandLogos } from "@/lib/images";

export async function GET(request, { params }) {
  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [resolved] = await withResolvedBrandLogos([brand]);
  return NextResponse.json({ brand: resolved });
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const existing = await getBrandById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();

  let logo = existing.logo;
  const logoFile = formData.get("logo");
  if (logoFile && typeof logoFile.arrayBuffer === "function" && logoFile.size > 0) {
    try {
      logo = (await saveUploadedImage(logoFile, "brands")) || existing.logo;
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  try {
    const updated = await updateBrand(id, {
      name: formData.get("name"),
      type: formData.get("type"),
      logo,
    });
    if (updated.name !== existing.name) {
      await reassignProductsBrand(existing.name, updated.name);
    }
    const [resolved] = await withResolvedBrandLogos([updated]);
    return NextResponse.json({ brand: resolved });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const products = await getProducts();
  const inUse = products.some((p) => p.brand === brand.name);
  if (inUse) {
    return NextResponse.json(
      { error: "This brand is still used by one or more products. Reassign them first." },
      { status: 409 }
    );
  }

  await deleteBrand(id);
  const brands = await withResolvedBrandLogos(await getBrands());
  return NextResponse.json({ brands });
}

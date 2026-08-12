import { NextResponse } from "next/server";
import { getProductById, updateProduct, deleteProduct } from "@/lib/db";
import { saveUploadedImage, deleteUploadedImage } from "@/lib/upload";

function parseSpecs(raw) {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function GET(request, { params }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const existing = await getProductById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();

  // Images the admin chose to keep (unchecked ones are treated as removed).
  const keepImages = formData.getAll("keepImages").filter(Boolean);
  const removedImages = (existing.images || []).filter((img) => !keepImages.includes(img));

  const newImages = [];
  for (const file of formData.getAll("images")) {
    try {
      const url = await saveUploadedImage(file, "products");
      if (url) newImages.push(url);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  const product = await updateProduct(id, {
    name: formData.get("name"),
    category: formData.get("category"),
    brand: formData.get("brand"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    inStock: formData.get("inStock") === "on",
    featured: formData.get("featured") === "on",
    specs: parseSpecs(formData.get("specs")),
    description: formData.get("description"),
    images: [...keepImages, ...newImages],
  });

  for (const img of removedImages) await deleteUploadedImage(img);

  return NextResponse.json({ product });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const removed = await deleteProduct(id);
  if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  for (const img of removed.images || []) await deleteUploadedImage(img);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getProducts, createProduct } from "@/lib/db";
import { saveUploadedImage } from "@/lib/upload";

function parseSpecs(raw) {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function GET() {
  const products = await getProducts();
  return NextResponse.json({ products });
}

export async function POST(request) {
  const formData = await request.formData();

  const images = [];
  for (const file of formData.getAll("images")) {
    try {
      const url = await saveUploadedImage(file, "products");
      if (url) images.push(url);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  const product = await createProduct({
    name: formData.get("name"),
    category: formData.get("category"),
    brand: formData.get("brand"),
    sku: formData.get("sku"),
    price: formData.get("price"),
    inStock: formData.get("inStock") === "on",
    featured: formData.get("featured") === "on",
    specs: parseSpecs(formData.get("specs")),
    description: formData.get("description"),
    images,
  });

  return NextResponse.json({ product }, { status: 201 });
}

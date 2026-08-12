import { NextResponse } from "next/server";
import { getCategories, addCategory, deleteCategory, getProducts } from "@/lib/db";

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json({ categories });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }
  const categories = await addCategory(name);
  return NextResponse.json({ categories }, { status: 201 });
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  if (!name) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }

  const products = await getProducts();
  const inUse = products.some((p) => p.category === name);
  if (inUse) {
    return NextResponse.json(
      { error: "This category is still used by one or more products. Reassign them first." },
      { status: 409 }
    );
  }

  const categories = await deleteCategory(name);
  return NextResponse.json({ categories });
}

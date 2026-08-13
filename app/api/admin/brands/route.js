import { NextResponse } from "next/server";
import { getBrands, createBrand } from "@/lib/db";
import { saveUploadedImage } from "@/lib/upload";

export async function GET() {
  const brands = await getBrands();
  return NextResponse.json({ brands });
}

export async function POST(request) {
  const formData = await request.formData();

  let logo = "";
  try {
    logo = (await saveUploadedImage(formData.get("logo"), "brands")) || "";
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    const brand = await createBrand({
      name: formData.get("name"),
      type: formData.get("type"),
      logo,
    });
    const brands = await getBrands();
    return NextResponse.json({ brand, brands }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

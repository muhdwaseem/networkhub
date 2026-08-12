import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db";
import { saveUploadedImage } from "@/lib/upload";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request) {
  const formData = await request.formData();
  const current = await getSettings();

  const data = {
    businessName: formData.get("businessName") ?? current.businessName,
    tagline: formData.get("tagline") ?? current.tagline,
    description: formData.get("description") ?? current.description,
    whatsappNumber: formData.get("whatsappNumber") ?? current.whatsappNumber,
    email: formData.get("email") ?? current.email,
    phoneDisplay: formData.get("phoneDisplay") ?? current.phoneDisplay,
    address: formData.get("address") ?? current.address,
    businessHours: formData.get("businessHours") ?? current.businessHours,
    socials: {
      facebook: formData.get("facebook") ?? current.socials.facebook,
      instagram: formData.get("instagram") ?? current.socials.instagram,
      linkedin: formData.get("linkedin") ?? current.socials.linkedin,
    },
  };

  try {
    const logoUrl = await saveUploadedImage(formData.get("logo"), "site");
    if (logoUrl) data.logo = logoUrl;

    const heroUrl = await saveUploadedImage(formData.get("heroImage"), "site");
    if (heroUrl) data.heroImage = heroUrl;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const settings = await updateSettings(data);
  return NextResponse.json({ settings });
}

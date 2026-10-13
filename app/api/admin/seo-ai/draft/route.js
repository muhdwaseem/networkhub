import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db";
import { isGeminiConfigured } from "@/lib/gemini";
import { suggestSeoForProduct } from "@/lib/seoAi";

export const maxDuration = 60;

// Suggestion for a product that's still being edited in the form (so it may
// not be saved yet) — takes the form's current values instead of an id.
export async function POST(request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: "GOOGLE_AI_STUDIO_API_KEY is not set on the server." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Enter a product name first." }, { status: 400 });

  const specs = Array.isArray(body.specs)
    ? body.specs
    : typeof body.specs === "string"
      ? body.specs.split("\n")
      : [];

  const settings = await getSettings();
  try {
    const suggestion = await suggestSeoForProduct(
      {
        name,
        brand: String(body.brand || ""),
        category: String(body.category || ""),
        sku: String(body.sku || ""),
        description: String(body.description || ""),
        specs: specs.map((s) => String(s).trim()).filter(Boolean),
      },
      { businessName: settings.businessName, address: settings.address, knowledge: settings.seoKnowledge }
    );
    return NextResponse.json({ suggestion });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

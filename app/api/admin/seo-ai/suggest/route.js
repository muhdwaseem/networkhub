import { NextResponse } from "next/server";
import { getProductById, getSettings } from "@/lib/db";
import { isGeminiConfigured } from "@/lib/gemini";
import { suggestSeoForProduct } from "@/lib/seoAi";

// A batch of model calls (3 at a time) plus retries on rate limits.
export const maxDuration = 60;

const MAX_BATCH = 10;
const CONCURRENCY = 3;

// Generates SEO suggestions for existing products by id. Read-only against
// the catalog — nothing is saved here; the admin reviews the suggestions
// and approves them through /apply.
export async function POST(request) {
  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: "GOOGLE_AI_STUDIO_API_KEY is not set on the server." }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter((i) => typeof i === "string"))] : [];
  if (ids.length === 0 || ids.length > MAX_BATCH) {
    return NextResponse.json({ error: `Send between 1 and ${MAX_BATCH} product ids.` }, { status: 400 });
  }

  const settings = await getSettings();
  const context = {
    businessName: settings.businessName,
    address: settings.address,
    knowledge: settings.seoKnowledge,
  };

  const results = new Array(ids.length);
  let next = 0;
  async function worker() {
    while (next < ids.length) {
      const i = next++;
      const id = ids[i];
      try {
        const product = await getProductById(id);
        if (!product) {
          results[i] = { id, error: "Product not found." };
          continue;
        }
        const suggestion = await suggestSeoForProduct(product, context);
        results[i] = {
          id,
          name: product.name,
          currentTitle: product.seoTitle || product.name,
          currentDescription: product.metaDescription || product.description || (product.specs || []).join(", "),
          suggestion,
        };
      } catch (err) {
        results[i] = { id, error: err.message };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

  return NextResponse.json({ results });
}

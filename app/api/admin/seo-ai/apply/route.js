import { NextResponse } from "next/server";
import { applyProductPatches } from "@/lib/db";
import { logAdminAction } from "@/lib/auditLog";
import { TITLE_MAX, DESCRIPTION_MAX } from "@/lib/seoAi";

export const maxDuration = 60;

const MAX_ITEMS = 100;

// Saves suggestions the admin reviewed and approved. Re-validates here
// rather than trusting the browser: the only columns this can ever touch
// are seo_title and meta_description, with the same length limits.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0 || items.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Send between 1 and ${MAX_ITEMS} items.` }, { status: 400 });
  }

  const patches = [];
  for (const item of items) {
    const seoTitle = typeof item?.seoTitle === "string" ? item.seoTitle.trim() : "";
    const metaDescription = typeof item?.metaDescription === "string" ? item.metaDescription.trim() : "";
    if (typeof item?.id !== "string" || !seoTitle || !metaDescription) {
      return NextResponse.json({ error: "Every item needs an id, a title and a description." }, { status: 400 });
    }
    if (seoTitle.length > TITLE_MAX || metaDescription.length > DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: `Titles must be ≤ ${TITLE_MAX} and descriptions ≤ ${DESCRIPTION_MAX} characters.` },
        { status: 400 }
      );
    }
    patches.push({ id: item.id, seo_title: seoTitle, meta_description: metaDescription });
  }

  const { applied, failed } = await applyProductPatches(patches);

  if (applied > 0) {
    await logAdminAction(request, {
      action: "update",
      entityType: "product",
      entityId: null,
      entityLabel: `AI-assisted SEO applied — ${applied} product${applied === 1 ? "" : "s"} (reviewed by admin)`,
    });
  }
  if (failed.length > 0) {
    return NextResponse.json(
      { error: `Saved ${applied}, but ${failed.length} failed: ${failed[0].error}`, applied },
      { status: 500 }
    );
  }
  return NextResponse.json({ applied });
}

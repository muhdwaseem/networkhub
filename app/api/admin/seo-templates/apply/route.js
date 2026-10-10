import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { runSeoAudit } from "@/lib/seoAudit";
import { generateSeoTemplate } from "@/lib/seoTemplates";
import { logAdminAction } from "@/lib/auditLog";

// Vercel's default serverless function timeout is too short for bulk-
// updating thousands of rows; this route can run up to a minute.
export const maxDuration = 60;

// Only these two issue types have a safe, mechanical fix. "Missing
// description" would need content the system doesn't have, and
// "duplicate title" would mean renaming the actual product, not just its
// SEO override — both need a human, not a bulk action.
const APPLIABLE_TYPES = new Set(["title_too_long", "duplicate_description"]);
const BATCH_SIZE = 300;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const type = body.type;
  if (!APPLIABLE_TYPES.has(type)) {
    return NextResponse.json({ error: "Unsupported template type." }, { status: 400 });
  }

  const { issues, rows } = await runSeoAudit();
  const flaggedIds = new Set(issues.filter((i) => i.type === type).map((i) => i.productId));
  const targetRows = rows.filter((r) => flaggedIds.has(r.id));

  const force = type === "duplicate_description";
  const now = new Date().toISOString();
  const updates = [];
  for (const row of targetRows) {
    const template = generateSeoTemplate(
      {
        title: row.seo_title || row.name,
        description: row.meta_description || row.description,
        specs: row.specs,
      },
      { force }
    );
    const patch = { id: row.id, updated_at: now };
    if (type === "title_too_long" && template.seoTitle) patch.seo_title = template.seoTitle;
    if (type === "duplicate_description" && template.metaDescription) patch.meta_description = template.metaDescription;
    // Guards the rare case where the generator decides nothing actually
    // needs to change for this specific type despite the audit flag.
    if (Object.keys(patch).length > 2) updates.push(patch);
  }

  const db = getSupabaseAdmin();
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const { error } = await db.from("products").upsert(batch, { onConflict: "id" });
    if (error) {
      return NextResponse.json(
        { error: `Applied ${i} of ${updates.length} before failing: ${error.message}`, applied: i },
        { status: 500 }
      );
    }
  }

  await logAdminAction(request, {
    action: "update",
    entityType: "product",
    entityId: null,
    entityLabel: `Bulk SEO template applied — ${updates.length} products (${type.replace(/_/g, " ")})`,
  });

  return NextResponse.json({ applied: updates.length, scanned: targetRows.length });
}

import { NextResponse } from "next/server";
import { applyProductPatches } from "@/lib/db";
import { runSeoAudit } from "@/lib/seoAudit";
import { generateSeoTemplate } from "@/lib/seoTemplates";
import { logAdminAction } from "@/lib/auditLog";

// Thousands of single-row updates (see applyProductPatches) can take a
// while; Vercel's default function timeout would cut that short.
export const maxDuration = 60;

// Only these two issue types have a safe, mechanical fix. "Missing
// description" would need content the system doesn't have, and
// "duplicate title" would mean renaming the actual product, not just its
// SEO override — both need a human, not a bulk action.
const APPLIABLE_TYPES = new Set(["title_too_long", "duplicate_description"]);

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
  const patches = [];
  for (const row of targetRows) {
    const template = generateSeoTemplate(
      {
        title: row.seo_title || row.name,
        description: row.meta_description || row.description,
        specs: row.specs,
      },
      { force }
    );
    if (type === "title_too_long" && template.seoTitle) {
      patches.push({ id: row.id, seo_title: template.seoTitle });
    }
    if (type === "duplicate_description" && template.metaDescription) {
      patches.push({ id: row.id, meta_description: template.metaDescription });
    }
  }

  const { applied, failed } = await applyProductPatches(patches);

  if (applied > 0) {
    await logAdminAction(request, {
      action: "update",
      entityType: "product",
      entityId: null,
      entityLabel: `Bulk SEO template applied — ${applied} products (${type.replace(/_/g, " ")})`,
    });
  }

  if (failed.length > 0) {
    return NextResponse.json(
      { error: `Applied ${applied}, but ${failed.length} failed: ${failed[0].error}`, applied, failed: failed.length },
      { status: 500 }
    );
  }
  return NextResponse.json({ applied, scanned: targetRows.length });
}

import Link from "next/link";
import { runSeoAudit } from "@/lib/seoAudit";
import { generateSeoTemplate } from "@/lib/seoTemplates";
import ApplyTemplateButton from "@/components/admin/ApplyTemplateButton";

export const metadata = { title: "SEO Templates" };

const PREVIEW_SAMPLE = 8;

function buildPreview(rows, issues, type) {
  const flaggedIds = new Set(issues.filter((i) => i.type === type).map((i) => i.productId));
  const flaggedRows = rows.filter((r) => flaggedIds.has(r.id));
  const force = type === "duplicate_description";

  const preview = flaggedRows.slice(0, PREVIEW_SAMPLE).map((row) => {
    const currentTitle = row.seo_title || row.name;
    const currentDescription = row.meta_description || row.description || (row.specs || []).join(", ");
    const template = generateSeoTemplate(
      { title: currentTitle, description: currentDescription, specs: row.specs },
      { force }
    );
    return {
      id: row.id,
      name: row.name,
      currentTitle,
      currentDescription,
      proposedTitle: template.seoTitle || currentTitle,
      proposedDescription: template.metaDescription || currentDescription,
    };
  });

  return { total: flaggedRows.length, preview };
}

export default async function SeoTemplatesPage() {
  const { issues, rows } = await runSeoAudit();
  const titleFix = buildPreview(rows, issues, "title_too_long");
  const descriptionFix = buildPreview(rows, issues, "duplicate_description");

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">SEO Templates</h1>
      <p className="mt-1 text-sm text-slate-500">
        Automatically generate and apply smart SEO defaults for products the{" "}
        <Link href="/admin-networkhub/seo-audit" className="text-brand-700 hover:underline">SEO Audit</Link>{" "}
        flagged. Titles are shortened at the nearest word break; descriptions are rebuilt from each
        product&apos;s own specs, which naturally makes them unique instead of just shorter.
      </p>

      <section className="card mt-6 space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Shorten titles that are too long</h2>
            <p className="text-sm text-slate-500">{titleFix.total} products affected</p>
          </div>
          <ApplyTemplateButton type="title_too_long" count={titleFix.total} />
        </div>

        {titleFix.preview.length > 0 ? (
          <div className="space-y-3">
            <p className="field-hint">Preview of the first {titleFix.preview.length} (of {titleFix.total}):</p>
            {titleFix.preview.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-ink-900">{p.name}</p>
                <p className="mt-1 text-red-600">Before ({p.currentTitle.length} chars): {p.currentTitle}</p>
                <p className="mt-1 text-emerald-700">After ({p.proposedTitle.length} chars): {p.proposedTitle}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nothing to fix here.</p>
        )}
      </section>

      <section className="card mt-6 space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">Replace duplicate descriptions with spec-based ones</h2>
            <p className="text-sm text-slate-500">{descriptionFix.total} products affected</p>
          </div>
          <ApplyTemplateButton type="duplicate_description" count={descriptionFix.total} />
        </div>

        {descriptionFix.preview.length > 0 ? (
          <div className="space-y-3">
            <p className="field-hint">Preview of the first {descriptionFix.preview.length} (of {descriptionFix.total}):</p>
            {descriptionFix.preview.map((p) => (
              <div key={p.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <p className="font-medium text-ink-900">{p.name}</p>
                <p className="mt-1 text-red-600">Before: {p.currentDescription || "(empty)"}</p>
                <p className="mt-1 text-emerald-700">After: {p.proposedDescription}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nothing to fix here.</p>
        )}
      </section>
    </div>
  );
}

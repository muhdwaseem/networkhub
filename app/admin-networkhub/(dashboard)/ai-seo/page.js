import Link from "next/link";
import { getSettings } from "@/lib/db";
import { runSeoAudit } from "@/lib/seoAudit";
import { isGeminiConfigured } from "@/lib/gemini";
import { DEFAULT_SEO_KNOWLEDGE } from "@/lib/seoAi";
import SeoKnowledgeEditor from "@/components/admin/SeoKnowledgeEditor";
import AiSeoReview from "@/components/admin/AiSeoReview";

export const metadata = { title: "AI SEO Assistant" };

const PAGE_SIZE = 10;

const ISSUE_LABELS = {
  missing_description: "Missing description",
  title_too_long: "Title too long",
  description_too_long: "Description too long",
  duplicate_title: "Duplicate title",
  duplicate_description: "Duplicate description",
};

export default async function AiSeoPage({ searchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page, 10) || 1);

  const [settings, { issues }] = await Promise.all([getSettings(), runSeoAudit()]);

  // One queue entry per product, listing every problem the audit found on
  // it — fixing a product's title and description is a single review step.
  const byProduct = new Map();
  for (const issue of issues) {
    const entry = byProduct.get(issue.productId) || {
      id: issue.productId,
      name: issue.productName,
      category: issue.category,
      issues: [],
    };
    entry.issues.push(ISSUE_LABELS[issue.type] || issue.type);
    byProduct.set(issue.productId, entry);
  }
  const queue = [...byProduct.values()];
  const totalPages = Math.max(1, Math.ceil(queue.length / PAGE_SIZE));
  const pageItems = queue.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const configured = isGeminiConfigured();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">AI SEO Assistant</h1>
        <p className="mt-1 text-sm text-slate-500">
          Writes a search title and meta description for products the{" "}
          <Link href="/admin-networkhub/seo-audit" className="text-brand-700 hover:underline">SEO Audit</Link>{" "}
          flagged, using only each product&apos;s own specs plus your knowledge base. You review and edit
          every suggestion; nothing is saved until you approve it. Visitor-facing product names and
          descriptions are never changed.
        </p>
      </div>

      {!configured && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
          The AI key isn&apos;t set on this server yet. Add <code>GOOGLE_AI_STUDIO_API_KEY</code> in Vercel
          (Settings → Environment Variables, type Secret) and redeploy, then suggestions will work.
        </div>
      )}

      <SeoKnowledgeEditor
        initialText={settings.seoKnowledge || DEFAULT_SEO_KNOWLEDGE}
        defaultText={DEFAULT_SEO_KNOWLEDGE}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink-900">
            Products needing attention <span className="text-sm font-normal text-slate-500">({queue.length})</span>
          </h2>
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} — {PAGE_SIZE} at a time keeps the AI fast and the review manageable.
          </p>
        </div>

        {/* key forces a fresh review state when you move to another page */}
        <AiSeoReview key={page} items={pageItems} />

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-600">
            <Link
              href={`/admin-networkhub/ai-seo?page=${page - 1}`}
              aria-disabled={page <= 1}
              className={`btn-secondary btn-sm ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              Previous
            </Link>
            <span>Page {page} of {totalPages}</span>
            <Link
              href={`/admin-networkhub/ai-seo?page=${page + 1}`}
              aria-disabled={page >= totalPages}
              className={`btn-secondary btn-sm ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            >
              Next
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

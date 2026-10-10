import Link from "next/link";
import { runSeoAudit, getIssuesPage } from "@/lib/seoAudit";

export const metadata = { title: "SEO Audit" };

const PAGE_SIZE = 50;

const ISSUE_LABELS = {
  missing_description: { label: "Missing description", style: "bg-red-50 text-red-700" },
  title_too_long: { label: "Title too long", style: "bg-amber-50 text-amber-700" },
  description_too_long: { label: "Description too long", style: "bg-amber-50 text-amber-700" },
  duplicate_title: { label: "Duplicate title", style: "bg-purple-50 text-purple-700" },
  duplicate_description: { label: "Duplicate description", style: "bg-purple-50 text-purple-700" },
};

export default async function SeoAuditPage({ searchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page, 10) || 1);
  const typeFilter = typeof sp.type === "string" ? sp.type : "";

  const { issues, summary } = await runSeoAudit();
  const filtered = typeFilter ? issues.filter((i) => i.type === typeFilter) : issues;
  const { items, total } = getIssuesPage(filtered, { page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const summaryCards = [
    { type: "", label: "Products scanned", value: summary.totalProducts },
    { type: "missing_description", label: "Missing description", value: summary.missingDescription },
    { type: "title_too_long", label: "Title too long", value: summary.titleTooLong },
    { type: "description_too_long", label: "Description too long", value: summary.descriptionTooLong },
    { type: "duplicate_title", label: "Duplicate titles", value: summary.duplicateTitle },
    { type: "duplicate_description", label: "Duplicate descriptions", value: summary.duplicateDescription },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">SEO Audit</h1>
      <p className="mt-1 text-sm text-slate-500">
        Scans every product&apos;s effective SEO title and meta description (your override if set,
        otherwise the product name/description) for missing, duplicate, or too-long metadata.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((c) => (
          <Link
            key={c.label}
            href={c.type ? `/admin-networkhub/seo-audit?type=${c.type}` : "/admin-networkhub/seo-audit"}
            className={`card p-4 transition-shadow hover:shadow-md ${typeFilter === c.type ? "ring-2 ring-brand-600" : ""}`}
          >
            <p className="text-2xl font-bold text-ink-900">{c.value}</p>
            <p className="mt-1 text-xs text-slate-500">{c.label}</p>
          </Link>
        ))}
      </div>

      {typeFilter && (
        <div className="mt-4">
          <Link href="/admin-networkhub/seo-audit" className="text-sm text-brand-700 hover:underline">
            &larr; Clear filter
          </Link>
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-slate-200">
        <table className="w-full min-w-[640px] divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((issue, i) => {
              const meta = ISSUE_LABELS[issue.type] || { label: issue.type, style: "bg-slate-100 text-slate-700" };
              return (
                <tr key={`${issue.productId}-${issue.type}-${i}`}>
                  <td className="px-4 py-3 font-medium text-ink-900">{issue.productName}</td>
                  <td className="px-4 py-3 text-slate-600">{issue.category}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.style}`}>{meta.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{issue.detail}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin-networkhub/products/${issue.productId}/edit`} className="btn-secondary btn-sm">
                      Fix
                    </Link>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  {typeFilter ? "No products have this issue." : "No SEO issues found across your catalog."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <Link
            href={`/admin-networkhub/seo-audit?page=${page - 1}${typeFilter ? `&type=${typeFilter}` : ""}`}
            aria-disabled={page <= 1}
            className={`btn-secondary btn-sm ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <span>Page {page} of {totalPages} — {total} issue{total === 1 ? "" : "s"}</span>
          <Link
            href={`/admin-networkhub/seo-audit?page=${page + 1}${typeFilter ? `&type=${typeFilter}` : ""}`}
            aria-disabled={page >= totalPages}
            className={`btn-secondary btn-sm ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}

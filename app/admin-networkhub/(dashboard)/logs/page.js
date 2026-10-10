import Link from "next/link";
import { getAuditLogPage } from "@/lib/auditLog";

export const metadata = { title: "Activity Log" };

const PAGE_SIZE = 50;

const ACTION_STYLES = {
  create: "bg-emerald-50 text-emerald-700",
  update: "bg-amber-50 text-amber-700",
  delete: "bg-red-50 text-red-700",
};

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminLogsPage({ searchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page, 10) || 1);
  const { entries, total } = await getAuditLogPage({ page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">Activity Log</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every product, category, brand, and settings change made from this admin panel — {total} total.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-slate-200">
        <table className="w-full min-w-[640px] divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Item</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatTimestamp(entry.created_at)}</td>
                <td className="px-4 py-3 text-slate-600">{entry.admin_username}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      ACTION_STYLES[entry.action] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 capitalize">{entry.entity_type}</td>
                <td className="px-4 py-3 font-medium text-ink-900">{entry.entity_label || "—"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <Link
            href={page > 1 ? `/admin-networkhub/logs?page=${page - 1}` : "#"}
            aria-disabled={page <= 1}
            className={`btn-secondary btn-sm ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
          >
            Previous
          </Link>
          <span>
            Page {page} of {totalPages} — {total} total
          </span>
          <Link
            href={page < totalPages ? `/admin-networkhub/logs?page=${page + 1}` : "#"}
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

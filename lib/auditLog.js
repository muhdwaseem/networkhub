import { getSupabaseAdmin } from "./supabaseAdmin";
import { verifySessionToken, SESSION_COOKIE } from "./auth";

// Records one row in the admin activity log. Deliberately fails open — a
// logging failure must never block or break the real admin action it's
// recording (same posture as lib/rateLimit.js failing open when Upstash
// is unreachable). Call this *after* the real write succeeds, so a failed
// product save never gets logged as if it happened.
export async function logAdminAction(request, { action, entityType, entityId, entityLabel }) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const session = verifySessionToken(token);
    const db = getSupabaseAdmin();
    const { error } = await db.from("admin_audit_log").insert({
      admin_username: session?.u || "unknown",
      action,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      entity_label: entityLabel || "",
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("Failed to record audit log entry:", err);
  }
}

// Matches lib/db.js's own paging pattern (getProductsPage) — logs are
// read back newest-first, one page at a time, never the whole table.
export async function getAuditLogPage({ page = 1, pageSize = 50 } = {}) {
  const db = getSupabaseAdmin();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { count } = await db.from("admin_audit_log").select("*", { count: "exact", head: true });
  const { data, error } = await db
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw new Error(error.message);

  return { entries: data, total: count || 0, page };
}

import { NextResponse } from "next/server";
import { updateSettings } from "@/lib/db";
import { logAdminAction } from "@/lib/auditLog";

const MAX_LENGTH = 4000;

export async function PUT(request) {
  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : null;
  if (text === null) return NextResponse.json({ error: "Missing text." }, { status: 400 });
  if (text.length > MAX_LENGTH) {
    return NextResponse.json({ error: `Keep it under ${MAX_LENGTH} characters.` }, { status: 400 });
  }
  // Empty text means "go back to the built-in default knowledge base".
  await updateSettings({ seoKnowledge: text });
  await logAdminAction(request, {
    action: "update",
    entityType: "settings",
    entityId: null,
    entityLabel: "SEO knowledge base",
  });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db";
import { sendEnquiryEmail } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: a real visitor never fills this hidden field. If it's
  // filled, silently pretend success instead of telling a bot it failed.
  if (body.company) {
    return NextResponse.json({ ok: true });
  }

  const name = (body.name || "").trim().slice(0, 200);
  const email = (body.email || "").trim().slice(0, 200);
  const message = (body.message || "").trim().slice(0, 4000);
  const productName = (body.productName || "").trim().slice(0, 200);

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const settings = await getSettings();
  if (!settings.email) {
    return NextResponse.json(
      { error: "This site has no enquiry email configured yet." },
      { status: 500 }
    );
  }

  const subject = productName
    ? `Website enquiry: ${productName}`
    : `Website enquiry from ${name || "a visitor"}`;

  const text = [
    productName && `Product: ${productName}`,
    name && `Name: ${name}`,
    email && `Email: ${email}`,
    "",
    message,
  ]
    .filter((line) => line !== false && line !== undefined)
    .join("\n");

  try {
    await sendEnquiryEmail({
      to: settings.email,
      replyTo: email || undefined,
      subject,
      text,
    });
  } catch (err) {
    // Full detail (e.g. missing RESEND_API_KEY, Resend API errors) goes to
    // the server log only — a site visitor should never see setup/config
    // errors, just a plain "try the other option" message.
    console.error("Failed to send enquiry email:", err.message);
    return NextResponse.json(
      { error: "Failed to send email right now. Please try WhatsApp instead." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}

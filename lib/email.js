import { Resend } from "resend";

let client;

function getClient() {
  if (!client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY is not set. Copy .env.example to .env.local and add your Resend API key."
      );
    }
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

// Sends one plain-text enquiry email. `replyTo` is set to the visitor's own
// address (when given) so the business can just hit "reply" in their inbox.
export async function sendEnquiryEmail({ to, replyTo, subject, text }) {
  const resend = getClient();
  const from = process.env.ENQUIRY_FROM_EMAIL || "onboarding@resend.dev";

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: replyTo || undefined,
    subject,
    text,
  });

  if (error) {
    throw new Error(error.message || "Failed to send email.");
  }
}

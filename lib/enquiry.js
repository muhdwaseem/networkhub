// Builds WhatsApp / email enquiry links so a customer can ask about a
// product (or the business generally) with zero typing on their end.

export function waLink({ whatsappNumber, businessName }, productName) {
  const digits = (whatsappNumber || "").replace(/[^0-9]/g, "");
  const text = productName
    ? `Hi ${businessName}, I'm interested in: ${productName}. Could you share price and availability?`
    : `Hi ${businessName}, I'd like to enquire about your products.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function mailLink({ email, businessName }, productName) {
  const subject = productName ? `Enquiry: ${productName}` : "Product Enquiry";
  const body = productName
    ? `Hi ${businessName},\n\nI'm interested in: ${productName}. Could you share price and availability?\n\nThanks.`
    : `Hi ${businessName},\n\nI'd like to enquire about your products.\n\nThanks.`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

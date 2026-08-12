// ===== EDIT THIS FILE TO REBRAND THE SITE =====
// Everything client-specific lives here so the rest of the code never needs touching.
const SITE_CONFIG = {
  businessName: "YourTech Trading LLC",       // TODO: replace with real company name
  tagline: "Networking, IT & Security Equipment Supplier",
  whatsappNumber: "971500000000",             // TODO: real WhatsApp number, digits only, no + or spaces
  email: "info@example.com",                  // TODO: real email
  phoneDisplay: "+971 50 000 0000",           // TODO: real phone, formatted for display
  address: "Dubai, United Arab Emirates",     // TODO: real address
  logo: "assets/img/placeholder-logo.svg",    // TODO: replace with real logo file path
  year: new Date().getFullYear()
};

function waLink(productName) {
  const base = productName
    ? `Hi ${SITE_CONFIG.businessName}, I'm interested in: ${productName}. Could you share price and availability?`
    : `Hi ${SITE_CONFIG.businessName}, I'd like to enquire about your products.`;
  return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${encodeURIComponent(base)}`;
}

function mailLink(productName) {
  const subject = productName ? `Enquiry: ${productName}` : "Product Enquiry";
  const body = productName
    ? `Hi,\n\nI'm interested in: ${productName}. Could you share price and availability?\n\nThanks.`
    : `Hi,\n\nI'd like to enquire about your products.\n\nThanks.`;
  return `mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

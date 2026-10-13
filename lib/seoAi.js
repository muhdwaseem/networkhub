import { generateJson } from "./gemini";
import { smartTruncate } from "./seoTemplates";

export const TITLE_MAX = 70;
export const DESCRIPTION_MAX = 160;

// Editable by the admin (Settings blob, key "seoKnowledge") — this is the
// "knowledge base": facts and rules the model must stay inside, so what it
// writes is grounded in how this business actually describes itself rather
// than generic marketing filler. Product-specific facts (specs, brand,
// model) are supplied separately per request.
export const DEFAULT_SEO_KNOWLEDGE = `About the business:
- Supplies networking, structured cabling, fiber optic, CCTV/security, access control, UPS/power, server racks and IT hardware to businesses across the UAE (and Africa).
- Sells single units and bulk orders. There is no online checkout: customers ask for price and availability by WhatsApp or email.
- Products are genuine, sourced from manufacturers and authorised distributors.

Writing rules:
- Buyers search by brand + model number, so lead with them.
- Factual, concise, professional tone. No hype.
- Never claim "best", "cheapest", "lowest price", "guaranteed", "free shipping", warranty terms, certifications, stock levels or prices unless they appear in the product data.
- Never invent specifications, compatibility or numbers. If the data is thin, write a shorter, plainer description rather than padding.`;

const SYSTEM_PROMPT = `You write search-engine metadata (SEO title and meta description) for product pages of an IT/networking equipment supplier.

Hard rules:
1. Use ONLY facts present in PRODUCT DATA and BUSINESS KNOWLEDGE. Do not add specifications, numbers, model names, standards or claims that are not there.
2. Ignore generic filler sentences in the existing description (for example "Standard enterprise grade ... specification compliant with OEM standards") — they carry no information.
3. seoTitle: at most 60 characters where possible (absolute maximum ${TITLE_MAX}). Start with the brand and model/part number when known, then the product type. No ALL CAPS, no promotional words, no trailing site name (the site adds it).
4. metaDescription: 110-155 characters (absolute maximum ${DESCRIPTION_MAX}). Lead with what the product is, include the model/part number and the one or two most useful real specifications, so it is specific to this exact product and differs from similar ones. A call to action is optional: if used, keep it under 6 words and vary it (for example "Request a quote" or "Ask for pricing"); never end every description the same way.
5. There is no online checkout — customers request quotes by WhatsApp or email. Never use "buy", "shop", "order now", "add to cart" or similar. Do not claim the business is in a place or does something that is not in BUSINESS KNOWLEDGE.
6. Plain text only. No quotes around the text, no emojis, no markdown.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    seoTitle: { type: "STRING" },
    metaDescription: { type: "STRING" },
  },
  required: ["seoTitle", "metaDescription"],
};

const PROMOTIONAL = /\b(best|cheapest|lowest price|#1|number one|guarantee[d]?|free shipping|unbeatable|top[- ]rated|buy|shop|order now|order the|order your|add to cart)\b/i;
// Filler that sounds like marketing but says nothing checkable. Not banned —
// just flagged so the reviewer can trim it.
const GENERIC_FLUFF = /\b(reliable|high[- ]performance|high[- ]speed|boost|seamless|robust|premium|cutting[- ]edge|ideal|perfect|powerful|state[- ]of[- ]the[- ]art|top[- ]notch)\b/gi;
// Tokens that contain a digit: model numbers, capacities, voltages, sizes…
// These are exactly the things a model is most likely to hallucinate.
const DIGIT_TOKEN = /[A-Za-z0-9][A-Za-z0-9\-/.]*\d[A-Za-z0-9\-/.]*/g;

function normalizeToken(token) {
  return token.toLowerCase().replace(/[.\-/]+$/g, "");
}

function buildProductBlock(product) {
  const specs = (product.specs || []).filter(Boolean);
  return [
    `Name: ${product.name || ""}`,
    `Brand: ${product.brand || "(none)"}`,
    `Category: ${product.category || ""}`,
    `SKU / part number: ${product.sku || "(none)"}`,
    `Specifications:\n${specs.length ? specs.map((s) => `- ${s}`).join("\n") : "(none listed)"}`,
    `Existing description: ${product.description || "(none)"}`,
  ].join("\n");
}

// Returns { seoTitle, metaDescription, warnings[] }. Warnings don't block —
// they tell the reviewing admin what to double-check before approving:
// over-length text that had to be trimmed, promotional claims, and any
// figure/model token in the output that isn't present in the source data
// (the main way a language model gets a product page wrong).
export async function suggestSeoForProduct(product, { businessName, address, knowledge } = {}) {
  const knowledgeText = (knowledge || DEFAULT_SEO_KNOWLEDGE).trim();
  const productBlock = buildProductBlock(product);

  const prompt = `BUSINESS KNOWLEDGE\nBusiness: ${businessName || "the supplier"}${address ? ` — ${address}` : ""}\n${knowledgeText}\n\nPRODUCT DATA\n${productBlock}\n\nWrite the SEO title and meta description for this product.`;

  const raw = await generateJson({ system: SYSTEM_PROMPT, prompt, schema: RESPONSE_SCHEMA });
  const warnings = [];

  let seoTitle = String(raw.seoTitle || "").replace(/\s+/g, " ").trim();
  let metaDescription = String(raw.metaDescription || "").replace(/\s+/g, " ").trim();
  if (!seoTitle || !metaDescription) throw new Error("The model returned an empty title or description.");

  if (seoTitle.length > TITLE_MAX) {
    seoTitle = smartTruncate(seoTitle, TITLE_MAX - 4);
    warnings.push("Title was over 70 characters and was shortened — check it still reads well.");
  }
  if (metaDescription.length > DESCRIPTION_MAX) {
    metaDescription = smartTruncate(metaDescription, DESCRIPTION_MAX - 3);
    warnings.push("Description was over 160 characters and was shortened — check it still reads well.");
  }

  const sourceCorpus = `${productBlock}\n${knowledgeText}`.toLowerCase();
  const output = `${seoTitle} ${metaDescription}`;

  const ungrounded = [
    ...new Set((output.match(DIGIT_TOKEN) || []).map(normalizeToken).filter((t) => t && !sourceCorpus.includes(t))),
  ];
  if (ungrounded.length > 0) {
    warnings.push(`Contains figures/models not found in the product data: ${ungrounded.join(", ")}. Verify before approving.`);
  }

  const promo = output.match(PROMOTIONAL);
  if (promo && !sourceCorpus.includes(promo[0].toLowerCase())) {
    warnings.push(`Uses a promotional claim ("${promo[0]}") that isn't in the product data.`);
  }

  const fluff = [...new Set((output.match(GENERIC_FLUFF) || []).map((w) => w.toLowerCase()))].filter(
    (w) => !sourceCorpus.includes(w)
  );
  if (fluff.length > 0) {
    warnings.push(`Generic wording not backed by the product data: ${fluff.join(", ")}.`);
  }

  return { seoTitle, metaDescription, warnings };
}

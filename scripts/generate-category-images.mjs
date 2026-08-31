// One-off generator for the 5 homepage category hero photos we don't have
// real product photography for. Uses Gemini's image-generation model to
// match the style of the 3 user-supplied reference photos (a clean
// product-photography collage of several real-brand devices on a plain
// background, no text overlay - the site draws its own label on top).
//
// Usage:
//   node scripts/generate-category-images.mjs
//
// Reads GEMINI_API_KEY from .env.local. Writes straight into
// public/images/placeholders/ as <slug>.jpg. Not part of the app's runtime
// - run by hand whenever a new category needs a hero photo.
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const env = {};
  const text = fs.readFileSync(path.resolve(".env.local"), "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const idx = t.indexOf("=");
    env[t.slice(0, idx)] = t.slice(idx + 1);
  }
  return env;
}

const env = loadEnv();
const API_KEY = env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}

const MODEL = "gemini-2.5-flash-image";
const OUT_DIR = path.resolve("public/images/placeholders");

const TARGETS = [
  {
    slug: "copper-fiber-cabling",
    prompt:
      "A clean e-commerce product photo collage of 6-8 different networking cable products: coiled Cat6 copper ethernet cable spools, a bundle of colorful fiber optic patch cords, an RJ45 connector, and a small fiber optic distribution panel. Arranged neatly in a grid on a plain white studio background, professional product photography, soft even lighting, no text or logos, no watermark.",
  },
  {
    slug: "patch-cords",
    prompt:
      "A clean e-commerce product photo collage of 6-8 ethernet patch cords in different colors (blue, yellow, gray, red, green) coiled neatly, each showing a clear RJ45 connector end, on a plain white studio background, professional product photography, soft even lighting, no text or logos, no watermark.",
  },
  {
    slug: "routers-gateways",
    prompt:
      "A clean e-commerce product photo collage of 6-8 different network router and gateway devices from well-known enterprise brands, small rectangular boxes with antennas and status LEDs, arranged in a grid on a plain white studio background, professional product photography, soft even lighting, no text overlay, no watermark.",
  },
  {
    slug: "nas-hard-drives",
    prompt:
      "A clean e-commerce product photo collage of 6-8 internal 3.5 inch hard disk drives (bare drives, visible circuit board and label on top, no enclosure) from different well-known storage brands, arranged in a grid on a plain white studio background, professional product photography, soft even lighting, no text overlay, no watermark.",
  },
  {
    slug: "floor-server-racks",
    prompt:
      "A clean e-commerce product photo collage of 3-4 tall floor-standing server rack cabinets (42U style, black, with glass or perforated doors), shown at an angle, arranged side by side on a plain light gray studio background, professional product photography, soft even lighting, no text overlay, no watermark.",
  },
];

async function generateOne(target) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: target.prompt }] }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p.inlineData?.data);
  if (!imagePart) {
    throw new Error(`No image data in response: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return Buffer.from(imagePart.inlineData.data, "base64");
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const target of TARGETS) {
    const dest = path.join(OUT_DIR, `${target.slug}.jpg`);
    try {
      console.log(`Generating ${target.slug} ...`);
      const bytes = await generateOne(target);
      fs.writeFileSync(dest, bytes);
      console.log(`  ok  ${dest} (${(bytes.length / 1024).toFixed(0)}KB)`);
    } catch (err) {
      console.error(`  FAILED ${target.slug}: ${err.message}`);
    }
  }
}

main();

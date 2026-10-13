// Thin server-side client for Google's Gemini (AI Studio) generateContent API.
// Server-only: the key comes from GOOGLE_AI_STUDIO_API_KEY (no NEXT_PUBLIC_
// prefix, so it can never be bundled into browser code) and is sent in a
// header, not the URL, so it doesn't end up in request logs.

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
// Flash-Lite: fast (1-4s), cheapest tier, and plenty for short structured text
// grounded in the product data we hand it. The "-latest" alias follows
// Google's newest Flash-Lite, so this keeps working as old versions retire
// (gemini-2.5-flash and -flash-lite already stopped working for new API
// keys, and the full Flash models were returning 503/timeouts under load
// when this was built). Output is validated and admin-reviewed before it's
// saved, so tracking the latest is an acceptable trade. Pin an exact model
// with the GEMINI_SEO_MODEL env var if you ever need reproducible output.
const DEFAULT_MODEL = "gemini-flash-lite-latest";
const MAX_ATTEMPTS = 3;

export function isGeminiConfigured() {
  return Boolean(process.env.GOOGLE_AI_STUDIO_API_KEY);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Asks the model for a JSON object matching `schema` (Gemini's OpenAPI-style
// schema subset) and returns it parsed. Retries rate limits (429) and
// transient server errors (5xx) with backoff; anything else fails fast so a
// bad key or bad request is reported instead of retried.
export async function generateJson({ system, prompt, schema, temperature = 0.3 }) {
  const key = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!key) throw new Error("GOOGLE_AI_STUDIO_API_KEY is not set.");
  const model = process.env.GEMINI_SEO_MODEL || DEFAULT_MODEL;

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res;
    try {
      res = await fetch(`${API_ROOT}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      });
    } catch (err) {
      lastError = new Error(`Gemini request failed: ${err.message}`);
      await sleep(1000 * attempt);
      continue;
    }

    if (res.ok) {
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      if (!text) {
        const reason = json.promptFeedback?.blockReason || json.candidates?.[0]?.finishReason || "empty response";
        throw new Error(`Gemini returned no content (${reason}).`);
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Gemini returned malformed JSON.");
      }
    }

    const detail = await res.text().catch(() => "");
    lastError = new Error(`Gemini API ${res.status}: ${detail.slice(0, 200)}`);
    if (res.status === 429 || res.status >= 500) {
      await sleep(1500 * attempt);
      continue;
    }
    throw lastError;
  }
  throw lastError;
}

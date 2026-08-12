import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Copy .env.example to .env.local and set a value."
    );
  }
  return secret;
}

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(body) {
  return createHmac("sha256", getSecret()).update(body).digest("base64url");
}

// token = base64url(json payload) + "." + hmac signature of that string
export function createSessionToken(username) {
  const payload = { u: username, exp: Date.now() + SESSION_TTL_MS };
  const body = base64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

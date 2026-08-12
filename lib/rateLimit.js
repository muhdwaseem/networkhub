// In-memory login attempt limiter. This process is a single long-running
// Node server (not serverless), so an in-memory Map is enough — no external
// store needed for a single-admin small-business app.
const attempts = new Map(); // key -> { count, firstAttemptAt, lockedUntil }

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function getEntry(key) {
  const entry = attempts.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    attempts.delete(key);
    return null;
  }
  if (!entry.lockedUntil && now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.delete(key);
    return null;
  }
  return entry;
}

export function checkRateLimit(key) {
  const entry = getEntry(key);
  if (entry?.lockedUntil) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
  }
  return { allowed: true };
}

export function recordFailedAttempt(key) {
  const now = Date.now();
  const entry = getEntry(key) || { count: 0, firstAttemptAt: now };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  attempts.set(key, entry);
}

export function recordSuccess(key) {
  attempts.delete(key);
}

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, recordSuccess, getClientIp } from "@/lib/rateLimit";

export async function POST(request) {
  const clientIp = getClientIp(request);
  const limit = checkRateLimit(clientIp);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed login attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
      },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { username, password } = body || {};
  const adminUser = process.env.ADMIN_USERNAME;
  const adminHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminUser || !adminHash) {
    return NextResponse.json(
      {
        error:
          "Admin account is not configured on the server. Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH in .env.local.",
      },
      { status: 500 }
    );
  }

  const validUsername =
    typeof username === "string" &&
    username.trim().toLowerCase() === adminUser.trim().toLowerCase();
  const validPassword =
    typeof password === "string" && bcrypt.compareSync(password, adminHash);

  if (!validUsername || !validPassword) {
    recordFailedAttempt(clientIp);
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  recordSuccess(clientIp);
  const token = createSessionToken(adminUser);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request) {
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
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

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

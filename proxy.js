import { NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getClientIp } from "@/lib/rateLimit";

// Deters bulk scraping of the catalog (crawling every /products/[id] page to
// harvest image URLs before they expire - see lib/upload.js's signed-URL
// comment) without touching real shoppers or search engines. Deliberately
// scoped to product PAGE views, not the /_next/image optimizer route itself:
// a single normal product-listing view already fires ~24 image requests, so
// throttling images directly at any threshold tight enough to matter would
// break ordinary browsing. Throttling page views instead works because a
// scraper can't discover new products (and their image URLs) faster than it
// can load new product/listing pages.
//
// Backed by Upstash Redis rather than an in-memory counter because Vercel's
// serverless functions don't share memory across instances - see
// lib/rateLimit.js's header comment, which assumes a single long-running
// process and is fine for that file's low-volume login-attempt use case, but
// wouldn't reliably count a scraper spread across concurrent requests here.
//
// Fails open: with no Upstash credentials configured, every request is
// waved through untouched. That keeps local dev and any deploy working with
// zero setup, and means an Upstash outage degrades to "no rate limiting"
// rather than taking the site down. See README.md's "Bot / scraping
// protection setup" for how to turn this on.
const CRAWLER_USER_AGENTS = ["googlebot", "bingbot", "duckduckbot", "slurp", "baiduspider", "yandexbot"];

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const ratelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "60 s"),
      prefix: "catalog-ratelimit",
    })
  : null;

async function rateLimitProducts(request) {
  if (!ratelimit) return NextResponse.next();

  const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
  if (CRAWLER_USER_AGENTS.some((bot) => userAgent.includes(bot))) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const { success, reset } = await ratelimit.limit(ip);
  if (!success) {
    const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  return NextResponse.next();
}

// Guards every /admin page and /api/admin route. The login page and login
// API must stay open, obviously, or nobody could ever sign in.
function guardAdmin(request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);

  if (!session) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// A single project may only export one proxy function - see the matcher
// below for the exact set of paths this dispatches across.
export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return guardAdmin(request);
  }

  if (pathname.startsWith("/products")) {
    return rateLimitProducts(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/products/:path*"],
};

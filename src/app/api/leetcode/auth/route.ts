/**
 * POST /api/leetcode/auth
 *
 * Accepts { username, password } → authenticates with LeetCode →
 * returns { sessionToken }. Runs on Vercel (AWS Lambda), which is not
 * blocked by LeetCode's Cloudflare bot protection.
 *
 * The Worker proxy is only used for GraphQL / problems (no auth issues there).
 */

import { NextRequest, NextResponse } from "next/server";

const LEETCODE_LOGIN  = "https://leetcode.com/accounts/login/";
const LEETCODE_ORIGIN = "https://leetcode.com";

// Realistic desktop Chrome UA — avoids mobile-specific bot filters
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors() });
}

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON {username, password}" }, { status: 400, headers: cors() });
  }

  const { username, password } = body;
  if (!username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "username and password are required" }, { status: 400, headers: cors() });
  }

  // ── Step 1: GET /accounts/login/ for csrftoken ────────────────────────────
  let csrfToken: string;
  let rawCookieHeader: string;

  try {
    const loginPage = await fetch(LEETCODE_LOGIN, {
      method: "GET",
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    // Collect all Set-Cookie values — fetch in Node merges them with commas
    const setCookieRaw = loginPage.headers.get("set-cookie") ?? "";

    // Try direct cookie header
    let match = setCookieRaw.match(/csrftoken=([^;,\s]+)/);

    if (!match) {
      // Parse HTML for the hidden input as final fallback
      const html = await loginPage.text();
      const htmlMatch = html.match(/csrfmiddlewaretoken[^>]+value="([^"]+)"/);
      if (!htmlMatch) {
        return NextResponse.json(
          { error: "Could not obtain CSRF token. LeetCode may have changed their login flow." },
          { status: 502, headers: cors() }
        );
      }
      csrfToken = htmlMatch[1];
      rawCookieHeader = `csrftoken=${csrfToken}`;
    } else {
      csrfToken = match[1];
      // Preserve all cookies returned by LeetCode for the login POST
      rawCookieHeader = setCookieRaw
        .split(/,(?=[^;]*=)/)
        .map((c) => c.split(";")[0].trim())
        .join("; ");
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Network error reaching LeetCode", detail: String(err) },
      { status: 502, headers: cors() }
    );
  }

  // ── Step 2: POST login with form-encoded body ─────────────────────────────
  let loginResp: Response;
  try {
    const formBody = new URLSearchParams({
      csrfmiddlewaretoken: csrfToken,
      login: username.trim(),
      password,
      next: "/",
    }).toString();

    loginResp = await fetch(LEETCODE_LOGIN, {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": LEETCODE_LOGIN,
        "Origin": LEETCODE_ORIGIN,
        "Cookie": rawCookieHeader,
        "x-csrftoken": csrfToken,
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: formBody,
      redirect: "manual", // capture the Set-Cookie on the 302 before following
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Network error posting login", detail: String(err) },
      { status: 502, headers: cors() }
    );
  }

  // ── Step 3: extract LEETCODE_SESSION ─────────────────────────────────────
  const allSetCookie = loginResp.headers.get("set-cookie") ?? "";
  let sessionToken: string | null = null;

  // Standard match
  const sm = allSetCookie.match(/LEETCODE_SESSION=([^;,\s]+)/);
  if (sm) sessionToken = sm[1];

  if (!sessionToken) {
    const status   = loginResp.status;
    const location = loginResp.headers.get("location") ?? "";

    if (status === 302 && location.includes("/accounts/login/")) {
      return NextResponse.json(
        { error: "Invalid username or password. Please check your LeetCode credentials." },
        { status: 401, headers: cors() }
      );
    }
    if (status === 200) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401, headers: cors() }
      );
    }

    return NextResponse.json(
      {
        error: `LeetCode returned HTTP ${status}. Session not found in response.`,
        detail: allSetCookie.slice(0, 200),
      },
      { status: 502, headers: cors() }
    );
  }

  // ✅ Password is NEVER stored — return only the session token
  return NextResponse.json({ sessionToken }, { headers: cors() });
}

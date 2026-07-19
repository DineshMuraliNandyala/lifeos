/**
 * LifeOS — LeetCode GraphQL Proxy + Auth Broker
 *
 * Routes:
 *   POST /                → GraphQL proxy (leetcode.com/graphql)
 *   GET  /problems        → Full problem list (leetcode.com/api/problems/all/)
 *   POST /auth/leetcode   → Login broker: accepts {username, password},
 *                           authenticates with LeetCode, returns {sessionToken}
 *                           Password is NEVER stored — only the session token
 *                           is returned to the client.
 *
 * Deploy: wrangler deploy
 */

const LEETCODE_GQL      = "https://leetcode.com/graphql";
const LEETCODE_PROBLEMS = "https://leetcode.com/api/problems/all/";
const LEETCODE_LOGIN    = "https://leetcode.com/accounts/login/";
const LEETCODE_ORIGIN   = "https://leetcode.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Leetcode-Session",
};

// Realistic Android browser UA — reduces bot-detection hits
const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";

function baseHeaders(session?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Referer:      LEETCODE_ORIGIN,
    Origin:       LEETCODE_ORIGIN,
    "User-Agent": USER_AGENT,
    "Accept-Language": "en-US,en;q=0.9",
  };
  if (session) h["Cookie"] = `LEETCODE_SESSION=${session}`;
  return h;
}

function json400(msg: string): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function json502(msg: string, detail?: string): Response {
  return new Response(JSON.stringify({ error: msg, detail }), {
    status: 502,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ---------------------------------------------------------------------------
// LeetCode Login Flow  (fixed v2)
//
// Step 1: GET /accounts/login/ to obtain a fresh csrftoken cookie.
//         Using the login page specifically (not /) because it always
//         returns the csrf cookie even without JS execution.
// Step 2: POST /accounts/login/ with x-www-form-urlencoded body.
//         LeetCode's Django backend expects form data, NOT JSON.
// Step 3: Parse LEETCODE_SESSION from Set-Cookie on the 302 redirect.
// ---------------------------------------------------------------------------

async function handleLeetCodeAuth(request: Request): Promise<Response> {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return json400("Request body must be JSON with {username, password}");
  }

  const { username, password } = body;
  if (!username || !password) {
    return json400("Both username and password are required");
  }

  // ── Step 1: GET the login page to extract csrftoken ───────────────────────
  let csrfToken: string;
  let csrfCookieHeader: string;
  try {
    const loginPage = await fetch(LEETCODE_LOGIN, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    // Try Set-Cookie header first
    const setCookie = loginPage.headers.get("set-cookie") ?? "";
    let match = setCookie.match(/csrftoken=([^;,\s]+)/);

    if (!match) {
      // Cloudflare Workers sometimes merge Set-Cookie; iterate all headers
      for (const [key, val] of loginPage.headers.entries()) {
        if (key.toLowerCase() === "set-cookie") {
          match = val.match(/csrftoken=([^;,\s]+)/);
          if (match) break;
        }
      }
    }

    if (!match) {
      // Last resort: parse the HTML body for the csrf token in the form
      const html = await loginPage.text();
      const htmlMatch = html.match(/csrfmiddlewaretoken['"]\s+value=['"]([^'"]+)/);
      if (!htmlMatch) {
        return json502(
          "Could not obtain CSRF token from LeetCode. " +
          "LeetCode may be blocking automated logins. " +
          "Try copying your session cookie manually from the browser."
        );
      }
      csrfToken = htmlMatch[1];
      csrfCookieHeader = `csrftoken=${csrfToken}`;
    } else {
      csrfToken = match[1];
      csrfCookieHeader = `csrftoken=${csrfToken}`;
    }
  } catch (err) {
    return json502("Network error reaching LeetCode login page", String(err));
  }

  // ── Step 2: POST login with form-encoded body (NOT JSON) ──────────────────
  let loginResp: Response;
  try {
    // Django expects application/x-www-form-urlencoded, not JSON
    const formBody = new URLSearchParams({
      csrfmiddlewaretoken: csrfToken,
      login: username,
      password: password,
      next: "/",
    }).toString();

    loginResp = await fetch(LEETCODE_LOGIN, {
      method: "POST",
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": csrfCookieHeader,
        "x-csrftoken": csrfToken,
        "Referer": LEETCODE_LOGIN,
      },
      body: formBody,
      redirect: "manual", // capture the 302 Set-Cookie before following
    });
  } catch (err) {
    return json502("Network error during LeetCode login POST", String(err));
  }

  // ── Step 3: extract LEETCODE_SESSION from Set-Cookie ─────────────────────
  let sessionToken: string | null = null;

  // Try the standard .get() first
  const allCookies = loginResp.headers.get("set-cookie") ?? "";
  const sessionMatch = allCookies.match(/LEETCODE_SESSION=([^;,\s]+)/);
  if (sessionMatch) {
    sessionToken = sessionMatch[1];
  } else {
    // Iterate all headers (Workers expose them all via entries())
    for (const [key, val] of loginResp.headers.entries()) {
      if (key.toLowerCase() === "set-cookie" && val.includes("LEETCODE_SESSION")) {
        const m = val.match(/LEETCODE_SESSION=([^;,\s]+)/);
        if (m) { sessionToken = m[1]; break; }
      }
    }
  }

  if (!sessionToken) {
    const status = loginResp.status;
    // 302 to /accounts/login/ means bad credentials; 302 elsewhere = success
    const location = loginResp.headers.get("location") ?? "";
    if (status === 302 && location.includes("/accounts/login/")) {
      return new Response(
        JSON.stringify({ error: "Invalid username or password. Please check your LeetCode credentials." }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    if (status === 200) {
      return new Response(
        JSON.stringify({ error: "Invalid username or password." }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    return json502(
      `LeetCode returned HTTP ${status}. The session cookie was not found.`,
      `Location: ${location} | Set-Cookie: ${allCookies.slice(0, 120)}`
    );
  }

  // ✅ Success — return only the session token, password is NEVER stored
  return new Response(
    JSON.stringify({ sessionToken }),
    { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
  );
}

// ---------------------------------------------------------------------------
// Worker entry point
// ---------------------------------------------------------------------------

const worker = {
  async fetch(request: Request): Promise<Response> {
    const url     = new URL(request.url);
    const session = request.headers.get("X-Leetcode-Session");

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── POST /auth/leetcode ───────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === "/auth/leetcode") {
      return handleLeetCodeAuth(request);
    }

    // ── GET /problems ─────────────────────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/problems") {
      let resp: Response;
      try {
        resp = await fetch(LEETCODE_PROBLEMS, {
          headers: { ...baseHeaders(session), "Accept": "application/json" },
        });
      } catch (err) {
        return json502("Failed to reach leetcode.com/api/problems/all/", String(err));
      }
      return new Response(await resp.text(), {
        status: resp.status,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // ── POST / — GraphQL proxy ────────────────────────────────────────────
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Supported: POST /, POST /auth/leetcode, GET /problems" }),
        { status: 405, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    let body: string;
    try {
      body = await request.text();
      JSON.parse(body);
    } catch {
      return json400("Invalid JSON body");
    }

    let lcResp: Response;
    try {
      lcResp = await fetch(LEETCODE_GQL, {
        method: "POST",
        headers: {
          ...baseHeaders(session),
          "Content-Type": "application/json",
          "x-csrftoken": "csrftoken",
        },
        body,
      });
    } catch (err) {
      return json502("Failed to reach leetcode.com/graphql", String(err));
    }

    return new Response(await lcResp.text(), {
      status: lcResp.status,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  },
};

export default worker;

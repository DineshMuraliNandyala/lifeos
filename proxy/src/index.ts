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
 * All routes forward X-Leetcode-Session as Cookie: LEETCODE_SESSION=...
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

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

// ---------------------------------------------------------------------------
// Header builder
// ---------------------------------------------------------------------------

function baseHeaders(session?: string | null): Record<string, string> {
  const h: Record<string, string> = {
    Referer: LEETCODE_ORIGIN,
    Origin:  LEETCODE_ORIGIN,
    "User-Agent": USER_AGENT,
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
// LeetCode Login Flow
//
// Step 1: GET leetcode.com to obtain a fresh csrftoken cookie
// Step 2: POST accounts/login/ with credentials + CSRF token
// Step 3: Parse LEETCODE_SESSION from Set-Cookie on the response
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

  // ── Step 1: get a fresh CSRF token ────────────────────────────────────────
  let csrfToken: string;
  try {
    const csrf = await fetch(LEETCODE_ORIGIN + "/", {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
    const setCookie = csrf.headers.get("set-cookie") ?? "";
    const match = setCookie.match(/csrftoken=([^;]+)/);
    if (!match) {
      return json502("Failed to obtain CSRF token from LeetCode");
    }
    csrfToken = match[1];
  } catch (err) {
    return json502("Network error reaching LeetCode", String(err));
  }

  // ── Step 2: POST login ───────────────────────────────────────────────────
  let loginResp: Response;
  try {
    loginResp = await fetch(LEETCODE_LOGIN, {
      method: "POST",
      headers: {
        ...baseHeaders(),
        "Content-Type": "application/json",
        "Cookie": `csrftoken=${csrfToken}`,
        "x-csrftoken": csrfToken,
        "Referer": LEETCODE_ORIGIN + "/accounts/login/",
      },
      body: JSON.stringify({ login: username, password }),
      redirect: "manual",
    });
  } catch (err) {
    return json502("Network error during LeetCode login", String(err));
  }

  // ── Step 3: extract LEETCODE_SESSION ─────────────────────────────────────
  // LeetCode returns 302 on success; session is in the Set-Cookie header.
  const allCookies = loginResp.headers.get("set-cookie") ?? "";

  // Cloudflare Workers may only see the first Set-Cookie header via .get().
  // Try the raw headers iterator as a fallback.
  let sessionToken: string | null = null;
  const sessionMatch = allCookies.match(/LEETCODE_SESSION=([^;]+)/);
  if (sessionMatch) {
    sessionToken = sessionMatch[1];
  } else {
    // Iterate all headers (Workers expose them all)
    for (const [key, val] of loginResp.headers.entries()) {
      if (key.toLowerCase() === "set-cookie" && val.includes("LEETCODE_SESSION")) {
        const m = val.match(/LEETCODE_SESSION=([^;]+)/);
        if (m) { sessionToken = m[1]; break; }
      }
    }
  }

  if (!sessionToken) {
    // 401/400 → wrong credentials
    const status = loginResp.status;
    if (status === 401 || status === 400 || status === 200) {
      // LeetCode returns 200 with an error page on bad credentials
      return new Response(
        JSON.stringify({ error: "Invalid username or password. Check your LeetCode credentials." }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }
    return json502(`LeetCode login returned ${status} — could not extract session`, allCookies.slice(0, 200));
  }

  // Success — return only the session token, NEVER the password
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
    const url = new URL(request.url);
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

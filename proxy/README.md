# LeetCode Proxy — Deployment Guide

A minimal Cloudflare Worker that forwards GraphQL requests from the LifeOS PWA to
`leetcode.com/graphql`, adding the headers LeetCode requires that CORS policy prevents
the browser from sending directly.

---

## Prerequisites

- A Cloudflare account (free tier is sufficient — sign up at https://dash.cloudflare.com)
- Node.js ≥ 18

---

## Deploy in 4 steps

### 1. Install Wrangler (Cloudflare's CLI)

```bash
npm install -g wrangler
```

### 2. Log in to Cloudflare

```bash
cd proxy          # run this from the LifeOS repo root
wrangler login    # opens a browser to authenticate
```

### 3. Deploy the Worker

```bash
npm install       # installs local devDependencies (wrangler, workers-types)
npm run deploy    # equivalent to: wrangler deploy
```

You'll see output like:

```
Deployed lifeos-leetcode-proxy triggers:
  https://lifeos-leetcode-proxy.<your-subdomain>.workers.dev
```

Copy that URL.

### 4. Add the URL to LifeOS

Create (or edit) `.env.local` in the **LifeOS repo root** (not inside `proxy/`):

```env
NEXT_PUBLIC_LEETCODE_PROXY_URL=https://lifeos-leetcode-proxy.<your-subdomain>.workers.dev
```

Then restart the dev server (`npm run dev`) or rebuild (`npm run build`).

---

## Local development (optional)

To test the Worker locally before deploying:

```bash
cd proxy
npm run dev   # starts wrangler dev at http://localhost:8787
```

Then temporarily set:

```env
NEXT_PUBLIC_LEETCODE_PROXY_URL=http://localhost:8787
```

---

## How it works

The Worker accepts a `POST /` request with a JSON body:

```json
{ "query": "...", "variables": { "username": "...", "limit": 20 } }
```

It forwards this to `https://leetcode.com/graphql` with the required headers, then
returns the response JSON with `Access-Control-Allow-Origin: *` so the browser can
read it.

---

## Limitations

- **`recentAcSubmissionList` is capped at 20** by LeetCode's API. Each auto-sync
  imports up to 20 of your most recent AC submissions. Older problems can be added
  manually via the "+ Add" button on the Placement tab.
- LeetCode's GraphQL API is **unofficial** — it's the same endpoint their own website
  uses, but it has no SLA and LeetCode can change it without notice.
- If your LeetCode profile is set to **private**, public queries will return empty
  results. Make sure your profile is set to public in LeetCode settings.

---

## Cost

Cloudflare Workers free tier includes **100,000 requests/day**. LifeOS syncs at most
once per 60 minutes, so even with 100 users this is far below the limit.

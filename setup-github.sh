#!/usr/bin/env bash
# LifeOS — GitHub repo setup script
# Run this once from your terminal:
#   chmod +x setup-github.sh && ./setup-github.sh

set -e

# ── Ensure gh CLI is on PATH ─────────────────────────────────────────────────
export PATH=~/.local/bin:$PATH

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║         LifeOS GitHub Repository Setup              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Step 1: Authenticate ─────────────────────────────────────────────────────
if ! gh auth status &>/dev/null; then
  echo "▸ Opening GitHub login in your browser..."
  gh auth login --web --git-protocol https
else
  echo "✓ Already authenticated as: $(gh auth status --active 2>&1 | grep -oP 'Logged in to github.com account \K\S+')"
fi

# ── Step 2: Create the repo ──────────────────────────────────────────────────
echo ""
echo "▸ Creating GitHub repository: DineshMuraliNandyala/lifeos"

gh repo create lifeos \
  --public \
  --description "LifeOS — Offline-first personal OS PWA (placement prep, fitness, daily reflection). Liquid glass UI · Next.js 16 · Dexie/IndexedDB · Cloudflare Workers" \
  --source=. \
  --remote=origin \
  --push

echo ""
echo "✅ Done! Repository live at:"
echo "   https://github.com/DineshMuraliNandyala/lifeos"
echo ""
echo "▸ Connecting Vercel to GitHub for auto-deploys..."
echo "   Go to: https://vercel.com/dineshs-projects-0d16e156/lifeos/settings/git"
echo "   Click 'Connect Git Repository' → select 'DineshMuraliNandyala/lifeos'"
echo "   Every push to main will auto-deploy to production."
echo ""
echo "▸ Add your env vars to Vercel dashboard:"
echo "   NEXT_PUBLIC_LEETCODE_PROXY_URL = https://lifeos-leetcode-proxy.lifeos-leetcode.workers.dev"
echo "   NEXT_PUBLIC_GOOGLE_CLIENT_ID   = (after you set up Google Cloud)"

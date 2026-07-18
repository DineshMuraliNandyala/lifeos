"use client";

import { db } from "@/lib/db";
import { toLocalISODate } from "@/lib/date";
import { SPACED_REPETITION_INTERVALS_DAYS } from "@/lib/db/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PROXY_URL = process.env.NEXT_PUBLIC_LEETCODE_PROXY_URL ?? "";
const SYNC_THROTTLE_MS = 60 * 60 * 1000; // 60 minutes
const LS_KEY = "lc_last_sync";

// ---------------------------------------------------------------------------
// GraphQL — used only for profile stats (totalAC count display)
// ---------------------------------------------------------------------------

const STATS_QUERY = /* graphql */ `
  query userStats($username: String!) {
    matchedUser(username: $username) {
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

// ---------------------------------------------------------------------------
// REST API response types (leetcode.com/api/problems/all/)
// ---------------------------------------------------------------------------

interface LCStatEntry {
  stat: {
    question_id: number;
    frontend_question_id: number;
    question__title: string;
    question__title_slug: string;
    question__hide: boolean;
  };
  status: "ac" | "notac" | null;
  difficulty: {
    level: 1 | 2 | 3; // 1=Easy, 2=Medium, 3=Hard
  };
  paid_only: boolean;
}

interface LCProblemsAllResponse {
  num_solved: number;
  num_total: number;
  stat_status_pairs: LCStatEntry[];
}

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface SyncResult {
  status: "synced" | "throttled" | "no_config" | "no_username" | "no_session" | "error";
  newCount: number;
  totalAC?: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function difficultyFromLevel(level: 1 | 2 | 3): "Easy" | "Medium" | "Hard" {
  if (level === 1) return "Easy";
  if (level === 3) return "Hard";
  return "Medium";
}

async function fetchAllAcProblems(
  sessionToken: string | null
): Promise<{ entries: LCStatEntry[]; numSolved: number }> {
  const headers: Record<string, string> = {};
  if (sessionToken) {
    headers["X-Leetcode-Session"] = sessionToken;
  }

  const res = await fetch(`${PROXY_URL}/problems`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Proxy /problems returned ${res.status}: ${await res.text()}`);
  }

  const json: LCProblemsAllResponse = await res.json();

  if (!Array.isArray(json.stat_status_pairs)) {
    throw new Error(
      "Unexpected response from /problems — stat_status_pairs missing. " +
      "Check that LEETCODE_SESSION is valid and your profile is public."
    );
  }

  const acEntries = json.stat_status_pairs.filter(
    (e) => e.status === "ac" && !e.stat.question__hide
  );

  return { entries: acEntries, numSolved: json.num_solved ?? acEntries.length };
}

async function fetchProfileStats(
  username: string,
  sessionToken: string | null
): Promise<number | undefined> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sessionToken) headers["X-Leetcode-Session"] = sessionToken;

    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: STATS_QUERY, variables: { username } }),
    });
    if (!res.ok) return undefined;

    const json = await res.json();
    const counts: Array<{ difficulty: string; count: number }> =
      json?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum ?? [];
    return counts.reduce((s, d) => s + d.count, 0);
  } catch {
    return undefined;
  }
}

function isThrottled(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < SYNC_THROTTLE_MS;
  } catch {
    return false;
  }
}

function markSynced() {
  try {
    localStorage.setItem(LS_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable in some environments — silently ignore
  }
}

/** Reset the throttle. Exposed for the manual "Sync now" button. */
export function resetSyncThrottle() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

/**
 * Full history sync using LeetCode's REST endpoint.
 *
 * Strategy:
 *   1. GET {proxy}/problems → leetcode.com/api/problems/all/
 *      Returns ALL ~3000 problems with per-user solve status in one request.
 *      Filter to status === "ac" → up to 577 (or however many you've solved).
 *   2. Dedup against existing DB by leetcodeSlug.
 *   3. Bulk-write new Problem + SpacedRevision rows.
 *      Topics are empty [] for bulk-imported problems (REST doesn't include them).
 *   4. Profile stats (totalAC count) fetched separately via GraphQL for the
 *      header display.
 *
 * Idempotent — deduplicates by leetcodeSlug. Throttled to once per 60 min
 * via localStorage; call with force=true to bypass.
 */
export async function syncLeetCode(
  username: string,
  options?: { force?: boolean; sessionToken?: string | null }
): Promise<SyncResult> {
  if (!PROXY_URL) {
    return { status: "no_config", newCount: 0 };
  }

  if (!options?.force && isThrottled()) {
    return { status: "throttled", newCount: 0 };
  }

  const session = options?.sessionToken ?? null;

  // ── Phase 1: fetch full AC problem list from REST ─────────────────────────
  let acEntries: LCStatEntry[];
  let totalAC: number | undefined;

  try {
    const result = await fetchAllAcProblems(session);
    acEntries = result.entries;
    totalAC = result.numSolved;
  } catch (err) {
    const msg = String(err);
    // Distinguish "no session" from other errors
    if (
      msg.includes("stat_status_pairs missing") ||
      msg.includes("LEETCODE_SESSION")
    ) {
      return { status: "no_session", newCount: 0, error: msg };
    }
    return { status: "error", newCount: 0, error: msg };
  }

  // Also try to get the precise totalAC from GraphQL (it's the same number
  // but the profile stats include difficulty breakdown in future UI use)
  const gqlTotal = await fetchProfileStats(username, session);
  if (gqlTotal !== undefined) totalAC = gqlTotal;

  // ── Phase 2: dedup against existing DB ───────────────────────────────────
  const existingProblems = await db.problems.toArray();
  const knownSlugs = new Set(
    existingProblems.map((p) => p.leetcodeSlug).filter(Boolean)
  );

  const newEntries = acEntries.filter((e) => !knownSlugs.has(e.stat.question__title_slug));

  if (newEntries.length === 0) {
    markSynced();
    return { status: "synced", newCount: 0, totalAC };
  }

  // ── Phase 3: write new problems + seed spaced revisions ──────────────────
  const today = toLocalISODate(new Date());
  const dueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + SPACED_REPETITION_INTERVALS_DAYS[0]);
    return toLocalISODate(d);
  })();

  let newCount = 0;

  for (const entry of newEntries) {
    const { stat, difficulty: diff } = entry;
    try {
      const problemId = await db.problems.add({
        number: stat.frontend_question_id || null,
        title: stat.question__title,
        difficulty: difficultyFromLevel(diff.level),
        topics: [], // REST API doesn't include topics; user can add manually
        notes: null,
        approach: null,
        mistakes: null,
        solvedDate: today,
        source: "leetcode_sync",
        leetcodeSlug: stat.question__title_slug,
      });

      await db.spacedRevisions.add({
        problemId: problemId as number,
        stage: 0,
        dueDate,
        lastReviewedAt: null,
        history: [],
      });

      newCount++;
    } catch {
      // Skip on write error (e.g. concurrent sync collision) — don't abort
      continue;
    }
  }

  markSynced();
  return { status: "synced", newCount, totalAC };
}

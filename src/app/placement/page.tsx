"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Code2,
  ListTree,
  Brain,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { usePlacementData } from "@/features/placement/use-placement-data";
import { AddProblemSheet } from "@/features/placement/add-problem-sheet";
import { RevisionListSheet } from "@/features/placement/weekly-revision-sheet";
import {
  ensureWeeklyRevisionList,
  ensureMonthlyRevisionList,
} from "@/features/placement/use-revision-engine";
import {
  syncLeetCode,
  resetSyncThrottle,
  type SyncResult,
} from "@/features/placement/use-leetcode-sync";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROXY_URL = process.env.NEXT_PUBLIC_LEETCODE_PROXY_URL ?? "";
const DIFFICULTY_TONE = { Easy: "success", Medium: "warning", Hard: "danger" } as const;

// ---------------------------------------------------------------------------
// Sync status pill
// ---------------------------------------------------------------------------

type SyncPhase =
  | { phase: "idle" }
  | { phase: "syncing" }
  | { phase: "done"; result: SyncResult };

function SyncStatusPill({
  syncState,
  onManualSync,
}: {
  syncState: SyncPhase;
  onManualSync: () => void;
}) {
  // "no_config" → show a setup prompt (persistent)
  if (syncState.phase === "done" && syncState.result.status === "no_config") {
    return (
      <a
        href="https://github.com/your-repo/lifeos/blob/main/proxy/README.md"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs text-text-faint hover:text-text transition-colors"
        id="lc-setup-proxy-link"
      >
        <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
        <span>LeetCode sync — set up proxy</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }

  // "no_username" → silent (handled by the Settings UI already)
  if (
    syncState.phase === "idle" ||
    (syncState.phase === "done" && syncState.result.status === "no_username") ||
    (syncState.phase === "done" && syncState.result.status === "throttled")
  ) {
    return null;
  }

  // Syncing spinner
  if (syncState.phase === "syncing") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-text-faint">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span>Syncing LeetCode…</span>
      </div>
    );
  }

  // Error
  if (syncState.phase === "done" && syncState.result.status === "error") {
    return (
      <button
        id="lc-retry-sync-btn"
        onClick={onManualSync}
        className="flex items-center gap-1.5 text-xs text-danger hover:brightness-110 transition-colors"
      >
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>Sync failed — tap to retry</span>
      </button>
    );
  }

  // Synced — show new count badge, auto-dismiss after 4s
  if (syncState.phase === "done" && syncState.result.status === "synced") {
    const { newCount } = syncState.result;
    return (
      <AnimatePresence>
        <motion.div
          key="synced"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="flex items-center gap-1.5 text-xs text-success"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>
            {newCount > 0
              ? `${newCount} new problem${newCount > 1 ? "s" : ""} synced`
              : "LeetCode up to date"}
          </span>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PlacementPage() {
  const router = useRouter();
  const { settings, problems, totalSolved, difficultyCounts, dueToday } = usePlacementData();

  const [addOpen, setAddOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncPhase>({ phase: "idle" });

  const weeklyGoal = settings?.weeklyCodingGoal ?? 7;
  const weeklyProgress = Math.min(1, totalSolved / Math.max(1, weeklyGoal));

  // ---- Run sync on mount (auto) and handle status display ----
  async function runSync(force = false) {
    const username = settings?.leetcodeUsername;
    if (!username && !PROXY_URL) {
      setSyncState({ phase: "done", result: { status: "no_config", newCount: 0 } });
      return;
    }
    if (!username) {
      setSyncState({ phase: "done", result: { status: "no_username", newCount: 0 } });
      return;
    }

    if (force) resetSyncThrottle();

    setSyncState({ phase: "syncing" });
    const result = await syncLeetCode(username, {
      force,
      sessionToken: settings?.leetcodeSession ?? null,
    });
    setSyncState({ phase: "done", result });

    // Auto-dismiss "up to date" / "new problems" message after 4 seconds
    if (result.status === "synced") {
      setTimeout(() => setSyncState({ phase: "idle" }), 4000);
    }
  }

  // ---- Auto-sync when settings become available (or username changes) -----
  // We use an async IIFE so state updates only happen inside await continuations,
  // never in the synchronous effect body — avoids react-hooks/set-state-in-effect.
  useEffect(() => {
    if (settings === undefined) return;

    const username = settings.leetcodeUsername;

    const go = async () => {
      if (!username && !PROXY_URL) {
        setSyncState({ phase: "done", result: { status: "no_config", newCount: 0 } });
        return;
      }
      if (!username) {
        setSyncState({ phase: "done", result: { status: "no_username", newCount: 0 } });
        return;
      }

      setSyncState({ phase: "syncing" });
      const result = await syncLeetCode(username, { sessionToken: settings?.leetcodeSession ?? null });
      setSyncState({ phase: "done", result });

      if (result.status === "synced") {
        setTimeout(() => setSyncState({ phase: "idle" }), 4000);
      }
    };

    void go();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.leetcodeUsername]);

  // Auto-generate weekly + monthly revision lists on mount (idempotent)
  useEffect(() => {
    void ensureWeeklyRevisionList();
    void ensureMonthlyRevisionList();
  }, []);

  return (
    <>
      <PageShell>
        {/* Header row */}
        <PageHeader
          eyebrow="Placement"
          title="Coding prep"
          right={
            <div className="flex items-center gap-2">
              {/* Manual sync button — only if proxy is configured */}
              {PROXY_URL && settings?.leetcodeUsername && (
                <button
                  id="lc-manual-sync-btn"
                  onClick={() => runSync(true)}
                  disabled={syncState.phase === "syncing"}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint hover:text-text hover:bg-surface-hover transition-colors disabled:opacity-40"
                  title="Sync LeetCode now"
                >
                  <RefreshCw
                    className={["h-4 w-4", syncState.phase === "syncing" ? "animate-spin" : ""].join(" ")}
                  />
                </button>
              )}
              <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
          }
        />

        {/* Sync status pill */}
        <div className="mb-3 min-h-[1.25rem]">
          <SyncStatusPill syncState={syncState} onManualSync={() => runSync(true)} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="flex flex-col items-center justify-center py-5">
            <ProgressRing
              value={weeklyProgress}
              size={68}
              strokeWidth={6}
              accent="focus"
              label={String(totalSolved)}
              sublabel="solved"
            />
          </Card>

          {/* Due-today card — tappable to start review */}
          <button
            id="placement-start-review-btn"
            onClick={() => dueToday > 0 && router.push("/placement/review")}
            className={[
              "flex flex-col justify-center gap-2 rounded-2xl border p-4 text-left transition-all shadow-[var(--shadow-card)]",
              dueToday > 0
                ? "border-focus/40 bg-focus-dim hover:brightness-105 active:scale-95"
                : "border-border bg-surface",
            ].join(" ")}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">Due for revision</p>
              {dueToday > 0 && <Brain className="h-4 w-4 text-focus" />}
            </div>
            <p className="font-mono-tab text-3xl font-semibold text-text">{dueToday}</p>
            <p className="text-[11px] text-text-faint">
              {dueToday > 0 ? "Tap to start review →" : "All caught up!"}
            </p>
          </button>
        </div>

        {/* Difficulty split */}
        <Card className="mb-4">
          <CardHeader
            title="Difficulty split"
            right={<ListTree className="w-4 h-4 text-text-faint" />}
          />
          <div className="flex gap-2">
            {(["Easy", "Medium", "Hard"] as const).map((d) => (
              <Badge key={d} tone={DIFFICULTY_TONE[d]} className="flex-1 justify-center py-1.5">
                {d} · {difficultyCounts[d]}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Revision lists CTA */}
        <button
          id="placement-revision-lists-btn"
          onClick={() => setRevisionOpen(true)}
          className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface p-4 mb-4 hover:bg-surface-hover transition-colors shadow-[var(--shadow-card)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-focus-dim">
              <CalendarDays className="h-4 w-4 text-focus" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-text">Revision lists</p>
              <p className="text-xs text-text-faint">Weekly · Monthly rollups</p>
            </div>
          </div>
          <span className="text-text-faint text-sm">›</span>
        </button>

        {/* Recent problems */}
        <Card>
          <CardHeader title="Recent problems" subtitle="Most recently solved" />
          {problems.length === 0 ? (
            <EmptyState
              icon={Code2}
              title="No problems logged yet"
              description={
                PROXY_URL && settings?.leetcodeUsername
                  ? "LeetCode sync is active — your recent AC submissions will appear here automatically."
                  : "Add your first solved problem, or set up LeetCode sync in the proxy README."
              }
              action={
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  Add manually
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border-soft">
              {problems.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">
                      {p.number ? `${p.number}. ` : ""}
                      {p.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-text-faint">
                        {p.topics.join(", ") || "No topics"}
                      </p>
                      {p.source === "leetcode_sync" && (
                        <span className="text-[10px] text-text-faint/60 font-medium">
                          · LC
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge tone={DIFFICULTY_TONE[p.difficulty]}>{p.difficulty}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </PageShell>

      <AddProblemSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <RevisionListSheet open={revisionOpen} onClose={() => setRevisionOpen(false)} />
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Code2,
  ListTree,
  Brain,
  CalendarDays,
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTY_TONE = { Easy: "success", Medium: "warning", Hard: "danger" } as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function leetcodeHref(problem: { leetcodeSlug: string | null; title: string }): string {
  if (problem.leetcodeSlug) {
    return `https://leetcode.com/problems/${problem.leetcodeSlug}/`;
  }
  return `https://leetcode.com/problemset/?search=${encodeURIComponent(problem.title)}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PlacementPage() {
  const router = useRouter();
  const { settings, problems, totalSolved, difficultyCounts, dueToday } = usePlacementData();

  const [addOpen, setAddOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);

  const weeklyGoal = settings?.weeklyCodingGoal ?? 7;
  const weeklyProgress = Math.min(1, totalSolved / Math.max(1, weeklyGoal));

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
            <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          }
        />

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
              description="Add your first solved problem to start tracking your revision schedule."
              action={
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  Add problem
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border-soft">
              {problems.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {p.number ? `${p.number}. ` : ""}
                      {p.title}
                    </p>
                    <p className="text-xs text-text-faint">
                      {p.topics.join(", ") || "No topics"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={DIFFICULTY_TONE[p.difficulty]}>{p.difficulty}</Badge>
                    <a
                      href={leetcodeHref(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-text-faint hover:text-focus hover:bg-focus-dim transition-colors"
                      title="Open on LeetCode"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
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

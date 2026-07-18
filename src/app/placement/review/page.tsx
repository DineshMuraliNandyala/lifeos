"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Brain, CheckCircle2, RotateCcw, Minus } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useDueRevisions, reviewRevision } from "@/features/placement/use-revision-engine";
import { SPACED_REPETITION_INTERVALS_DAYS } from "@/lib/db/types";
import type { Difficulty } from "@/lib/db/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DIFFICULTY_TONE = { Easy: "success", Medium: "warning", Hard: "danger" } as const;

const STAGE_LABEL = ["Day 1", "Day 3", "Day 7", "Day 14", "Day 30"] as const;

// ---------------------------------------------------------------------------
// Result button row
// ---------------------------------------------------------------------------

function ReviewButtons({
  onResult,
  disabled,
}: {
  onResult: (r: "easy" | "hard" | "forgot") => void;
  disabled: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 mt-6">
      <button
        disabled={disabled}
        onClick={() => onResult("forgot")}
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-danger/40 bg-danger-dim p-4 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
      >
        <RotateCcw className="h-5 w-5 text-danger" />
        <span className="text-xs font-semibold text-danger">Forgot</span>
        <span className="text-[10px] text-text-faint">Back to day 1</span>
      </button>

      <button
        disabled={disabled}
        onClick={() => onResult("hard")}
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-warning/40 bg-warning-dim p-4 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
      >
        <Minus className="h-5 w-5 text-warning" />
        <span className="text-xs font-semibold text-warning">Hard</span>
        <span className="text-[10px] text-text-faint">Repeat interval</span>
      </button>

      <button
        disabled={disabled}
        onClick={() => onResult("easy")}
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-success/40 bg-success-dim p-4 transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
      >
        <CheckCircle2 className="h-5 w-5 text-success" />
        <span className="text-xs font-semibold text-success">Easy</span>
        <span className="text-[10px] text-text-faint">Next stage</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single review card
// ---------------------------------------------------------------------------

function ReviewCard({
  revision,
  problem,
  index,
  total,
  onResult,
}: {
  revision: { id: number; stage: number; history: Array<{ date: string; result: string }> };
  problem: { title: string; number: number | null; difficulty: Difficulty; topics: string[]; notes: string | null; approach: string | null };
  index: number;
  total: number;
  onResult: (r: "easy" | "hard" | "forgot") => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const stageLabel = STAGE_LABEL[Math.min(revision.stage, STAGE_LABEL.length - 1)];
  const nextStageLabel = STAGE_LABEL[Math.min(revision.stage + 1, STAGE_LABEL.length - 1)];
  const nextEasyDays = SPACED_REPETITION_INTERVALS_DAYS[Math.min(revision.stage + 1, SPACED_REPETITION_INTERVALS_DAYS.length - 1)];

  async function handleResult(result: "easy" | "hard" | "forgot") {
    setSubmitting(true);
    await onResult(result);
    // parent will swap to next card — no need to reset state
  }

  return (
    <motion.div
      key={revision.id}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="w-full"
    >
      {/* Progress bar */}
      <div className="mb-4 flex items-center gap-3">
        <ProgressRing
          value={index / total}
          size={44}
          strokeWidth={5}
          accent="focus"
          label={String(index + 1)}
        />
        <div className="flex-1">
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full bg-focus transition-all duration-500"
              style={{ width: `${((index) / total) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-text-faint">{index + 1} of {total}</p>
        </div>
      </div>

      {/* Problem card */}
      <div className="rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-border-soft">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h2 className="font-display text-xl font-bold text-text leading-snug">
              {problem.number ? `${problem.number}. ` : ""}
              {problem.title}
            </h2>
            <Badge tone={DIFFICULTY_TONE[problem.difficulty]} className="shrink-0">
              {problem.difficulty}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {problem.topics.map((t) => (
              <span
                key={t}
                className="rounded-full bg-focus-dim px-2 py-0.5 text-[11px] font-medium text-focus"
              >
                {t}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-text-faint">
            <span className="rounded-full bg-surface-2 px-2 py-0.5">
              Stage: {stageLabel}
            </span>
            {revision.history.length > 0 && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5">
                {revision.history.length} prior reviews
              </span>
            )}
          </div>
        </div>

        {/* Reveal / answer section */}
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.div
              key="hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-5"
            >
              <p className="text-sm text-text-muted mb-4 text-center">
                Try to recall the approach before revealing.
              </p>
              <button
                onClick={() => setRevealed(true)}
                className="w-full h-11 rounded-xl border border-focus/40 bg-focus-dim text-sm font-medium text-focus hover:brightness-110 active:scale-95 transition-all"
              >
                Reveal answer
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 space-y-4"
            >
              {problem.approach ? (
                <div>
                  <p className="text-[11px] font-medium text-text-faint uppercase tracking-wider mb-1.5">
                    Approach
                  </p>
                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                    {problem.approach}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-muted italic">No approach notes saved yet.</p>
              )}

              {problem.notes && (
                <div>
                  <p className="text-[11px] font-medium text-text-faint uppercase tracking-wider mb-1.5">
                    Notes
                  </p>
                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                    {problem.notes}
                  </p>
                </div>
              )}

              {/* Next-due hint */}
              <p className="text-xs text-text-faint text-center pt-1">
                Easy → next review in <span className="text-success">{nextEasyDays}d</span> ({nextStageLabel})
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result buttons — only after reveal */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ReviewButtons onResult={handleResult} disabled={submitting} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Completed screen
// ---------------------------------------------------------------------------

function ReviewDone({
  totalReviewed,
  results,
  onBack,
}: {
  totalReviewed: number;
  results: Array<"easy" | "hard" | "forgot">;
  onBack: () => void;
}) {
  const easy = results.filter((r) => r === "easy").length;
  const hard = results.filter((r) => r === "hard").length;
  const forgot = results.filter((r) => r === "forgot").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center pt-12 text-center gap-6"
    >
      <div className="text-6xl">🧠</div>
      <div>
        <p className="text-xs font-medium text-text-faint uppercase tracking-wider mb-1">
          Session complete
        </p>
        <h1 className="font-display text-3xl font-bold text-text">
          {totalReviewed} reviewed
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full">
        {[
          { label: "Easy", value: easy, color: "text-success" },
          { label: "Hard", value: hard, color: "text-warning" },
          { label: "Forgot", value: forgot, color: "text-danger" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-3 text-center">
            <p className={`font-mono-tab text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-text-faint mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-text-muted max-w-xs">
        Next due dates have been updated. Come back tomorrow for the next batch.
      </p>

      <Button onClick={onBack} className="w-full">
        Back to Placement
      </Button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ReviewPage() {
  const router = useRouter();
  const dueItems = useDueRevisions();

  // Track which items we've reviewed in this session
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionResults, setSessionResults] = useState<Array<"easy" | "hard" | "forgot">>([]);

  const isLoading = dueItems === undefined;
  const allItems = dueItems ?? [];

  // Current card: the first item not yet reviewed in this session
  const currentIndex = reviewedCount;
  const currentItem = allItems[currentIndex];
  const isDone = reviewedCount >= allItems.length && allItems.length > 0;

  const handleResult = useCallback(
    async (result: "easy" | "hard" | "forgot") => {
      if (!currentItem) return;
      await reviewRevision(currentItem.revision.id, result);
      setSessionResults((prev) => [...prev, result]);
      setReviewedCount((n) => n + 1);
    },
    [currentItem]
  );

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 rounded-full border-2 border-focus border-t-transparent animate-spin" />
        </div>
      </PageShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Empty — nothing due
  // ---------------------------------------------------------------------------
  if (allItems.length === 0) {
    return (
      <PageShell>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-text-muted mb-6 hover:text-text transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-col items-center py-20 text-center gap-4">
          <Brain className="h-12 w-12 text-text-faint" />
          <p className="font-display text-xl font-semibold text-text">You&apos;re all caught up!</p>
          <p className="text-sm text-text-muted max-w-xs">
            No revisions are due today. Add more problems or come back tomorrow.
          </p>
          <Button variant="secondary" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </PageShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Session complete
  // ---------------------------------------------------------------------------
  if (isDone) {
    return (
      <PageShell>
        <ReviewDone
          totalReviewed={reviewedCount}
          results={sessionResults}
          onBack={() => router.push("/placement")}
        />
      </PageShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Active review
  // ---------------------------------------------------------------------------
  return (
    <PageShell>
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-text-muted mb-4 hover:text-text transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-4">
        <p className="text-xs font-medium text-text-faint uppercase tracking-wider mb-0.5">
          Spaced revision
        </p>
        <h1 className="font-display text-xl font-bold text-text">
          {allItems.length - reviewedCount} left to review
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {currentItem && (
          <ReviewCard
            key={currentItem.revision.id}
            revision={currentItem.revision}
            problem={currentItem.problem}
            index={currentIndex}
            total={allItems.length}
            onResult={handleResult}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

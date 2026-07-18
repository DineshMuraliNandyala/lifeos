"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Timer, CheckCircle2, XCircle } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { SetLogger } from "@/features/fitness/set-logger";
import {
  useFitnessData,
  useTodaySetLogs,
  startWorkout,
  finishWorkout,
  discardWorkout,
} from "@/features/fitness/use-fitness-data";
import { todayISODate } from "@/lib/date";

// ---------------------------------------------------------------------------
// Elapsed timer (updates every second)
// ---------------------------------------------------------------------------

function useElapsed(startedAt: string | undefined) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const tick = () =>
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ---------------------------------------------------------------------------
// Finish confirmation overlay
// ---------------------------------------------------------------------------

function FinishOverlay({
  totalSets,
  newPRs,
  durationLabel,
  onConfirm,
  onDismiss,
}: {
  totalSets: number;
  newPRs: number;
  durationLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm px-4 pb-10"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 300 }}
        className="w-full max-w-md rounded-2xl border border-border bg-bg-elevated p-6 space-y-5"
      >
        <div className="text-center">
          <div className="text-4xl mb-2">🏋️</div>
          <h2 className="font-display text-xl font-bold text-text">Finish workout?</h2>
          <p className="text-sm text-text-muted mt-1">
            {durationLabel} · {totalSets} sets logged
            {newPRs > 0 && (
              <span className="ml-1 text-energy">
                · {newPRs} PR{newPRs > 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onDismiss} className="flex-1">
            Keep going
          </Button>
          <button
            onClick={onConfirm}
            className="flex-1 h-11 px-4 text-sm font-medium rounded-xl bg-energy text-[#0a0b0e] hover:brightness-110 active:brightness-95 transition-all"
          >
            Finish
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WorkoutPage() {
  const router = useRouter();
  const dateISO = todayISODate();
  const { weekday, todaysExercises, todaySession } = useFitnessData();
  const setsByExercise = useTodaySetLogs(dateISO);

  // Phase: "pre" = not yet started, "active" = logging, "done" = finished
  // We use a local flag to distinguish "session exists but not started here"
  // vs "session was started in this visit" without calling setState in effects.
  const [phase, setPhase] = useState<"pre" | "active" | "done">("pre");
  const [showFinish, setShowFinish] = useState(false);

  // Lift todaySession into phase when it arrives from the live query.
  // We do this in the render path (not in an effect) to avoid the
  // react-hooks/set-state-in-effect lint rule.
  const derivedPhase: "pre" | "active" | "done" = (() => {
    if (phase === "active" || phase === "done") return phase;
    if (!todaySession) return "pre";
    if (todaySession.completedAt) return "done";
    return "active"; // open session from a previous page visit / app reload
  })();

  const sessionId = todaySession?.id ?? null;

  const allLoggedSets = Object.values(setsByExercise).flat();
  const newPRCount = allLoggedSets.filter((s) => s.isPR).length;

  const allSetsComplete = todaysExercises.every((ex) => {
    const logged = setsByExercise[ex.id as number] ?? [];
    return logged.length >= ex.targetSets;
  });

  const elapsed = useElapsed(
    derivedPhase === "active" ? todaySession?.startedAt : undefined
  );

  // ---- Handlers ----

  async function handleStart() {
    setPhase("active");
    await startWorkout(weekday, dateISO);
  }

  const handleFinishConfirm = useCallback(async () => {
    if (!sessionId) return;
    await finishWorkout(sessionId, dateISO);
    setPhase("done");
    setShowFinish(false);
  }, [sessionId, dateISO]);

  async function handleDiscard() {
    if (!sessionId) return;
    if (!confirm("Discard this workout session?")) return;
    await discardWorkout(sessionId);
    router.back();
  }

  // ---------------------------------------------------------------------------
  // Render: no exercises
  // ---------------------------------------------------------------------------
  if (todaysExercises.length === 0) {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
          <p className="text-4xl">💪</p>
          <p className="font-display text-lg font-semibold text-text">
            No exercises planned for today
          </p>
          <p className="text-sm text-text-muted max-w-xs">
            Add exercises in the Manage exercises editor on the Fitness tab first.
          </p>
          <Button variant="secondary" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </PageShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: finished summary
  // ---------------------------------------------------------------------------
  if (derivedPhase === "done") {
    const totalVolume = allLoggedSets.reduce((s, r) => s + r.weightKg * r.reps, 0);

    return (
      <PageShell>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center pt-12 pb-8 text-center gap-6"
        >
          <div className="text-6xl">🎉</div>
          <div>
            <p className="text-xs font-medium text-text-faint uppercase tracking-wider mb-1">
              Workout complete
            </p>
            <h1 className="font-display text-3xl font-bold text-text">
              {todaySession?.durationMinutes != null
                ? `${todaySession.durationMinutes} min`
                : "Done!"}
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            {[
              { label: "Sets", value: allLoggedSets.length },
              { label: "Volume", value: `${totalVolume.toFixed(0)}kg` },
              { label: "PRs", value: newPRCount },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-border bg-surface p-3 text-center"
              >
                <p className="font-mono-tab text-xl font-bold text-energy">{value}</p>
                <p className="text-xs text-text-faint mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <Button onClick={() => router.push("/fitness")} className="w-full">
            Back to Fitness
          </Button>
        </motion.div>
      </PageShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: pre-start state
  // ---------------------------------------------------------------------------
  if (derivedPhase === "pre") {
    return (
      <PageShell>
        {/* Back nav */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-text-muted mb-5 hover:text-text transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-6">
          <p className="text-xs font-medium text-text-faint uppercase tracking-wider mb-1">
            Ready to train
          </p>
          <h1 className="font-display text-2xl font-bold text-text">
            Today&apos;s workout
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {todaysExercises.length} exercises planned
          </p>
        </div>

        {/* Exercise preview */}
        <div className="rounded-2xl border border-border bg-surface p-4 mb-6 divide-y divide-border-soft">
          {todaysExercises.map((ex) => (
            <div
              key={ex.id}
              className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium text-text">{ex.name}</p>
                <p className="text-xs text-text-faint">
                  {ex.muscleGroup} · {ex.targetSets} × {ex.targetReps}
                </p>
              </div>
              {ex.bestPR != null && (
                <span className="font-mono-tab text-xs text-energy">{ex.bestPR}kg PR</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          className="w-full h-14 rounded-2xl bg-energy text-[#0a0b0e] font-display font-bold text-lg hover:brightness-110 active:brightness-95 transition-all"
        >
          Start workout
        </button>
      </PageShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: active logging
  // ---------------------------------------------------------------------------
  return (
    <>
      <PageShell>
        {/* Sticky header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={handleDiscard}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-danger transition-colors"
          >
            <XCircle className="h-4 w-4" /> Discard
          </button>

          <div className="flex items-center gap-1.5 text-sm font-mono-tab text-text-muted">
            <Timer className="h-4 w-4" />
            {elapsed}
          </div>

          <button
            onClick={() => setShowFinish(true)}
            className="flex items-center gap-1 text-sm font-medium text-energy hover:brightness-110 transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
            {allSetsComplete ? "Finish" : "Finish early"}
          </button>
        </div>

        <div className="mb-3">
          <p className="text-xs font-medium text-text-faint uppercase tracking-wider mb-0.5">
            Active workout
          </p>
          <h1 className="font-display text-xl font-bold text-text">Log your sets</h1>
        </div>

        {/* Set loggers */}
        <div className="space-y-4">
          {todaysExercises.map((ex) => (
            <SetLogger
              key={ex.id}
              exercise={ex as typeof ex & { id: number }}
              dateISO={dateISO}
              loggedSets={setsByExercise[ex.id as number] ?? []}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-6">
          <button
            onClick={() => setShowFinish(true)}
            className="w-full h-12 rounded-xl bg-energy text-[#0a0b0e] font-medium hover:brightness-110 active:brightness-95 transition-all"
          >
            {allSetsComplete ? "✓ Finish workout" : "Finish early"}
          </button>
        </div>
      </PageShell>

      {/* Finish confirmation overlay */}
      <AnimatePresence>
        {showFinish && (
          <FinishOverlay
            totalSets={allLoggedSets.length}
            newPRs={newPRCount}
            durationLabel={elapsed}
            onConfirm={handleFinishConfirm}
            onDismiss={() => setShowFinish(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

"use client";

import { useState } from "react";
import { Check, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressRing } from "@/components/ui/progress-ring";
import { logSet } from "./use-fitness-data";
import type { Exercise, ExerciseSetLog } from "@/lib/db/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SetLoggerProps {
  exercise: Exercise & { id: number };
  dateISO: string;
  loggedSets: ExerciseSetLog[];
}

// ---------------------------------------------------------------------------
// PR flash badge
// ---------------------------------------------------------------------------

function PRFlash() {
  return (
    <motion.span
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.2, opacity: 0 }}
      transition={{ type: "spring", damping: 12, stiffness: 400 }}
      className="inline-flex items-center gap-1 rounded-full bg-energy-dim px-2 py-0.5 text-[11px] font-bold text-energy"
    >
      <Zap className="h-3 w-3" />
      NEW PR
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Individual set row (logged)
// ---------------------------------------------------------------------------

function LoggedSetRow({
  set,
  index,
}: {
  set: ExerciseSetLog;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-1.5"
    >
      <span className="w-5 text-xs font-mono-tab text-text-faint text-center">
        {index + 1}
      </span>
      <span className="font-mono-tab text-sm text-text">
        {set.weightKg}
        <span className="text-text-faint text-xs"> kg</span>
      </span>
      <span className="text-text-faint text-xs">×</span>
      <span className="font-mono-tab text-sm text-text">
        {set.reps}
        <span className="text-text-faint text-xs"> reps</span>
      </span>
      <AnimatePresence>{set.isPR && <PRFlash />}</AnimatePresence>
      <Check className="ml-auto h-4 w-4 text-success" />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Input row for the next set
// ---------------------------------------------------------------------------

function SetInputRow({
  setNumber,
  defaultWeight,
  onLog,
}: {
  setNumber: number;
  defaultWeight: number;
  onLog: (weightKg: number, reps: number) => Promise<void>;
}) {
  const [weight, setWeight] = useState(defaultWeight > 0 ? String(defaultWeight) : "");
  const [reps, setReps] = useState("");
  const [saving, setSaving] = useState(false);

  const canLog =
    weight.trim() !== "" &&
    reps.trim() !== "" &&
    Number(weight) > 0 &&
    Number(reps) > 0 &&
    !saving;

  async function handle() {
    if (!canLog) return;
    setSaving(true);
    await onLog(Number(weight), Number(reps));
    setSaving(false);
    setReps("");
  }

  return (
    <div className="flex items-center gap-2 pt-2 border-t border-border-soft">
      <span className="w-5 text-xs font-mono-tab text-text-faint text-center">{setNumber}</span>

      <div className="flex items-center gap-1 flex-1 rounded-lg border border-border bg-surface px-2 py-1.5">
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="kg"
          className="w-full bg-transparent text-sm font-mono-tab text-text outline-none placeholder:text-text-faint"
        />
        <span className="text-xs text-text-faint shrink-0">kg</span>
      </div>

      <span className="text-text-faint text-xs">×</span>

      <div className="flex items-center gap-1 w-20 rounded-lg border border-border bg-surface px-2 py-1.5">
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handle()}
          placeholder="reps"
          className="w-full bg-transparent text-sm font-mono-tab text-text outline-none placeholder:text-text-faint"
        />
      </div>

      <button
        disabled={!canLog}
        onClick={handle}
        className={[
          "flex items-center justify-center h-9 w-9 rounded-full transition-all shrink-0",
          canLog
            ? "bg-energy text-[#0a0b0e] hover:brightness-110 active:scale-95"
            : "bg-surface-2 text-text-faint opacity-40",
        ].join(" ")}
        aria-label="Log set"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main SetLogger card
// ---------------------------------------------------------------------------

export function SetLogger({ exercise, dateISO, loggedSets }: SetLoggerProps) {
  const targetSets = exercise.targetSets;
  const done = loggedSets.length;
  const progress = Math.min(done / Math.max(targetSets, 1), 1);

  // Default weight for next set = last logged weight (or currentPR as hint)
  const lastWeight =
    loggedSets.length > 0
      ? loggedSets[loggedSets.length - 1].weightKg
      : exercise.currentPR ?? 0;

  const isComplete = done >= targetSets;

  async function handleLog(weightKg: number, reps: number) {
    await logSet(exercise.id, dateISO, done + 1, weightKg, reps);
  }

  return (
    <div
      className={[
        "rounded-2xl border p-4 transition-colors",
        isComplete
          ? "border-success/30 bg-success-dim"
          : "border-border bg-surface",
        "shadow-[var(--shadow-card)]",
      ].join(" ")}
    >
      {/* Header: ring + name */}
      <div className="flex items-center gap-4 mb-3">
        <ProgressRing
          value={progress}
          size={64}
          strokeWidth={6}
          accent={isComplete ? "success" : "energy"}
          label={`${done}/${targetSets}`}
        />
        <div className="flex-1 min-w-0">
          <p className="font-display text-[15px] font-semibold text-text leading-tight truncate">
            {exercise.name}
          </p>
          <p className="text-xs text-text-faint mt-0.5">
            {exercise.muscleGroup} · {targetSets} × {exercise.targetReps}
          </p>
          {exercise.bestPR != null && (
            <p className="text-xs text-energy mt-0.5 font-mono-tab">
              Best PR: {exercise.bestPR}kg
            </p>
          )}
        </div>
      </div>

      {/* Logged sets */}
      <div className="space-y-0">
        {loggedSets.map((s, i) => (
          <LoggedSetRow key={s.id ?? i} set={s} index={i} />
        ))}
      </div>

      {/* Input for next set */}
      {!isComplete && (
        <SetInputRow
          setNumber={done + 1}
          defaultWeight={lastWeight}
          onLog={handleLog}
        />
      )}

      {isComplete && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-xs font-medium text-success text-center"
        >
          ✓ All sets done
        </motion.p>
      )}
    </div>
  );
}

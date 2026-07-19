"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, ChevronUp, ChevronDown, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useExercisesForWeekday,
  addExercise,
  updateExercise,
  archiveExercise,
  reorderExercises,
} from "./use-exercise-editor";
import type { Exercise, Weekday } from "@/lib/db/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Legs", "Glutes", "Core", "Calves", "Full Body", "Cardio",
];

const EMPTY_FORM = {
  name: "",
  muscleGroup: "Chest",
  targetSets: 3,
  targetReps: "8-10",
  notes: "",
};

type FormState = typeof EMPTY_FORM;

// ---------------------------------------------------------------------------
// Add / Edit form (inline, below exercise list)
// ---------------------------------------------------------------------------

function ExerciseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: FormState & { id?: number };
  onSave: (data: FormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial ?? EMPTY_FORM);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const valid = form.name.trim().length > 0 && form.targetSets > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="mt-3 rounded-xl border border-border bg-surface-2 p-4 space-y-3"
    >
      {/* Name */}
      <div>
        <label className="text-[11px] font-medium text-text-faint uppercase tracking-wider">
          Exercise name
        </label>
        <input
          autoFocus
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Bench Press"
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-energy"
        />
      </div>

      {/* Muscle group */}
      <div>
        <label className="text-[11px] font-medium text-text-faint uppercase tracking-wider">
          Muscle group
        </label>
        <select
          value={form.muscleGroup}
          onChange={(e) => set("muscleGroup", e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-energy"
        >
          {MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Sets + reps row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[11px] font-medium text-text-faint uppercase tracking-wider">
            Sets
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={form.targetSets}
            onChange={(e) => set("targetSets", Math.max(1, Number(e.target.value)))}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-energy"
          />
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-medium text-text-faint uppercase tracking-wider">
            Reps / target
          </label>
          <input
            value={form.targetReps}
            onChange={(e) => set("targetReps", e.target.value)}
            placeholder="8-10 or AMRAP"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-energy"
          />
        </div>
      </div>

      {/* Notes (optional) */}
      <div>
        <label className="text-[11px] font-medium text-text-faint uppercase tracking-wider">
          Notes (optional)
        </label>
        <input
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Form cues, machine number…"
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-energy"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <button
          disabled={!valid}
          onClick={() => onSave(form)}
          className="flex-1 h-8 px-3 text-xs font-medium rounded-lg bg-energy text-[#0a0b0e] disabled:opacity-40 disabled:pointer-events-none hover:brightness-110 active:brightness-95 transition-all"
        >
          {initial ? "Save changes" : "Add exercise"}
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Single exercise row
// ---------------------------------------------------------------------------

function ExerciseRow({
  exercise,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onArchive,
  onEdit,
}: {
  exercise: Exercise;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onArchive: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border-soft last:border-0">
      {/* Reorder */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="text-text-faint disabled:opacity-20 hover:text-text transition-colors"
          aria-label="Move up"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="text-text-faint disabled:opacity-20 hover:text-text transition-colors"
          aria-label="Move down"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">{exercise.name}</p>
        <p className="text-xs text-text-faint">
          {exercise.muscleGroup} · {exercise.targetSets} × {exercise.targetReps}
          {exercise.bestPR != null && (
            <span className="ml-1.5 text-energy">PR {exercise.bestPR}kg</span>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-text-faint hover:text-text hover:bg-surface-hover transition-colors"
          aria-label="Edit exercise"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onArchive}
          className="p-1.5 rounded-lg text-text-faint hover:text-danger hover:bg-danger-dim transition-colors"
          aria-label="Archive exercise"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main sheet
// ---------------------------------------------------------------------------

interface ExerciseEditorSheetProps {
  open: boolean;
  onClose: () => void;
  /** Pre-select a weekday tab (defaults to Mon) */
  initialWeekday?: Weekday;
}

export function ExerciseEditorSheet({
  open,
  onClose,
  initialWeekday = "mon",
}: ExerciseEditorSheetProps) {
  const [activeDay, setActiveDay] = useState<Weekday>(initialWeekday);
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<(Exercise & { id: number }) | null>(null);

  const exercises = useExercisesForWeekday(activeDay);

  // ---- Handlers ----

  async function handleAdd(form: FormState) {
    await addExercise({
      name: form.name.trim(),
      muscleGroup: form.muscleGroup,
      weekday: activeDay,
      targetSets: form.targetSets,
      targetReps: form.targetReps.trim(),
      notes: form.notes.trim() || null,
    });
    setShowForm(false);
  }

  async function handleEdit(form: FormState) {
    if (!editingExercise) return;
    await updateExercise(editingExercise.id, {
      name: form.name.trim(),
      muscleGroup: form.muscleGroup,
      targetSets: form.targetSets,
      targetReps: form.targetReps.trim(),
      notes: form.notes.trim() || null,
    });
    setEditingExercise(null);
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const ids = exercises.map((e) => e.id as number);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await reorderExercises(ids);
  }

  async function handleMoveDown(index: number) {
    if (index === exercises.length - 1) return;
    const ids = exercises.map((e) => e.id as number);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await reorderExercises(ids);
  }

  async function handleArchive(id: number) {
    if (!confirm("Remove this exercise from your plan?")) return;
    await archiveExercise(id);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-60 mx-auto max-w-md rounded-t-[1.5rem] bg-bg-elevated border border-border pb-safe"
            style={{ maxHeight: "90dvh" }}
          >
            {/* Drag handle + header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-border" />
              <h2 className="font-display text-[17px] font-semibold text-text mt-2">
                Manage exercises
              </h2>
              <button
                onClick={onClose}
                className="mt-2 p-1.5 rounded-full text-text-faint hover:text-text hover:bg-surface-hover transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Weekday tab strip */}
            <div className="px-4 pb-3 overflow-x-auto">
              <div className="flex gap-1.5">
                {WEEKDAYS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveDay(key);
                      setShowForm(false);
                      setEditingExercise(null);
                    }}
                    className={[
                      "flex-shrink-0 h-8 px-3.5 rounded-full text-xs font-medium transition-all",
                      activeDay === key
                        ? "bg-energy text-[#0a0b0e]"
                        : "bg-surface-2 text-text-muted hover:bg-surface-hover hover:text-text",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable exercise list */}
            <div className="overflow-y-auto px-5" style={{ maxHeight: "55dvh" }}>
              {exercises.length === 0 && !showForm && (
                <p className="py-8 text-center text-sm text-text-faint">
                  No exercises planned for this day yet.
                </p>
              )}

              {exercises.map((ex, i) => (
                <div key={ex.id}>
                  {editingExercise?.id === ex.id ? (
                    <AnimatePresence mode="wait">
                      <ExerciseForm
                        key="edit-form"
                        initial={{
                          name: ex.name,
                          muscleGroup: ex.muscleGroup,
                          targetSets: ex.targetSets,
                          targetReps: ex.targetReps,
                          notes: ex.notes ?? "",
                          id: ex.id,
                        }}
                        onSave={handleEdit}
                        onCancel={() => setEditingExercise(null)}
                      />
                    </AnimatePresence>
                  ) : (
                    <ExerciseRow
                      exercise={ex}
                      isFirst={i === 0}
                      isLast={i === exercises.length - 1}
                      onMoveUp={() => handleMoveUp(i)}
                      onMoveDown={() => handleMoveDown(i)}
                      onArchive={() => handleArchive(ex.id as number)}
                      onEdit={() => {
                        setShowForm(false);
                        setEditingExercise(ex as Exercise & { id: number });
                      }}
                    />
                  )}
                </div>
              ))}

              {/* Add form */}
              <AnimatePresence>
                {showForm && !editingExercise && (
                  <ExerciseForm
                    key="add-form"
                    onSave={handleAdd}
                    onCancel={() => setShowForm(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Footer add button */}
            {!showForm && !editingExercise && (
              <div className="px-5 pt-3 pb-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm font-medium text-text-muted hover:border-energy hover:text-energy transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add exercise to {WEEKDAYS.find((w) => w.key === activeDay)?.label}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Footprints, Dumbbell, Plus, Settings2, Play, RotateCcw, Trophy } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { ExerciseEditorSheet } from "@/features/fitness/exercise-editor-sheet";
import { weekdayLabel } from "@/lib/date";
import { useFitnessData, addProtein } from "@/features/fitness/use-fitness-data";

const QUICK_ADD = [20, 25, 30, 40];

export default function FitnessPage() {
  const router = useRouter();
  const { settings, dateISO, weekday, proteinTotal, todaysExercises, stepReading, todaySession } =
    useFitnessData();

  const [editorOpen, setEditorOpen] = useState(false);

  const proteinGoal = settings?.proteinGoalGrams ?? 150;
  const stepGoal = settings?.stepGoal ?? 8000;

  const sessionIsOpen = todaySession != null && todaySession.completedAt == null;
  const sessionIsDone = todaySession != null && todaySession.completedAt != null;

  return (
    <>
      <PageShell>
        <PageHeader
          eyebrow="Fitness"
          title="Body & energy"
          right={
            <button
              id="fitness-manage-exercises-btn"
              onClick={() => setEditorOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 h-9 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text transition-colors"
              aria-label="Manage exercises"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Exercises
            </button>
          }
        />

        {/* ------------------------------------------------------------------ */}
        {/* Workout session banner                                               */}
        {/* ------------------------------------------------------------------ */}
        {sessionIsOpen && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-energy/30 bg-energy-dim px-4 py-3">
            <div>
              <p className="text-xs font-medium text-energy uppercase tracking-wider mb-0.5">
                Workout in progress
              </p>
              <p className="text-sm text-text">
                Started at {new Date(todaySession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <button
              id="fitness-resume-workout-btn"
              onClick={() => router.push("/fitness/workout")}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-energy text-[#0a0b0e] text-sm font-medium hover:brightness-110 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Resume
            </button>
          </div>
        )}

        {sessionIsDone && (
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-success/30 bg-success-dim px-4 py-3">
            <div>
              <p className="text-xs font-medium text-success uppercase tracking-wider mb-0.5">
                Workout done
              </p>
              <p className="text-sm text-text">
                {todaySession.durationMinutes != null && `${todaySession.durationMinutes} min · `}
                {todaySession.totalVolumeKg != null && `${Math.round(todaySession.totalVolumeKg)}kg volume`}
                {(todaySession.newPRCount ?? 0) > 0 && (
                  <span className="ml-1 text-energy">
                    · {todaySession.newPRCount} PR
                    {(todaySession.newPRCount ?? 0) > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
            <Trophy className="h-5 w-5 text-success opacity-70" />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Protein card                                                         */}
        {/* ------------------------------------------------------------------ */}
        <Card className="mb-4">
          <CardHeader title="Protein" subtitle={`Goal: ${proteinGoal}g`} />
          <div className="flex items-center gap-4">
            <ProgressRing
              value={proteinTotal / proteinGoal}
              accent="energy"
              label={`${proteinTotal}g`}
              sublabel={`of ${proteinGoal}g`}
            />
            <div className="flex flex-1 flex-wrap gap-2">
              {QUICK_ADD.map((g) => (
                <button
                  key={g}
                  id={`fitness-protein-add-${g}g-btn`}
                  onClick={() => addProtein(g, dateISO)}
                  className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-hover"
                >
                  +{g}g
                </button>
              ))}
              <button
                id="fitness-protein-custom-btn"
                onClick={() => {
                  const custom = prompt("Grams of protein?");
                  const n = Number(custom);
                  if (custom && !Number.isNaN(n) && n > 0) addProtein(n, dateISO);
                }}
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text"
              >
                <Plus className="h-3 w-3" /> Custom
              </button>
            </div>
          </div>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* Workout card                                                         */}
        {/* ------------------------------------------------------------------ */}
        <Card className="mb-4">
          <CardHeader
            title={`${weekdayLabel(weekday)}'s workout`}
            right={
              <button
                onClick={() => setEditorOpen(true)}
                className="text-text-faint hover:text-text transition-colors"
                aria-label="Edit exercises"
              >
                <Dumbbell className="w-4 h-4" />
              </button>
            }
          />

          {todaysExercises.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="No workout planned for today"
              description="Tap 'Exercises' above to add exercises for this weekday."
              className="py-6"
            />
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-border-soft mb-4">
                {todaysExercises.map((ex) => (
                  <li key={ex.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-text">{ex.name}</p>
                      <p className="text-xs text-text-faint">
                        {ex.muscleGroup} · {ex.targetSets} × {ex.targetReps}
                      </p>
                    </div>
                    {ex.bestPR != null && (
                      <span className="font-mono-tab text-xs text-energy">{ex.bestPR}kg PR</span>
                    )}
                  </li>
                ))}
              </ul>

              {/* Start / view workout CTA */}
              {!sessionIsOpen && !sessionIsDone && (
                <button
                  id="fitness-start-workout-btn"
                  onClick={() => router.push("/fitness/workout")}
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl bg-energy text-[#0a0b0e] font-medium text-sm hover:brightness-110 active:brightness-95 transition-all"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Start workout
                </button>
              )}

              {sessionIsDone && (
                <button
                  onClick={() => router.push("/fitness/workout")}
                  className="flex w-full items-center justify-center gap-2 h-11 rounded-xl border border-border bg-surface-2 text-text-muted text-sm hover:bg-surface-hover transition-colors"
                >
                  View workout summary
                </button>
              )}
            </>
          )}
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* Steps card                                                           */}
        {/* ------------------------------------------------------------------ */}
        <Card>
          <CardHeader title="Steps" right={<Footprints className="w-4 h-4 text-text-faint" />} />
          {stepReading ? (
            <div className="flex items-center gap-4">
              <ProgressRing
                value={stepReading.steps / stepGoal}
                accent="calm"
                label={String(stepReading.steps)}
                sublabel={`of ${stepGoal}`}
              />
              <div className="text-xs text-text-muted">
                {stepReading.distanceMeters != null && (
                  <p>{(stepReading.distanceMeters / 1000).toFixed(2)} km</p>
                )}
                {stepReading.calories != null && <p>{Math.round(stepReading.calories)} kcal</p>}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Footprints}
              title="Not connected to Health Connect"
              description="Link your Android Health Connect permissions in Settings to see steps here automatically."
              className="py-6"
            />
          )}
        </Card>
      </PageShell>

      {/* Exercise editor sheet (portal-like, outside PageShell) */}
      <ExerciseEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initialWeekday={weekday}
      />
    </>
  );
}

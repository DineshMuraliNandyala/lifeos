"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Footprints, Dumbbell, Plus, Settings2, Play, RotateCcw, Trophy, Cloud, CloudOff } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { EmptyState } from "@/components/ui/empty-state";
import { ExerciseEditorSheet } from "@/features/fitness/exercise-editor-sheet";
import { weekdayLabel } from "@/lib/date";
import { useFitnessData, addProtein } from "@/features/fitness/use-fitness-data";
import { useNativePedometer } from "@/features/health/use-native-pedometer";
import { useGoogleFit, isGoogleFitConfigured } from "@/features/health/use-google-fit";
import { db } from "@/lib/db";
import { toLocalISODate } from "@/lib/date";

const QUICK_ADD = [20, 25, 30, 40];

export default function FitnessPage() {
  const router = useRouter();
  const { settings, dateISO, weekday, proteinTotal, proteinLoading, todaysExercises, stepReading, todaySession } =
    useFitnessData();
  const pedometer = useNativePedometer();
  const googleFit = useGoogleFit();

  const [editorOpen, setEditorOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [manualStepPrompt, setManualStepPrompt] = useState(false);
  const [manualStepInput, setManualStepInput] = useState("");

  const proteinGoal = settings?.proteinGoalGrams ?? 150;
  const stepGoal = settings?.stepGoal ?? 8000;

  const sessionIsOpen = todaySession != null && todaySession.completedAt == null;
  const sessionIsDone = todaySession != null && todaySession.completedAt != null;

  // Auto-sync Google Fit steps when Fitness tab opens (if connected)
  useEffect(() => {
    if (!settings?.googleFitConnected) return;
    const sync = async () => {
      setIsSyncing(true);
      await googleFit.syncSteps(7);
      setIsSyncing(false);
    };
    void sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.googleFitConnected]);

  async function handleManualStepSave() {
    const n = Number(manualStepInput);
    if (!manualStepInput || isNaN(n) || n <= 0) return;
    const today = toLocalISODate(new Date());
    const existing = await db.stepReadings.where("date").equals(today).first();
    if (existing) {
      await db.stepReadings.update(existing.id!, { steps: n, source: "manual" });
    } else {
      await db.stepReadings.add({ date: today, steps: n, source: "manual", syncedAt: new Date().toISOString() });
    }
    setManualStepInput("");
    setManualStepPrompt(false);
  }

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
              value={proteinLoading ? 0 : (proteinTotal ?? 0) / proteinGoal}
              accent="energy"
              label={proteinLoading ? "--" : `${proteinTotal ?? 0}g`}
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
        {/* Steps card — Google Fit (primary) + accelerometer (secondary)       */}
        {/* ------------------------------------------------------------------ */}
        {(() => {
          const displaySteps = pedometer.status === "active"
            ? pedometer.todaySteps   // live session overrides DB
            : (stepReading?.steps ?? 0);
          const distKm = (displaySteps * 0.000762).toFixed(2);
          const kcal = Math.round(displaySteps * 0.04);

          return (
            <Card>
              <CardHeader
                title="Steps"
                subtitle={`Goal: ${stepGoal.toLocaleString()} steps`}
                right={<Footprints className="w-4 h-4 text-text-faint" />}
              />
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={displaySteps / stepGoal}
                  accent="calm"
                  label={displaySteps > 0 ? displaySteps.toLocaleString() : "0"}
                  sublabel={`of ${stepGoal.toLocaleString()}`}
                />
                <div className="flex-1 space-y-2">
                  {displaySteps > 0 && (
                    <div className="text-xs text-text-muted space-y-0.5">
                      <p>~{distKm} km walked</p>
                      <p>~{kcal} kcal burned</p>
                    </div>
                  )}

                  {/* Google Fit sync button */}
                  {settings?.googleFitConnected ? (
                    <button
                      id="fitness-sync-google-fit-btn"
                      onClick={async () => {
                        setIsSyncing(true);
                        await googleFit.syncSteps(7);
                        setIsSyncing(false);
                      }}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all disabled:opacity-60"
                      style={{ background: "var(--accent-calm-dim)", color: "var(--accent-calm)", border: "1px solid var(--accent-calm)" }}
                    >
                      <Cloud className={`h-3.5 w-3.5 ${isSyncing ? "animate-pulse" : ""}`} />
                      {isSyncing ? "Syncing…" : "Sync Google Fit"}
                    </button>
                  ) : isGoogleFitConfigured() ? (
                    <button
                      id="fitness-connect-google-fit-btn"
                      onClick={googleFit.connectGoogleFit}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all hover:brightness-110"
                      style={{ background: "var(--accent-calm-dim)", color: "var(--accent-calm)", border: "1px solid var(--accent-calm)" }}
                    >
                      <CloudOff className="h-3.5 w-3.5" />
                      Connect Google Fit
                    </button>
                  ) : (
                    <p className="text-[11px] text-text-faint leading-relaxed">
                      Google Fit not set up.{" "}
                      <a href="/settings" className="underline underline-offset-2 hover:text-text transition-colors">Configure in Settings →</a>
                    </p>
                  )}
                </div>
              </div>

              {/* Secondary: accelerometer + manual entry */}
              <div className="mt-3 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between gap-3">
                <p className="text-[10px] text-text-faint">
                  {pedometer.status === "active"
                    ? "📱 Counting with motion sensor…"
                    : stepReading?.source === "google_fit"
                    ? "☁️ Synced from Google Fit"
                    : stepReading?.source === "manual"
                    ? "✏️ Steps logged manually"
                    : "No steps recorded yet"}
                </p>
                <div className="flex items-center gap-2">
                  {/* Manual log shortcut */}
                  {!manualStepPrompt && pedometer.status !== "active" && (
                    <button
                      onClick={() => setManualStepPrompt(true)}
                      className="text-[11px] text-text-faint hover:text-text transition-colors underline underline-offset-2"
                    >
                      Log manually
                    </button>
                  )}
                  {/* Accelerometer start/stop */}
                  {pedometer.status === "active" ? (
                    <button
                      onClick={pedometer.stop}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: "var(--danger-dim)", color: "var(--danger)", border: "1px solid var(--danger)" }}
                    >
                      Stop
                    </button>
                  ) : pedometer.status !== "unsupported" && pedometer.status !== "denied" ? (
                    <button
                      onClick={pedometer.start}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
                    >
                      {pedometer.status === "requesting" ? "…" : "Pedometer"}
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Manual step input */}
              {manualStepPrompt && (
                <div className="mt-2 flex gap-2 items-center">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={manualStepInput}
                    onChange={(e) => setManualStepInput(e.target.value)}
                    placeholder="Steps today"
                    className="flex-1 rounded-lg border px-3 py-1.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-focus"
                    style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                    onKeyDown={(e) => e.key === "Enter" && handleManualStepSave()}
                    autoFocus
                  />
                  <button
                    onClick={handleManualStepSave}
                    className="h-8 px-3 rounded-lg text-xs font-medium text-white"
                    style={{ background: "var(--accent-focus)" }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setManualStepPrompt(false); setManualStepInput(""); }}
                    className="h-8 px-2 rounded-lg text-xs text-text-faint hover:text-text transition-colors"
                  >
                    ✕
                  </button>
                </div>
              )}
            </Card>
          );
        })()}
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

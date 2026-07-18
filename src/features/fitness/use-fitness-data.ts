"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Weekday } from "@/lib/db/types";
import { todayISODate, weekdayOf } from "@/lib/date";

export function useFitnessData() {
  const dateISO = todayISODate();
  const weekday = weekdayOf(new Date());

  const settings = useLiveQuery(() => db.settings.get(1), []);

  const proteinTotal = useLiveQuery(
    () =>
      db.proteinLogs
        .where("date")
        .equals(dateISO)
        .toArray()
        .then((rows) => rows.reduce((sum, r) => sum + r.grams, 0)),
    [dateISO]
  );

  const todaysExercises = useLiveQuery(
    () =>
      db.exercises
        .where("weekday")
        .equals(weekday)
        .toArray()
        .then((rows) => rows.filter((r) => !r.archived).sort((a, b) => a.order - b.order)),
    [weekday]
  );

  const stepReading = useLiveQuery(
    () => db.stepReadings.where("date").equals(dateISO).first(),
    [dateISO]
  );

  const todaySession = useLiveQuery(
    () => db.workoutSessions.where("date").equals(dateISO).first(),
    [dateISO]
  );

  return {
    settings,
    dateISO,
    weekday,
    proteinTotal: proteinTotal ?? 0,
    todaysExercises: todaysExercises ?? [],
    stepReading,
    todaySession,
    isLoading: settings === undefined,
  };
}

export async function addProtein(grams: number, dateISO: string) {
  await db.proteinLogs.add({ date: dateISO, grams, loggedAt: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// Workout session lifecycle
// ---------------------------------------------------------------------------

export async function startWorkout(weekday: Weekday, dateISO: string): Promise<number> {
  const id = await db.workoutSessions.add({
    date: dateISO,
    weekday,
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMinutes: null,
    totalVolumeKg: null,
    newPRCount: 0,
  });
  return id as number;
}

export async function finishWorkout(sessionId: number, dateISO: string) {
  const session = await db.workoutSessions.get(sessionId);
  if (!session) return;

  const sets = await db.exerciseSetLogs.where("date").equals(dateISO).toArray();
  const totalVolumeKg = sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
  const newPRCount = sets.filter((s) => s.isPR).length;

  const startedMs = new Date(session.startedAt).getTime();
  const durationMinutes = Math.round((Date.now() - startedMs) / 60000);

  await db.workoutSessions.update(sessionId, {
    completedAt: new Date().toISOString(),
    durationMinutes,
    totalVolumeKg,
    newPRCount,
  });
}

export async function discardWorkout(sessionId: number) {
  await db.workoutSessions.delete(sessionId);
}

/**
 * Logs one completed set and handles PR detection + Exercise record updates.
 * Returns true if this set was a new PR.
 */
export async function logSet(
  exerciseId: number,
  dateISO: string,
  setNumber: number,
  weightKg: number,
  reps: number
): Promise<boolean> {
  const exercise = await db.exercises.get(exerciseId);
  if (!exercise) return false;

  const isBestPR = exercise.bestPR == null || weightKg > exercise.bestPR;
  const isCurrentPR = exercise.currentPR == null || weightKg > exercise.currentPR;
  const isPR = isBestPR || isCurrentPR;

  await db.exerciseSetLogs.add({
    exerciseId,
    date: dateISO,
    setNumber,
    weightKg,
    reps,
    isPR,
  });

  if (isCurrentPR || isBestPR) {
    const patch: Partial<typeof exercise> = {};
    if (isCurrentPR) patch.currentPR = weightKg;
    if (isBestPR) patch.bestPR = weightKg;
    await db.exercises.update(exerciseId, patch);
  }

  return isPR;
}

/** Live query of all set logs for today, keyed by exerciseId. */
export function useTodaySetLogs(dateISO: string) {
  const rows =
    useLiveQuery(
      () => db.exerciseSetLogs.where("date").equals(dateISO).toArray(),
      [dateISO]
    ) ?? [];

  // Group by exerciseId
  const byExercise: Record<number, typeof rows> = {};
  for (const row of rows) {
    if (!byExercise[row.exerciseId]) byExercise[row.exerciseId] = [];
    byExercise[row.exerciseId].push(row);
  }
  return byExercise;
}

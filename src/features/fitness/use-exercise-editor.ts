"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Exercise, Weekday } from "@/lib/db/types";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useExercisesForWeekday(weekday: Weekday) {
  return (
    useLiveQuery(
      () =>
        db.exercises
          .where("weekday")
          .equals(weekday)
          .toArray()
          // Boolean field — filter in JS, not IndexedDB (can't index booleans)
          .then((rows) => rows.filter((r) => !r.archived).sort((a, b) => a.order - b.order)),
      [weekday]
    ) ?? []
  );
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function addExercise(
  data: Omit<Exercise, "id" | "order" | "currentPR" | "bestPR" | "archived" | "createdAt">
) {
  // Set order to max existing order + 1 for this weekday
  const existing = await db.exercises
    .where("weekday")
    .equals(data.weekday)
    .toArray();
  const maxOrder = existing.reduce((m, r) => Math.max(m, r.order), -1);

  return db.exercises.add({
    ...data,
    currentPR: null,
    bestPR: null,
    archived: false,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
  });
}

export async function updateExercise(id: number, patch: Partial<Exercise>) {
  await db.exercises.update(id, patch);
}

export async function archiveExercise(id: number) {
  await db.exercises.update(id, { archived: true });
}

/** Reassigns `order` values based on the supplied ordered array of ids. */
export async function reorderExercises(orderedIds: number[]) {
  await db.transaction("rw", db.exercises, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.exercises.update(orderedIds[i], { order: i });
    }
  });
}

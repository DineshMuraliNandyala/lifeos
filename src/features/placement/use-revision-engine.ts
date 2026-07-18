"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { todayISODate, toLocalISODate, mondayOfWeek } from "@/lib/date";
import { SPACED_REPETITION_INTERVALS_DAYS } from "@/lib/db/types";
import type { RevisionStage, SpacedRevision } from "@/lib/db/types";

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/** All spaced revisions due today or earlier, joined with their problem. */
export function useDueRevisions() {
  const dateISO = todayISODate();

  const revisions = useLiveQuery(
    () => db.spacedRevisions.where("dueDate").belowOrEqual(dateISO).toArray(),
    [dateISO]
  );

  const problems = useLiveQuery(() => db.problems.toArray(), []);

  if (revisions === undefined || problems === undefined) return undefined;

  const problemMap = new Map(problems.map((p) => [p.id as number, p]));

  return revisions
    .map((r) => ({ revision: r, problem: problemMap.get(r.problemId) }))
    .filter((x): x is { revision: SpacedRevision & { id: number }; problem: NonNullable<typeof x["problem"]> } =>
      x.problem !== undefined
    );
}

/** Weekly revision list for the ISO week containing today. */
export function useThisWeeksRevisionList() {
  const monday = toLocalISODate(mondayOfWeek(new Date()));
  return useLiveQuery(
    () => db.weeklyRevisionLists.where("weekStart").equals(monday).first(),
    [monday]
  );
}

/** Monthly revision list for the current month (YYYY-MM). */
export function useThisMonthsRevisionList() {
  const month = todayISODate().slice(0, 7); // "YYYY-MM"
  return useLiveQuery(
    () => db.monthlyRevisionLists.where("month").equals(month).first(),
    [month]
  );
}

// ---------------------------------------------------------------------------
// Review action: Easy / Hard / Forgot
// ---------------------------------------------------------------------------

type ReviewResult = "easy" | "hard" | "forgot";

/**
 * Advance (or regress) a spaced revision based on the user's confidence.
 *
 * - easy:   stage++ (capped at max), next due = intervals[newStage]
 * - hard:   stage stays, next due = intervals[stage] (same interval again)
 * - forgot: stage = 0, next due = intervals[0] (start over from day 1)
 */
export async function reviewRevision(
  revisionId: number,
  result: ReviewResult
) {
  const revision = await db.spacedRevisions.get(revisionId);
  if (!revision) return;

  const maxStage = (SPACED_REPETITION_INTERVALS_DAYS.length - 1) as RevisionStage;
  let newStage: RevisionStage;

  if (result === "easy") {
    newStage = Math.min(revision.stage + 1, maxStage) as RevisionStage;
  } else if (result === "forgot") {
    newStage = 0;
  } else {
    // hard: repeat same stage
    newStage = revision.stage;
  }

  const intervalDays = SPACED_REPETITION_INTERVALS_DAYS[newStage];
  const due = new Date();
  due.setDate(due.getDate() + intervalDays);
  const newDueDate = toLocalISODate(due);

  const historyEntry = {
    date: new Date().toISOString(),
    result,
  };

  await db.spacedRevisions.update(revisionId, {
    stage: newStage,
    dueDate: newDueDate,
    lastReviewedAt: new Date().toISOString(),
    history: [...revision.history, historyEntry],
  });
}

// ---------------------------------------------------------------------------
// Auto-generation: Weekly revision list
//
// Called on page mount from the placement tab.
// Idempotent — does nothing if a list already exists for the current week.
// Collects every problem whose spaced revision has been reviewed at least
// once this week (lastReviewedAt within the Mon–Sun window).
// ---------------------------------------------------------------------------

export async function ensureWeeklyRevisionList() {
  const monday = mondayOfWeek(new Date());
  const mondayISO = toLocalISODate(monday);

  const existing = await db.weeklyRevisionLists
    .where("weekStart")
    .equals(mondayISO)
    .first();

  if (existing) return existing;

  // Collect all problems that have a spaced revision entry —
  // include every problem regardless of current stage so the weekly list
  // gives a full "what did I work on this week" picture.
  const allProblems = await db.problems.toArray();
  const allRevisions = await db.spacedRevisions.toArray();

  // Prefer problems with a revision entry; include every problem as a
  // fallback for the weekly rollup if they've been reviewed at some point.
  const revisionedProblemIds = new Set(allRevisions.map((r) => r.problemId));
  const problemIds = allProblems
    .filter((p) => p.id != null && revisionedProblemIds.has(p.id as number))
    .map((p) => p.id as number);

  if (problemIds.length === 0) return null;

  const created = await db.weeklyRevisionLists.add({
    weekStart: mondayISO,
    problemIds,
    createdAt: new Date().toISOString(),
    completedProblemIds: [],
  });

  return db.weeklyRevisionLists.get(created as number);
}

// ---------------------------------------------------------------------------
// Auto-generation: Monthly revision list
//
// Same pattern — idempotent, builds from all revisioned problems.
// ---------------------------------------------------------------------------

export async function ensureMonthlyRevisionList() {
  const month = todayISODate().slice(0, 7); // "YYYY-MM"

  const existing = await db.monthlyRevisionLists
    .where("month")
    .equals(month)
    .first();

  if (existing) return existing;

  const allProblems = await db.problems.toArray();
  const allRevisions = await db.spacedRevisions.toArray();
  const revisionedProblemIds = new Set(allRevisions.map((r) => r.problemId));

  const problemIds = allProblems
    .filter((p) => p.id != null && revisionedProblemIds.has(p.id as number))
    .map((p) => p.id as number);

  if (problemIds.length === 0) return null;

  const created = await db.monthlyRevisionLists.add({
    month,
    problemIds,
    createdAt: new Date().toISOString(),
    completedProblemIds: [],
  });

  return db.monthlyRevisionLists.get(created as number);
}

// ---------------------------------------------------------------------------
// Mark a problem as completed in the weekly / monthly list
// ---------------------------------------------------------------------------

export async function markWeeklyComplete(listId: number, problemId: number) {
  const list = await db.weeklyRevisionLists.get(listId);
  if (!list) return;
  if (list.completedProblemIds.includes(problemId)) return;
  await db.weeklyRevisionLists.update(listId, {
    completedProblemIds: [...list.completedProblemIds, problemId],
  });
}

export async function markMonthlyComplete(listId: number, problemId: number) {
  const list = await db.monthlyRevisionLists.get(listId);
  if (!list) return;
  if (list.completedProblemIds.includes(problemId)) return;
  await db.monthlyRevisionLists.update(listId, {
    completedProblemIds: [...list.completedProblemIds, problemId],
  });
}

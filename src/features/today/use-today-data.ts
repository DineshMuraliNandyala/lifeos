"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { weekdayOf } from "@/lib/date";

export function useTodayData(dateISO: string) {
  const date = new Date(dateISO + "T00:00:00");
  const weekday = weekdayOf(date);

  const settings = useLiveQuery(() => db.settings.get(1), []);

  const goals = useLiveQuery(
    () =>
      db.dailyGoals
        .toArray()
        .then((rows) => rows.filter((g) => !g.archived && g.weekdays.includes(weekday))),
    [weekday]
  );

  const goalCompletions = useLiveQuery(
    () => db.dailyGoalCompletions.where("date").equals(dateISO).toArray(),
    [dateISO]
  );

  const hobbies = useLiveQuery(
    () =>
      db.hobbies
        .toArray()
        .then((rows) => rows.filter((h) => !h.archived && h.weekdays.includes(weekday))),
    [weekday]
  );

  const hobbyLogs = useLiveQuery(
    () => db.hobbyLogs.where("date").equals(dateISO).toArray(),
    [dateISO]
  );

  const journalEntry = useLiveQuery(
    () => db.journalEntries.where("date").equals(dateISO).first(),
    [dateISO]
  );

  const dueRevisionCount = useLiveQuery(
    () => db.spacedRevisions.where("dueDate").belowOrEqual(dateISO).count(),
    [dateISO]
  );

  const proteinTotal = useLiveQuery(
    () =>
      db.proteinLogs
        .where("date")
        .equals(dateISO)
        .toArray()
        .then((rows) => rows.reduce((sum, r) => sum + r.grams, 0)),
    [dateISO]
  );

  const isLoading =
    settings === undefined ||
    goals === undefined ||
    goalCompletions === undefined ||
    hobbies === undefined ||
    hobbyLogs === undefined;

  return {
    weekday,
    settings,
    goals: goals ?? [],
    goalCompletions: goalCompletions ?? [],
    hobbies: hobbies ?? [],
    hobbyLogs: hobbyLogs ?? [],
    journalEntry,
    dueRevisionCount: dueRevisionCount ?? 0,
    proteinTotal: proteinTotal ?? 0,
    isLoading,
  };
}

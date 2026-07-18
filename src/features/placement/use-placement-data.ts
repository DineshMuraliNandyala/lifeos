"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { todayISODate } from "@/lib/date";

export function usePlacementData() {
  const settings = useLiveQuery(() => db.settings.get(1), []);

  const problems = useLiveQuery(
    () => db.problems.orderBy("solvedDate").reverse().limit(6).toArray(),
    []
  );

  const totalSolved = useLiveQuery(() => db.problems.count(), []);

  const difficultyCounts = useLiveQuery(async () => {
    const all = await db.problems.toArray();
    return {
      Easy: all.filter((p) => p.difficulty === "Easy").length,
      Medium: all.filter((p) => p.difficulty === "Medium").length,
      Hard: all.filter((p) => p.difficulty === "Hard").length,
    };
  }, []);

  const dueToday = useLiveQuery(
    () => db.spacedRevisions.where("dueDate").belowOrEqual(todayISODate()).count(),
    []
  );

  return {
    settings,
    problems: problems ?? [],
    totalSolved: totalSolved ?? 0,
    difficultyCounts: difficultyCounts ?? { Easy: 0, Medium: 0, Hard: 0 },
    dueToday: dueToday ?? 0,
    isLoading: problems === undefined,
  };
}

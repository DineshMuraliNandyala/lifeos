"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toLocalISODate } from "@/lib/date";

/** A day "counts" toward the streak if anything was completed on it —
 * a goal checked off or a hobby logged. Walks backward from today and
 * stops at the first gap. */
export function useStreak(): number {
  const streak = useLiveQuery(async () => {
    const activeDates = new Set<string>();

    const completedGoals = await db.dailyGoalCompletions
      .filter((c) => c.completed)
      .toArray();
    completedGoals.forEach((c) => activeDates.add(c.date));

    const loggedHobbies = await db.hobbyLogs.filter((h) => h.minutes > 0).toArray();
    loggedHobbies.forEach((h) => activeDates.add(h.date));

    let count = 0;
    const cursor = new Date();
    // Allow today to be "in progress" without breaking the streak if
    // yesterday was completed — only count today if it already has activity.
    while (true) {
      const iso = toLocalISODate(cursor);
      if (activeDates.has(iso)) {
        count += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else if (iso === toLocalISODate(new Date())) {
        // today has nothing yet — don't break the streak, just skip it
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return count;
  }, []);

  return streak ?? 0;
}

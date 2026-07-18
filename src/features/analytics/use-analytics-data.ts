"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { toLocalISODate } from "@/lib/date";

export interface HeatmapDay {
  date: string;
  intensity: number; // 0-1
}

export function useAnalyticsData() {
  const heatmap = useLiveQuery(async () => {
    const days = 90;
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));

    const [goalCompletions, hobbyLogs, proteinLogs] = await Promise.all([
      db.dailyGoalCompletions.toArray(),
      db.hobbyLogs.toArray(),
      db.proteinLogs.toArray(),
    ]);

    const byDate = new Map<string, number>();
    goalCompletions.forEach((c) => {
      if (c.completed) byDate.set(c.date, (byDate.get(c.date) ?? 0) + 1);
    });
    hobbyLogs.forEach((h) => {
      if (h.minutes > 0) byDate.set(h.date, (byDate.get(h.date) ?? 0) + 1);
    });
    proteinLogs.forEach((p) => {
      byDate.set(p.date, (byDate.get(p.date) ?? 0) + 0.5);
    });

    const maxCount = Math.max(1, ...Array.from(byDate.values()));
    const result: HeatmapDay[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = toLocalISODate(d);
      result.push({ date: iso, intensity: Math.min(1, (byDate.get(iso) ?? 0) / maxCount) });
    }
    return result;
  }, []);

  const proteinTrend = useLiveQuery(async () => {
    const logs = await db.proteinLogs.toArray();
    const byDate = new Map<string, number>();
    logs.forEach((l) => byDate.set(l.date, (byDate.get(l.date) ?? 0) + l.grams));

    const days = 7;
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const result: { date: string; grams: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const iso = toLocalISODate(d);
      result.push({ date: iso.slice(5), grams: byDate.get(iso) ?? 0 });
    }
    return result;
  }, []);

  const totals = useLiveQuery(async () => {
    const [problems, sessions, notes] = await Promise.all([
      db.problems.count(),
      db.workoutSessions.count(),
      db.notes.count(),
    ]);
    return { problems, sessions, notes };
  }, []);

  return {
    heatmap: heatmap ?? [],
    proteinTrend: proteinTrend ?? [],
    totals: totals ?? { problems: 0, sessions: 0, notes: 0 },
    isLoading: heatmap === undefined,
  };
}

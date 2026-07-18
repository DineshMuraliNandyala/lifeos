"use client";

import type { HeatmapDay } from "./use-analytics-data";

function colorFor(intensity: number): string {
  if (intensity === 0) return "var(--border)";
  if (intensity < 0.4) return "var(--danger)";
  if (intensity < 0.7) return "var(--warning)";
  return "var(--success)";
}

export function CompletionHeatmap({ days }: { days: HeatmapDay[] }) {
  // Lay out into columns of 7 (weeks), oldest first
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-1">
          {week.map((day) => (
            <div
              key={day.date}
              title={day.date}
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{
                backgroundColor: colorFor(day.intensity),
                opacity: day.intensity === 0 ? 0.5 : 0.35 + day.intensity * 0.65,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

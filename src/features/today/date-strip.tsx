"use client";

import { cn } from "@/lib/utils";
import { toLocalISODate, trailingDateRange, isFutureDate, isSameDate } from "@/lib/date";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function DateStrip({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (date: Date) => void;
}) {
  const days = trailingDateRange(7);
  const today = new Date();

  return (
    <div className="flex justify-between gap-1.5">
      {days.map((day) => {
        const future = isFutureDate(day, today);
        const isSelected = isSameDate(day, selected);
        const isToday = isSameDate(day, today);

        return (
          <button
            key={toLocalISODate(day)}
            disabled={future}
            onClick={() => onSelect(day)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-colors",
              isSelected ? "bg-focus text-[#0a0b0e]" : "text-text-muted hover:bg-surface-2",
              future && "opacity-30"
            )}
          >
            <span className="text-[10px] font-medium uppercase">
              {DAY_LETTERS[day.getDay()]}
            </span>
            <span
              className={cn(
                "font-mono-tab text-sm font-semibold",
                isToday && !isSelected && "text-focus"
              )}
            >
              {day.getDate()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

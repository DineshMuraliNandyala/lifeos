import type { Weekday } from "./db/types";

const WEEKDAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** "YYYY-MM-DD" for a given Date, in local time (not UTC — avoids the
 * classic bug where toISOString() shifts the date near midnight). */
export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISODate(): string {
  return toLocalISODate(new Date());
}

export function weekdayOf(date: Date): Weekday {
  return WEEKDAYS[date.getDay()];
}

export function weekdayLabel(weekday: Weekday): string {
  const labels: Record<Weekday, string> = {
    sun: "Sun",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
  };
  return labels[weekday];
}

/** Returns `count` consecutive dates centered so `count - 1` trailing days
 * lead up to and include today — used by the Today horizontal date strip. */
export function trailingDateRange(count: number, anchor: Date = new Date()): Date[] {
  const dates: Date[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
}

export function isFutureDate(date: Date, today: Date = new Date()): boolean {
  const a = toLocalISODate(date);
  const b = toLocalISODate(today);
  return a > b;
}

export function isSameDate(a: Date, b: Date): boolean {
  return toLocalISODate(a) === toLocalISODate(b);
}

export function mondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // shift Sunday to previous Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

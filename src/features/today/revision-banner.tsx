"use client";

import Link from "next/link";
import { ChevronRight, AlarmClock } from "lucide-react";

export function RevisionBanner({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <Link
      href="/placement?tab=revision"
      className="flex items-center gap-3 rounded-2xl border border-warning/30 bg-warning-dim px-4 py-3 transition-colors hover:brightness-110"
    >
      <AlarmClock className="w-4 h-4 text-warning shrink-0" />
      <p className="flex-1 text-sm font-medium text-text">
        {count} LeetCode {count === 1 ? "problem" : "problems"} due for revision
      </p>
      <ChevronRight className="w-4 h-4 text-warning shrink-0" />
    </Link>
  );
}

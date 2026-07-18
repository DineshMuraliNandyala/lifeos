"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckSquare, Square, Calendar, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useThisWeeksRevisionList,
  useThisMonthsRevisionList,
  markWeeklyComplete,
  markMonthlyComplete,
} from "./use-revision-engine";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { Difficulty } from "@/lib/db/types";

const DIFFICULTY_TONE = { Easy: "success", Medium: "warning", Hard: "danger" } as const;

type Tab = "week" | "month";

// ---------------------------------------------------------------------------
// Problem row with checkbox
// ---------------------------------------------------------------------------

function RevisionRow({
  problemId,
  completed,
  onToggle,
}: {
  problemId: number;
  completed: boolean;
  onToggle: () => void;
}) {
  const problem = useLiveQuery(() => db.problems.get(problemId), [problemId]);

  if (!problem) return null;

  return (
    <button
      onClick={onToggle}
      className="flex w-full items-center gap-3 py-3 border-b border-border-soft last:border-0 text-left transition-colors hover:bg-surface-hover rounded-lg px-1"
    >
      {completed ? (
        <CheckSquare className="h-4 w-4 shrink-0 text-success" />
      ) : (
        <Square className="h-4 w-4 shrink-0 text-text-faint" />
      )}
      <div className="flex-1 min-w-0">
        <p
          className={[
            "text-sm font-medium truncate",
            completed ? "text-text-faint line-through" : "text-text",
          ].join(" ")}
        >
          {problem.number ? `${problem.number}. ` : ""}
          {problem.title}
        </p>
        <p className="text-xs text-text-faint truncate">
          {problem.topics.join(", ") || "No topics"}
        </p>
      </div>
      <Badge tone={DIFFICULTY_TONE[problem.difficulty as Difficulty]} className="shrink-0 text-[10px] px-2 py-0.5">
        {problem.difficulty}
      </Badge>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

interface RevisionListSheetProps {
  open: boolean;
  onClose: () => void;
}

export function RevisionListSheet({ open, onClose }: RevisionListSheetProps) {
  const [tab, setTab] = useState<Tab>("week");

  const weeklyList = useThisWeeksRevisionList();
  const monthlyList = useThisMonthsRevisionList();

  const activeList = tab === "week" ? weeklyList : monthlyList;
  const problemIds = activeList?.problemIds ?? [];
  const completedIds = new Set(activeList?.completedProblemIds ?? []);
  const completedCount = completedIds.size;
  const progress = problemIds.length > 0 ? completedCount / problemIds.length : 0;

  async function handleToggle(problemId: number) {
    if (!activeList?.id) return;
    if (completedIds.has(problemId)) {
      // Uncomplete — remove from completedProblemIds
      if (tab === "week") {
        await db.weeklyRevisionLists.update(activeList.id, {
          completedProblemIds: (activeList.completedProblemIds ?? []).filter(
            (id) => id !== problemId
          ),
        });
      } else {
        await db.monthlyRevisionLists.update(activeList.id, {
          completedProblemIds: (activeList.completedProblemIds ?? []).filter(
            (id) => id !== problemId
          ),
        });
      }
    } else {
      if (tab === "week") {
        await markWeeklyComplete(activeList.id, problemId);
      } else {
        await markMonthlyComplete(activeList.id, problemId);
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-[1.5rem] bg-bg-elevated border border-border pb-safe"
            style={{ maxHeight: "88dvh" }}
          >
            {/* Drag handle */}
            <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-border" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h2 className="font-display text-[17px] font-semibold text-text">
                Revision lists
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-text-faint hover:text-text hover:bg-surface-hover transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab strip */}
            <div className="px-5 pb-3 flex gap-2">
              {([
                { key: "week" as Tab, label: "This week", icon: Calendar },
                { key: "month" as Tab, label: "This month", icon: BookOpen },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={[
                    "flex items-center gap-1.5 h-9 px-4 rounded-full text-xs font-medium transition-all",
                    tab === key
                      ? "bg-focus text-[#0a0b0e]"
                      : "bg-surface-2 text-text-muted hover:bg-surface-hover hover:text-text",
                  ].join(" ")}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>

            {/* Progress bar */}
            {problemIds.length > 0 && (
              <div className="px-5 pb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-text-faint">
                    {completedCount} / {problemIds.length} reviewed
                  </p>
                  <p className="text-xs font-medium text-focus">
                    {Math.round(progress * 100)}%
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-focus transition-all duration-500"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Problem list */}
            <div className="overflow-y-auto px-5 pb-8" style={{ maxHeight: "58dvh" }}>
              {!activeList ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-text-faint">
                    No {tab === "week" ? "weekly" : "monthly"} list generated yet.
                  </p>
                  <p className="text-xs text-text-faint mt-1">
                    Add problems and the list will be created automatically.
                  </p>
                </div>
              ) : problemIds.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-text-faint">No problems in this list yet.</p>
                </div>
              ) : (
                problemIds.map((id) => (
                  <RevisionRow
                    key={id}
                    problemId={id}
                    completed={completedIds.has(id)}
                    onToggle={() => handleToggle(id)}
                  />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

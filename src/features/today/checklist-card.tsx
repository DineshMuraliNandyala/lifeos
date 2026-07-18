"use client";

import { motion } from "framer-motion";
import { Check, ListChecks } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import type { DailyGoal, DailyGoalCompletion, Hobby, HobbyLog } from "@/lib/db/types";

interface ChecklistItem {
  key: string;
  title: string;
  color: string;
  completed: boolean;
  onToggle: () => void;
}

export function ChecklistCard({
  dateISO,
  goals,
  goalCompletions,
  hobbies,
  hobbyLogs,
}: {
  dateISO: string;
  goals: DailyGoal[];
  goalCompletions: DailyGoalCompletion[];
  hobbies: Hobby[];
  hobbyLogs: HobbyLog[];
}) {
  const items: ChecklistItem[] = [
    ...goals.map((goal) => {
      const completion = goalCompletions.find((c) => c.goalId === goal.id);
      return {
        key: `goal-${goal.id}`,
        title: goal.title,
        color: goal.color,
        completed: completion?.completed ?? false,
        onToggle: () => toggleGoal(goal.id!, dateISO, completion),
      };
    }),
    ...hobbies.map((hobby) => {
      const log = hobbyLogs.find((l) => l.hobbyId === hobby.id);
      const completed = (log?.minutes ?? 0) >= hobby.goalMinutes;
      return {
        key: `hobby-${hobby.id}`,
        title: hobby.name,
        color: hobby.color,
        completed,
        onToggle: () => toggleHobby(hobby.id!, dateISO, log, hobby.goalMinutes),
      };
    }),
  ];

  const doneCount = items.filter((i) => i.completed).length;

  return (
    <Card>
      <CardHeader
        title="Today's checklist"
        subtitle={items.length ? `${doneCount} of ${items.length} done` : undefined}
        right={<ListChecks className="w-4 h-4 text-text-faint" />}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing scheduled today"
          description="Add goals or hobbies in Settings and they'll show up here on the right weekdays."
          className="py-6"
        />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.key}>
              <button
                onClick={item.onToggle}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  item.completed ? "bg-success-dim" : "bg-surface-2 hover:bg-surface-hover"
                )}
              >
                <motion.span
                  initial={false}
                  animate={{
                    backgroundColor: item.completed ? "var(--success)" : "transparent",
                    borderColor: item.completed ? "var(--success)" : item.color,
                  }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                >
                  {item.completed && <Check className="h-3 w-3 text-[#0a0b0e]" strokeWidth={3} />}
                </motion.span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    item.completed ? "text-success" : "text-text"
                  )}
                >
                  {item.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

async function toggleGoal(
  goalId: number,
  dateISO: string,
  existing: DailyGoalCompletion | undefined
) {
  if (existing?.id) {
    await db.dailyGoalCompletions.update(existing.id, {
      completed: !existing.completed,
      completedAt: !existing.completed ? new Date().toISOString() : null,
    });
  } else {
    await db.dailyGoalCompletions.add({
      goalId,
      date: dateISO,
      completed: true,
      completedAt: new Date().toISOString(),
    });
  }
}

async function toggleHobby(
  hobbyId: number,
  dateISO: string,
  existing: HobbyLog | undefined,
  goalMinutes: number
) {
  const alreadyDone = (existing?.minutes ?? 0) >= goalMinutes;
  if (existing?.id) {
    await db.hobbyLogs.update(existing.id, { minutes: alreadyDone ? 0 : goalMinutes });
  } else {
    await db.hobbyLogs.add({ hobbyId, date: dateISO, minutes: goalMinutes, note: null });
  }
}

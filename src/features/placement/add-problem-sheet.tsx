"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { todayISODate, toLocalISODate } from "@/lib/date";
import { SPACED_REPETITION_INTERVALS_DAYS } from "@/lib/db/types";
import type { Difficulty } from "@/lib/db/types";

export function AddProblemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [topics, setTopics] = useState("");

  async function handleSave() {
    if (!title.trim()) return;
    const problemId = await db.problems.add({
      number: number ? Number(number) : null,
      title: title.trim(),
      difficulty,
      topics: topics
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: null,
      approach: null,
      mistakes: null,
      solvedDate: todayISODate(),
      source: "manual",
      leetcodeSlug: null,
    });

    const firstIntervalDays = SPACED_REPETITION_INTERVALS_DAYS[0];
    const due = new Date();
    due.setDate(due.getDate() + firstIntervalDays);

    await db.spacedRevisions.add({
      problemId: problemId as number,
      stage: 0,
      dueDate: toLocalISODate(due),
      lastReviewedAt: null,
      history: [],
    });

    setTitle("");
    setNumber("");
    setTopics("");
    setDifficulty("Medium");
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl border border-border bg-bg-elevated p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-text">Add problem</h2>
              <button onClick={onClose} className="text-text-faint">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (e.g. Two Sum)"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-focus"
              />
              <div className="flex gap-3">
                <input
                  value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="#"
                  inputMode="numeric"
                  className="w-16 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-focus"
                />
                <div className="flex flex-1 gap-1.5">
                  {(["Easy", "Medium", "Hard"] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors ${
                        difficulty === d
                          ? "border-focus bg-focus-dim text-focus"
                          : "border-border bg-surface-2 text-text-muted"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="Topics, comma separated"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text placeholder:text-text-faint outline-none focus:border-focus"
              />
              <Button onClick={handleSave} className="mt-1 w-full">
                Save problem
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

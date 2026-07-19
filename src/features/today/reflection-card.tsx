"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotebookPen, CheckCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { db } from "@/lib/db";
import type { JournalEntry } from "@/lib/db/types";

export function ReflectionCard({
  dateISO,
  entry,
  editable,
}: {
  dateISO: string;
  entry: JournalEntry | undefined;
  editable: boolean;
}) {
  const [reflection, setReflection] = useState(entry?.reflectionMarkdown ?? "");
  const [sdTopic,    setSdTopic]    = useState(entry?.systemDesignTopic ?? "");
  const [saved,      setSaved]      = useState(false);

  async function persist(next: Partial<JournalEntry>) {
    if (entry?.id) {
      await db.journalEntries.update(entry.id, next);
    } else {
      await db.journalEntries.add({
        date:               dateISO,
        reflectionMarkdown: next.reflectionMarkdown ?? "",
        systemDesignTopic:  next.systemDesignTopic  ?? null,
        mood:               null,
        photoIds:           [],
      });
    }
    // Show "Saved ✓" toast for 1.8 s
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <Card>
      <CardHeader
        title="Daily reflection"
        subtitle="Auto-saves when you leave the field"
        right={
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.span
                key="saved"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="flex items-center gap-1 text-[11px] font-medium"
                style={{ color: "var(--success)" }}
              >
                <CheckCircle className="h-3 w-3" />
                Saved
              </motion.span>
            ) : (
              <motion.span key="icon" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <NotebookPen className="w-4 h-4 text-text-faint" />
              </motion.span>
            )}
          </AnimatePresence>
        }
      />

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">
            System design topic
          </label>
          <input
            disabled={!editable}
            value={sdTopic}
            onChange={(e) => setSdTopic(e.target.value)}
            onBlur={() => persist({ systemDesignTopic: sdTopic || null })}
            placeholder="e.g. Rate limiter design"
            className="w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none transition-colors focus:border-[var(--accent-focus)] disabled:opacity-50"
            style={{ background: "var(--glass-bg)", backdropFilter: "blur(8px)" }}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">
            Reflection
          </label>
          <textarea
            disabled={!editable}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            onBlur={() => persist({ reflectionMarkdown: reflection })}
            rows={4}
            placeholder="How did today go? What did you learn? What would you do differently?"
            className="w-full resize-none rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none transition-colors focus:border-[var(--accent-focus)] disabled:opacity-50"
            style={{ background: "var(--glass-bg)", backdropFilter: "blur(8px)" }}
          />
        </div>

        <p className="text-[11px] text-text-faint leading-relaxed">
          {editable
            ? "📝 Tap outside the field to save. Your reflection is stored locally — only you can see it."
            : "📅 Past entries are read-only."}
        </p>
      </div>
    </Card>
  );
}

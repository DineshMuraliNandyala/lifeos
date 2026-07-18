"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
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
  const [sdTopic, setSdTopic] = useState(entry?.systemDesignTopic ?? "");

  async function persist(next: Partial<JournalEntry>) {
    if (entry?.id) {
      await db.journalEntries.update(entry.id, next);
    } else {
      await db.journalEntries.add({
        date: dateISO,
        reflectionMarkdown: next.reflectionMarkdown ?? "",
        systemDesignTopic: next.systemDesignTopic ?? null,
        mood: null,
        photoIds: [],
      });
    }
  }

  return (
    <Card>
      <CardHeader
        title="Daily reflection"
        subtitle="Markdown supported"
        right={<NotebookPen className="w-4 h-4 text-text-faint" />}
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
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-focus disabled:opacity-50"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-text-muted mb-1 block">Reflection</label>
          <textarea
            disabled={!editable}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            onBlur={() => persist({ reflectionMarkdown: reflection })}
            rows={4}
            placeholder="How did today go?"
            className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-focus disabled:opacity-50"
          />
        </div>
        {!editable && (
          <p className="text-[11px] text-text-faint">Future days aren&apos;t editable yet.</p>
        )}
      </div>
    </Card>
  );
}

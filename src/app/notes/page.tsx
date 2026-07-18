"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, BookMarked, CalendarDays, Pin } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useNotesData, addNote } from "@/features/notes/use-notes-data";
import type { NoteCategory } from "@/lib/db/types";

const CATEGORIES: NoteCategory[] = ["Algorithms", "System Design", "Interview", "Gym", "Life"];

export default function NotesPage() {
  const { notes, recentJournalEntries } = useNotesData();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<NoteCategory>("Life");
  const [body, setBody] = useState("");

  async function handleSave() {
    if (!title.trim()) return;
    await addNote(title.trim(), category, body.trim());
    setTitle("");
    setBody("");
    setComposing(false);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Notes"
        title="Journal & knowledge"
        right={
          <Button size="sm" variant="secondary" onClick={() => setComposing((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> Note
          </Button>
        }
      />

      <Card className="mb-4">
        <CardHeader
          title="Daily journal"
          subtitle={`${recentJournalEntries.length} recent ${recentJournalEntries.length === 1 ? "entry" : "entries"}`}
          right={<CalendarDays className="w-4 h-4 text-text-faint" />}
        />
        {recentJournalEntries.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No reflections yet"
            description="Write today's reflection from the Today tab and it'll show up here."
            className="py-6"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border-soft">
            {recentJournalEntries.map((entry) => (
              <li key={entry.id} className="py-2.5">
                <p className="text-xs font-medium text-text-muted mb-0.5">{entry.date}</p>
                <p className="truncate text-sm text-text">
                  {entry.reflectionMarkdown || "(no reflection written)"}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Link href="/today" className="mt-2 inline-block text-xs font-medium text-focus">
          Go write today&apos;s entry →
        </Link>
      </Card>

      {composing && (
        <Card className="mb-4">
          <CardHeader title="New note" />
          <div className="flex flex-col gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-focus"
            />
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                    category === c
                      ? "border-calm bg-calm-dim text-calm"
                      : "border-border bg-surface-2 text-text-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Markdown body…"
              className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-focus"
            />
            <Button onClick={handleSave}>Save note</Button>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Knowledge base" right={<BookMarked className="w-4 h-4 text-text-faint" />} />
        {notes.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            title="No notes yet"
            description="Capture algorithms, system design write-ups, or life notes — searchable and taggable."
            action={
              <Button size="sm" onClick={() => setComposing(true)}>
                Write your first note
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border-soft">
            {notes.map((note) => (
              <li key={note.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-text">
                    {note.pinned && <Pin className="h-3 w-3 text-warning shrink-0" />}
                    {note.title}
                  </p>
                  <p className="truncate text-xs text-text-faint">{note.bodyMarkdown}</p>
                </div>
                <Badge tone="calm">{note.category}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PageShell>
  );
}

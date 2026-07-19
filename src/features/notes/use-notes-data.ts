"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { NoteCategory } from "@/lib/db/types";

export function useNotesData() {
  const notes = useLiveQuery(
    () => db.notes.toArray().then((rows) => rows.sort((a, b) => Number(b.pinned) - Number(a.pinned))),
    []
  );

  const recentJournalEntries = useLiveQuery(
    () => db.journalEntries.orderBy("date").reverse().limit(5).toArray(),
    []
  );

  return {
    notes: notes ?? [],
    recentJournalEntries: recentJournalEntries ?? [],
    isLoading: notes === undefined,
  };
}

export async function addNote(title: string, category: NoteCategory, body: string) {
  const now = new Date().toISOString();
  await db.notes.add({
    title,
    category,
    bodyMarkdown: body,
    tags: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateNote(
  id: number,
  patch: { title: string; category: NoteCategory; bodyMarkdown: string }
) {
  await db.notes.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteNote(id: number) {
  await db.notes.delete(id);
}

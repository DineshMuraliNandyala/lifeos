"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BookMarked, CalendarDays, Pin, X, ChevronRight, Tag, Pencil, Trash2, Check } from "lucide-react";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useNotesData, addNote, updateNote, deleteNote } from "@/features/notes/use-notes-data";
import type { Note, NoteCategory } from "@/lib/db/types";

const CATEGORIES: NoteCategory[] = ["Algorithms", "System Design", "Interview", "Gym", "Life"];

const CATEGORY_ACCENT: Record<NoteCategory, string> = {
  Algorithms:      "var(--accent-focus)",
  "System Design": "var(--accent-calm)",
  Interview:       "var(--accent-energy)",
  Gym:             "var(--success)",
  Life:            "var(--warning)",
};

/* ── Shared glass input/textarea styles ───────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm text-text " +
  "placeholder:text-text-faint outline-none transition-colors focus:border-[var(--accent-focus)] " +
  "disabled:opacity-50";
const inputStyle = { background: "var(--glass-bg)", backdropFilter: "blur(8px)" };

export default function NotesPage() {
  const { notes, recentJournalEntries } = useNotesData();

  /* compose state */
  const [composing,  setComposing]  = useState(false);
  const [cTitle,     setCTitle]     = useState("");
  const [cCategory,  setCCategory]  = useState<NoteCategory>("Life");
  const [cBody,      setCBody]      = useState("");

  /* detail / edit state */
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editing,      setEditing]      = useState(false);
  const [eTitle,       setETitle]       = useState("");
  const [eCategory,    setECategory]    = useState<NoteCategory>("Life");
  const [eBody,        setEBody]        = useState("");
  const [confirmDel,   setConfirmDel]   = useState(false);

  function openNote(note: Note) {
    setSelectedNote(note);
    setEditing(false);
    setConfirmDel(false);
  }

  function startEdit() {
    if (!selectedNote) return;
    setETitle(selectedNote.title);
    setECategory(selectedNote.category);
    setEBody(selectedNote.bodyMarkdown);
    setEditing(true);
    setConfirmDel(false);
  }

  async function saveEdit() {
    if (!selectedNote?.id || !eTitle.trim()) return;
    await updateNote(selectedNote.id as number, {
      title: eTitle.trim(),
      category: eCategory,
      bodyMarkdown: eBody.trim(),
    });
    setSelectedNote((prev) =>
      prev ? { ...prev, title: eTitle.trim(), category: eCategory, bodyMarkdown: eBody.trim() } : null
    );
    setEditing(false);
  }

  async function handleDelete() {
    if (!selectedNote?.id) return;
    await deleteNote(selectedNote.id as number);
    setSelectedNote(null);
    setEditing(false);
    setConfirmDel(false);
  }

  async function handleSave() {
    if (!cTitle.trim()) return;
    await addNote(cTitle.trim(), cCategory, cBody.trim());
    setCTitle(""); setCBody(""); setComposing(false);
  }

  return (
    <>
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

        {/* ── Daily journal ─────────────────────────────────────────────── */}
        <Card className="mb-4">
          <CardHeader
            title="Daily journal"
            subtitle={`${recentJournalEntries.length} recent ${recentJournalEntries.length === 1 ? "entry" : "entries"}`}
            right={<CalendarDays className="w-4 h-4 text-text-faint" />}
          />
          {recentJournalEntries.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No reflections yet"
              description="Write today's reflection from the Today tab." className="py-6" />
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {recentJournalEntries.map((entry) => (
                <li key={entry.id} className="py-2.5">
                  <p className="text-xs font-medium text-text-muted mb-0.5">{entry.date}</p>
                  <p className="line-clamp-2 text-sm text-text leading-relaxed">
                    {entry.reflectionMarkdown || "(no reflection written)"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ── Compose new note ──────────────────────────────────────────── */}
        <AnimatePresence>
          {composing && (
            <motion.div key="compose"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="mb-4"
            >
              <Card>
                <CardHeader title="New note" right={
                  <button onClick={() => setComposing(false)} className="text-text-faint hover:text-text">
                    <X className="h-4 w-4" />
                  </button>
                } />
                <div className="flex flex-col gap-3">
                  <input value={cTitle} onChange={(e) => setCTitle(e.target.value)}
                    placeholder="Title" autoFocus className={inputCls} style={inputStyle} />
                  <CategoryPicker value={cCategory} onChange={setCCategory} />
                  <textarea value={cBody} onChange={(e) => setCBody(e.target.value)}
                    rows={4} placeholder="Markdown body…" className={`${inputCls} resize-none`} style={inputStyle} />
                  <Button onClick={handleSave}>Save note</Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Knowledge base list ───────────────────────────────────────── */}
        <Card>
          <CardHeader title="Knowledge base" right={<BookMarked className="w-4 h-4 text-text-faint" />} />
          {notes.length === 0 ? (
            <EmptyState icon={BookMarked} title="No notes yet"
              description="Capture algorithms, system design write-ups, or life notes."
              action={<Button size="sm" onClick={() => setComposing(true)}>Write your first note</Button>} />
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {notes.map((note) => (
                <motion.li key={note.id} whileTap={{ scale: 0.98 }}
                  onClick={() => openNote(note)}
                  className="flex items-center justify-between gap-3 py-3 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-text">
                      {note.pinned && <Pin className="h-3 w-3 text-warning shrink-0" />}
                      {note.title}
                    </p>
                    {note.bodyMarkdown && (
                      <p className="truncate text-xs text-text-faint mt-0.5">{note.bodyMarkdown}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone="calm">{note.category}</Badge>
                    <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
      </PageShell>

      {/* ── Note detail / edit bottom sheet ──────────────────────────────── */}
      <AnimatePresence>
        {selectedNote && (
          <>
            <motion.div key="bd" className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!editing) setSelectedNote(null); }}
            />

            <motion.div key="sheet"
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
            >
              <div className="relative m-3 rounded-3xl overflow-hidden"
                style={{
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(48px) saturate(200%)",
                  WebkitBackdropFilter: "blur(48px) saturate(200%)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: "var(--glass-shadow), 0 0 80px rgba(0,0,0,0.4)",
                  maxHeight: "85vh",
                }}
              >
                {/* Specular rim */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{ background: "linear-gradient(90deg,transparent,var(--glass-highlight),transparent)" }} />

                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="h-1 w-10 rounded-full" style={{ background: "var(--border)" }} />
                </div>

                <div className="px-5 pb-8 overflow-y-auto" style={{ maxHeight: "calc(85vh - 56px)" }}>
                  {editing ? (
                    /* ── Edit mode ──────────────────────────────────────── */
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-text-faint">Edit note</p>
                        <button onClick={() => setEditing(false)} className="text-text-faint hover:text-text">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <input value={eTitle} onChange={(e) => setETitle(e.target.value)}
                        placeholder="Title" className={inputCls} style={inputStyle} />
                      <CategoryPicker value={eCategory} onChange={setECategory} />
                      <textarea value={eBody} onChange={(e) => setEBody(e.target.value)}
                        rows={6} placeholder="Markdown body…" className={`${inputCls} resize-none`} style={inputStyle} />
                      <button onClick={saveEdit}
                        className="flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all"
                        style={{ background: "var(--accent-focus)", color: "#fff" }}
                      >
                        <Check className="h-4 w-4" /> Save changes
                      </button>
                    </div>
                  ) : (
                    /* ── View mode ──────────────────────────────────────── */
                    <>
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Tag className="h-3.5 w-3.5" style={{ color: CATEGORY_ACCENT[selectedNote.category] }} />
                            <span className="text-xs font-bold uppercase tracking-widest"
                              style={{ color: CATEGORY_ACCENT[selectedNote.category] }}>
                              {selectedNote.category}
                            </span>
                          </div>
                          <h2 className="font-display text-xl font-bold text-text leading-tight">
                            {selectedNote.title}
                          </h2>
                          <p className="text-xs text-text-faint mt-1">
                            {new Date(selectedNote.createdAt).toLocaleDateString(undefined, {
                              weekday: "short", year: "numeric", month: "short", day: "numeric",
                            })}
                          </p>
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={startEdit}
                            className="rounded-full p-2 text-text-faint hover:text-text transition-colors"
                            style={{ background: "var(--surface-2)" }} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {confirmDel ? (
                            <button onClick={handleDelete}
                              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                              style={{ background: "var(--danger)" }}>
                              Confirm delete
                            </button>
                          ) : (
                            <button onClick={() => setConfirmDel(true)}
                              className="rounded-full p-2 text-text-faint hover:text-danger transition-colors"
                              style={{ background: "var(--surface-2)" }} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => setSelectedNote(null)}
                            className="rounded-full p-2 text-text-faint hover:text-text transition-colors"
                            style={{ background: "var(--surface-2)" }}>
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Body */}
                      {selectedNote.bodyMarkdown ? (
                        <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                          {selectedNote.bodyMarkdown}
                        </div>
                      ) : (
                        <p className="text-sm text-text-faint italic">No content written.</p>
                      )}

                      {/* Edit hint when confirm-delete is active */}
                      {confirmDel && (
                        <div className="mt-4 rounded-xl px-3 py-2 text-xs"
                          style={{ background: "var(--danger-dim)", color: "var(--danger)" }}>
                          ⚠️ Tap "Confirm delete" to permanently delete this note, or tap elsewhere to cancel.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Category picker sub-component ─────────────────────────────────────────── */
function CategoryPicker({ value, onChange }: { value: NoteCategory; onChange: (c: NoteCategory) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORIES.map((c) => (
        <button key={c} onClick={() => onChange(c)}
          className="rounded-full border px-2.5 py-1 text-xs font-medium transition-all"
          style={{
            borderColor: value === c ? CATEGORY_ACCENT[c] : "var(--border)",
            background:  value === c ? `${CATEGORY_ACCENT[c]}20` : "var(--surface-2)",
            color:       value === c ? CATEGORY_ACCENT[c] : "var(--text-muted)",
          }}
        >{c}</button>
      ))}
    </div>
  );
}

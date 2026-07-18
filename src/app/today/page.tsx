"use client";

import { useState } from "react";
import { motion, type Variants } from "framer-motion";
import { PageShell } from "@/components/layout/page-shell";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Skeleton } from "@/components/ui/skeleton";
import { DateStrip } from "@/features/today/date-strip";
import { ChecklistCard } from "@/features/today/checklist-card";
import { ReflectionCard } from "@/features/today/reflection-card";
import { RevisionBanner } from "@/features/today/revision-banner";
import { useTodayData } from "@/features/today/use-today-data";
import { useStreak } from "@/features/today/use-streak";
import { toLocalISODate, isSameDate } from "@/lib/date";

const QUOTES = [
  "Discipline is choosing between what you want now and what you want most.",
  "Small daily improvements compound into stunning results.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "You don't rise to the level of your goals, you fall to the level of your systems.",
  "Focus on the process, and the results will follow.",
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5)  return "Still up?";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Winding down?";
}

/** Stagger container — children animate in one by one */
const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 360, damping: 28 } },
};

export default function TodayPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateISO  = toLocalISODate(selectedDate);
  const editable = !(dateISO > toLocalISODate(new Date()));
  const quote    = QUOTES[new Date().getDate() % QUOTES.length];

  const streak = useStreak();
  const data   = useTodayData(dateISO);

  const scheduledCount = data.goals.length + data.hobbies.length;
  const doneCount =
    data.goalCompletions.filter((c) => c.completed).length +
    data.hobbyLogs.filter((l) => l.minutes > 0).length;
  const ringValue = scheduledCount > 0 ? doneCount / scheduledCount : 0;

  return (
    <PageShell>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4"
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <motion.header
          variants={fadeUp}
          className="relative flex items-start justify-between rounded-3xl p-5 overflow-hidden"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(32px) saturate(180%)",
            WebkitBackdropFilter: "blur(32px) saturate(180%)",
            border: "1px solid var(--glass-border)",
            boxShadow: "var(--glass-shadow)",
          }}
        >
          {/* Specular top rim */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--glass-highlight), transparent)",
            }}
          />
          {/* Ambient background glow */}
          <div
            className="pointer-events-none absolute -top-8 -left-8 h-40 w-40 rounded-full opacity-20"
            style={{
              background:
                "radial-gradient(circle, var(--accent-focus) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />

          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-faint mb-1">
              {isSameDate(selectedDate, new Date())
                ? "Today"
                : selectedDate.toLocaleDateString(undefined, { weekday: "long" })}
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-text leading-tight">
              {greeting()}
              {data.settings?.displayName ? `, ${data.settings.displayName}` : ""}
            </h1>
            <p className="text-xs text-text-muted mt-2 max-w-[200px] leading-relaxed">
              {quote}
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <ProgressRing
              value={ringValue}
              size={76}
              strokeWidth={6}
              accent="focus"
              label={String(streak)}
              sublabel="streak"
            />
          </div>
        </motion.header>

        {/* ── Date strip ─────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <DateStrip selected={selectedDate} onSelect={setSelectedDate} />
        </motion.div>

        {/* ── Revision banner ────────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <RevisionBanner count={data.dueRevisionCount} />
        </motion.div>

        {/* ── Main cards ─────────────────────────────────────────────────── */}
        {data.isLoading ? (
          <>
            <motion.div variants={fadeUp}><Skeleton className="h-40" /></motion.div>
            <motion.div variants={fadeUp}><Skeleton className="h-32" /></motion.div>
          </>
        ) : (
          <>
            <motion.div variants={fadeUp}>
              <ChecklistCard
                dateISO={dateISO}
                goals={data.goals}
                goalCompletions={data.goalCompletions}
                hobbies={data.hobbies}
                hobbyLogs={data.hobbyLogs}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <ReflectionCard
                key={`${dateISO}-${data.journalEntry?.id ?? "draft"}`}
                dateISO={dateISO}
                entry={data.journalEntry}
                editable={editable}
              />
            </motion.div>
          </>
        )}
      </motion.div>
    </PageShell>
  );
}

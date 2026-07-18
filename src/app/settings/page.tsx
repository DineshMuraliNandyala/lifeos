"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Upload, Trash2, HelpCircle, Activity, Sun, Moon, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "@/components/ui/number-field";
import { SettingsSection, SettingsRow } from "@/features/settings/settings-list";
import { LeetCodeConnect } from "@/features/settings/leetcode-connect";
import { db } from "@/lib/db";
import {
  exportAllDataAsJSON,
  downloadJSON,
  importAllDataFromJSON,
  resetAllData,
} from "@/features/settings/backup";
import { useGoogleFit } from "@/features/health/use-google-fit";

const THEMES = [
  { key: "light" as const, label: "Light", icon: Sun },
  { key: "dark" as const, label: "Dark", icon: Moon },
  { key: "amoled" as const, label: "AMOLED", icon: Smartphone },
];

const ACCENTS = [
  { key: "focus" as const, label: "Periwinkle", swatch: "var(--accent-focus)" },
  { key: "energy" as const, label: "Coral", swatch: "var(--accent-energy)" },
  { key: "calm" as const, label: "Violet", swatch: "var(--accent-calm)" },
];

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function SettingsPage() {
  const settings = useLiveQuery(() => db.settings.get(1), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const { connectGoogleFit, disconnectGoogleFit } = useGoogleFit();

  if (!settings) return null;

  async function patch(next: Partial<typeof settings>) {
    await db.settings.update(1, { ...next, updatedAt: new Date().toISOString() });
  }

  async function handleExport() {
    const json = await exportAllDataAsJSON();
    downloadJSON(json, `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setStatus("Exported.");
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      await importAllDataFromJSON(text);
      setStatus("Restored from backup.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed.");
    }
  }

  async function handleReset() {
    if (!confirm("This clears all LifeOS data on this device. Continue?")) return;
    await resetAllData();
    setStatus("All data cleared.");
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Settings" title="Configure LifeOS" />

      {/* ── Appearance ───────────────────────────────────────────────────── */}
      <SettingsSection title="Appearance">
        {/* Three-way theme toggle */}
        <div className="flex gap-2 px-1 py-0.5">
          {THEMES.map(({ key, label, icon: Icon }) => {
            const active = settings.theme === key;
            return (
              <motion.button
                key={key}
                onClick={() => patch({ theme: key })}
                whileTap={{ scale: 0.95 }}
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-colors ${
                  active
                    ? "border-focus bg-focus/10 text-focus"
                    : "border-border bg-surface-2 text-text-muted hover:text-text"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </motion.button>
            );
          })}
        </div>

        <SettingsRow
          label="Accent"
          description="Leading hue across rings and highlights"
          right={
            <div className="flex gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => patch({ accentDomain: a.key })}
                  className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: a.swatch,
                    borderColor:
                      settings.accentDomain === a.key ? "var(--text)" : "transparent",
                  }}
                  aria-label={a.label}
                />
              ))}
            </div>
          }
        />
      </SettingsSection>

      {/* ── Goals ────────────────────────────────────────────────────────── */}
      <SettingsSection title="Goals">
        <SettingsRow
          label="Protein goal"
          right={
            <NumberField
              value={settings.proteinGoalGrams}
              onCommit={(n) => patch({ proteinGoalGrams: n })}
              suffix="g"
            />
          }
        />
        <SettingsRow
          label="Water goal"
          right={
            <NumberField
              value={settings.waterGoalMl}
              onCommit={(n) => patch({ waterGoalMl: n })}
              suffix="ml"
            />
          }
        />
        <SettingsRow
          label="Step goal"
          right={
            <NumberField value={settings.stepGoal} onCommit={(n) => patch({ stepGoal: n })} />
          }
        />
        <SettingsRow
          label="Weekly coding goal"
          right={
            <NumberField
              value={settings.weeklyCodingGoal}
              onCommit={(n) => patch({ weeklyCodingGoal: n })}
              suffix="/wk"
            />
          }
        />
      </SettingsSection>

      {/* ── Placement (LeetCode) ─────────────────────────────────────────── */}
      <SettingsSection title="Placement">
        <SettingsRow
          label="LeetCode username"
          description="Your public LeetCode username (shown on your profile URL)"
          right={
            <input
              defaultValue={settings.leetcodeUsername ?? ""}
              onBlur={(e) => patch({ leetcodeUsername: e.target.value || null })}
              placeholder="username"
              className="w-32 rounded-lg border border-border bg-surface-2 px-2 py-1 text-right text-sm text-text placeholder:text-text-faint outline-none focus:border-focus"
            />
          }
        />
        {/* Replace cookie paste with one-tap connect */}
        <div className="px-1 py-1">
          <LeetCodeConnect
            currentUsername={settings.leetcodeUsername}
            isConnected={settings.leetcodeConnected ?? false}
          />
        </div>
      </SettingsSection>

      {/* ── Health (Google Fit / Steps) ──────────────────────────────────── */}
      <SettingsSection title="Health &amp; Activity">
        {settings.googleFitConnected ? (
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </span>
              <div>
                <p className="text-sm font-medium text-text">Google Fit connected</p>
                <p className="text-xs text-text-muted">Steps sync automatically from Android</p>
              </div>
            </div>
            <button
              onClick={disconnectGoogleFit}
              className="rounded-lg border border-border px-3 py-1 text-xs text-text-muted hover:text-red-400 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={GOOGLE_CLIENT_ID ? connectGoogleFit : undefined}
            disabled={!GOOGLE_CLIENT_ID}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-3 text-sm text-text-muted hover:border-green-500 hover:text-green-500 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
          >
            <Activity className="h-4 w-4" />
            {GOOGLE_CLIENT_ID ? "Connect Google Fit (Android steps)" : "Google Fit unavailable — set NEXT_PUBLIC_GOOGLE_CLIENT_ID"}
          </motion.button>
        )}
        <SettingsRow
          label="Step goal"
          right={
            <NumberField value={settings.stepGoal} onCommit={(n) => patch({ stepGoal: n })} />
          }
        />
      </SettingsSection>

      {/* ── Notifications ─────────────────────────────────────────────────── */}
      <SettingsSection title="Notifications">
        <SettingsRow
          label="Enable reminders"
          description="Requires notification permission; needs a backend for closed-app push"
          right={
            <Switch
              checked={settings.notificationsEnabled}
              onChange={async (v) => {
                if (v && "Notification" in window) {
                  await Notification.requestPermission();
                }
                patch({ notificationsEnabled: v });
              }}
            />
          }
        />
      </SettingsSection>

      {/* ── Data ─────────────────────────────────────────────────────────── */}
      <SettingsSection title="Data">
        <SettingsRow
          label="Export JSON"
          description="Download everything on this device"
          right={
            <Button size="sm" variant="secondary" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          }
        />
        <SettingsRow
          label="Import JSON"
          description="Restore from a previous export"
          right={
            <>
              <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" /> Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = "";
                }}
              />
            </>
          }
        />
        <SettingsRow
          label="Reset all data"
          description="Clears everything on this device"
          right={
            <Button size="sm" variant="secondary" onClick={handleReset}>
              <Trash2 className="h-3.5 w-3.5" /> Reset
            </Button>
          }
        />
      </SettingsSection>

      {/* ── About ────────────────────────────────────────────────────────── */}
      <SettingsSection title="About">
        <SettingsRow
          label="Revision rule"
          description="1d → 3d → 7d → 14d → 30d. Easy advances a stage, Hard repeats it, Forgot resets to day 1."
          right={<HelpCircle className="h-4 w-4 text-text-faint shrink-0" />}
        />
      </SettingsSection>

      {status && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-xs text-text-muted"
        >
          {status}
        </motion.p>
      )}
    </PageShell>
  );
}

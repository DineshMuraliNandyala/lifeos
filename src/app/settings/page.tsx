"use client";

import { useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, Upload, Trash2, HelpCircle, Sun, Moon, Smartphone, Wifi } from "lucide-react";
import { motion } from "framer-motion";
import { PageShell, PageHeader } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { NumberField } from "@/components/ui/number-field";
import { SettingsSection, SettingsRow } from "@/features/settings/settings-list";
import { useGoogleFit } from "@/features/health/use-google-fit";
import { db } from "@/lib/db";
import {
  exportAllDataAsJSON,
  downloadJSON,
  importAllDataFromJSON,
  resetAllData,
} from "@/features/settings/backup";


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

      {/* ── Health & Activity ─────────────────────────────────────────── */}
      <SettingsSection title="Health & Activity">
        <SettingsRow
          label="Step goal"
          description="Target steps per day (shown in Fitness tab)"
          right={
            <NumberField value={settings.stepGoal} onCommit={(n) => patch({ stepGoal: n })} />
          }
        />

        {/* Google Fit connect/disconnect */}
        {settings.googleFitConnected ? (
          <SettingsRow
            label="Google Fit"
            description="Step data syncs when you open the Fitness tab"
            right={
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--success)" }}>
                  <Wifi className="h-3.5 w-3.5" />
                  Connected
                </span>
                <button
                  onClick={disconnectGoogleFit}
                  className="rounded-lg border px-2.5 py-1 text-xs text-text-muted hover:text-danger hover:border-danger transition-colors"
                  style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                >
                  Disconnect
                </button>
              </div>
            }
          />
        ) : (
          <div className="px-1 py-1">
            <button
              id="settings-connect-google-fit-btn"
              onClick={connectGoogleFit}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm font-medium transition-all hover:brightness-110 active:scale-95"
              style={{ borderColor: "var(--accent-calm)", color: "var(--accent-calm)", background: "var(--accent-calm-dim)" }}
            >
              <Wifi className="h-4 w-4" />
              Connect Google Fit for background step sync
            </button>
            <p className="mt-2 text-[11px] text-text-faint text-center leading-relaxed">
              One-time Google sign-in · steps sync automatically · token stored only on this device
            </p>
          </div>
        )}

        <div
          className="rounded-xl border px-4 py-3 text-xs text-text-muted leading-relaxed"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
        >
          <p className="font-medium text-text mb-1">📱 No Google Fit? Use your phone motion sensor</p>
          <p>Open the <strong>Fitness</strong> tab and tap <strong>&quot;Start tracking&quot;</strong> — LifeOS uses your phone&apos;s accelerometer to count steps in real time while the app is open.</p>
        </div>
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

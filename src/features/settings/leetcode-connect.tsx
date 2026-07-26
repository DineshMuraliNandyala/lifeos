"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, AlertCircle, Loader2, LogIn, LogOut,
  RefreshCw, ExternalLink, Clipboard, ChevronRight,
} from "lucide-react";
import { db } from "@/lib/db";

const PROXY_URL = process.env.NEXT_PUBLIC_LEETCODE_PROXY_URL ?? "";

type Phase = "idle" | "guide" | "paste" | "loading" | "success" | "error";
type State =
  | { phase: "idle" }
  | { phase: "guide" }
  | { phase: "paste"; token: string }
  | { phase: "loading" }
  | { phase: "success"; username: string }
  | { phase: "error"; message: string };

interface Props {
  currentUsername: string | null;
  isConnected: boolean;
  onConnected?: () => void;
}

async function patchSettings(next: Record<string, unknown>) {
  await db.settings.update(1, { ...next, updatedAt: new Date().toISOString() });
}

/** Validates the token by calling the GraphQL API via the Worker proxy. */
async function validateToken(token: string, username: string): Promise<boolean> {
  if (!PROXY_URL) return false;
  try {
    const res = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Leetcode-Session": token,
      },
      body: JSON.stringify({
        query: `query me { userStatus { username } }`,
        variables: {},
      }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    const me: string | undefined = json?.data?.userStatus?.username;
    // Accept if either: server confirms username matches, or any username returned
    return !!me;
  } catch {
    return false;
  }
}

const STEPS = [
  {
    num: 1,
    icon: "🌐",
    title: "Open LeetCode in your browser",
    desc: "Make sure you're logged in to your LeetCode account.",
    action: { label: "Open LeetCode", href: "https://leetcode.com" },
  },
  {
    num: 2,
    icon: "🔧",
    title: "Open DevTools",
    desc: "Press F12 (or Cmd+Opt+I on Mac) to open browser Developer Tools.",
  },
  {
    num: 3,
    icon: "🍪",
    title: "Find your session cookie",
    desc: 'Go to Application tab → Cookies → https://leetcode.com → find the row named LEETCODE_SESSION → double-click the Value column and copy the entire string.',
  },
  {
    num: 4,
    icon: "📋",
    title: "Paste it below",
    desc: "The session lasts ~6 months and is stored only on your device.",
  },
];

export function LeetCodeConnect({ currentUsername, isConnected, onConnected }: Props) {
  const [state, setState] = useState<State>(
    isConnected && currentUsername
      ? { phase: "success", username: currentUsername }
      : { phase: "idle" }
  );
  const [username, setUsername] = useState(currentUsername ?? "");
  const [token, setToken]     = useState("");
  const [step,  setStep]      = useState(0);

  async function handleConnect() {
    if (!token.trim() || !username.trim()) return;
    setState({ phase: "loading" });

    const valid = await validateToken(token.trim(), username.trim());

    if (!valid) {
      setState({
        phase: "error",
        message:
          "Could not verify this session token. Make sure you copied the full LEETCODE_SESSION value and that you're still logged in to LeetCode.",
      });
      return;
    }

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 6);

    await patchSettings({
      leetcodeUsername: username.trim(),
      leetcodeSession: token.trim(),
      leetcodeConnected: true,
      leetcodeSessionExpiry: expiry.toISOString(),
    });

    setToken("");
    setState({ phase: "success", username: username.trim() });
    onConnected?.();
  }

  async function handleDisconnect() {
    await patchSettings({ leetcodeSession: null, leetcodeConnected: false, leetcodeSessionExpiry: null });
    setToken("");
    setStep(0);
    setState({ phase: "idle" });
  }

  /* ── Connected ───────────────────────────────────────────────────────────── */
  if (state.phase === "success") {
    return (
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3"
        style={{ background: "var(--surface-2)" }}
      >
        <div className="flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">Connected as {state.username}</p>
            <p className="text-xs text-text-muted">Session active · syncs on Placement tab open</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setStep(0); setState({ phase: "guide" }); }}
            className="rounded-lg p-1.5 text-text-faint hover:text-text transition-colors"
            style={{ background: "var(--surface-2)" }} title="Re-connect">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button onClick={handleDisconnect}
            className="rounded-lg p-1.5 text-text-faint hover:text-red-400 transition-colors"
            style={{ background: "var(--surface-2)" }} title="Disconnect">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    );
  }

  /* ── Idle ────────────────────────────────────────────────────────────────── */
  if (state.phase === "idle") {
    return (
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        onClick={() => setState({ phase: "guide" })}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-text-muted transition-all hover:text-[var(--accent-focus)]"
        style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
      >
        <LogIn className="h-4 w-4" />
        Connect LeetCode account
      </motion.button>
    );
  }

  /* ── Step-by-step guide ─────────────────────────────────────────────────── */
  if (state.phase === "guide") {
    const s = STEPS[step];
    const isLast = step === STEPS.length - 1;

    return (
      <AnimatePresence mode="wait">
        <motion.div key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="rounded-xl border p-4 space-y-3"
          style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
        >
          {/* Progress dots */}
          <div className="flex gap-1.5 mb-1">
            {STEPS.map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full transition-all"
                style={{ background: i <= step ? "var(--accent-focus)" : "var(--border)" }} />
            ))}
          </div>

          <p className="text-2xl">{s.icon}</p>
          <div>
            <p className="text-sm font-semibold text-text">Step {s.num}: {s.title}</p>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{s.desc}</p>
          </div>

          {s.action && (
            <a href={s.action.href} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={{ background: "var(--accent-focus-dim)", color: "var(--accent-focus)" }}
            >
              <ExternalLink className="h-3 w-3" />
              {s.action.label}
            </a>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => setState({ phase: "idle" })}
              className="flex-1 rounded-lg border py-2 text-sm text-text-muted transition-colors hover:text-text"
              style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
            >
              Cancel
            </button>
            {isLast ? (
              <button onClick={() => setState({ phase: "paste", token: "" })}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium text-white transition-all"
                style={{ background: "var(--accent-focus)" }}
              >
                <Clipboard className="h-3.5 w-3.5" /> Paste session →
              </button>
            ) : (
              <button onClick={() => setStep((s) => s + 1)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-sm font-medium transition-all"
                style={{ background: "var(--accent-focus-dim)", color: "var(--accent-focus)" }}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  /* ── Paste + validate ───────────────────────────────────────────────────── */
  return (
    <AnimatePresence mode="wait">
      <motion.div key="paste"
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
        className="rounded-xl border p-4 space-y-3"
        style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
      >
        <p className="text-sm font-semibold text-text">Paste your LEETCODE_SESSION</p>
        <p className="text-xs text-text-muted leading-relaxed">
          This is stored <strong className="text-text">only on your device</strong> (IndexedDB). It&apos;s never sent to any server except LeetCode itself via the proxy.
        </p>

        <input
          type="text"
          placeholder="LeetCode username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none transition-colors focus:border-[var(--accent-focus)]"
          style={{ background: "var(--glass-bg)", borderColor: "var(--border)" }}
        />

        <textarea
          rows={3}
          placeholder="Paste the full LEETCODE_SESSION cookie value here…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="w-full resize-none rounded-xl border px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none transition-colors focus:border-[var(--accent-focus)] font-mono"
          style={{ background: "var(--glass-bg)", borderColor: "var(--border)", fontSize: "11px" }}
        />

        <AnimatePresence>
          {state.phase === "error" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
              style={{ background: "var(--danger-dim)", color: "var(--danger)" }}
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {state.message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <button onClick={() => { setStep(0); setState({ phase: "guide" }); }}
            className="flex-1 rounded-lg border py-2 text-sm text-text-muted hover:text-text transition-colors"
            style={{ borderColor: "var(--border)", background: "var(--surface-1)" }}
          >
            ← Back
          </button>
          <button onClick={handleConnect}
            disabled={state.phase === "loading" || !token.trim() || !username.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-white disabled:opacity-50 transition-all"
            style={{ background: "var(--accent-focus)" }}
          >
            {state.phase === "loading" ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…</>
            ) : (
              <><CheckCircle className="h-3.5 w-3.5" /> Connect</>
            )}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

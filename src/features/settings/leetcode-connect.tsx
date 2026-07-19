"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Loader2, LogIn, LogOut, RefreshCw } from "lucide-react";
import { db } from "@/lib/db";

const PROXY_URL = process.env.NEXT_PUBLIC_LEETCODE_PROXY_URL ?? "";

type ConnectState =
  | { phase: "idle" }
  | { phase: "form" }
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

export function LeetCodeConnect({ currentUsername, isConnected, onConnected }: Props) {
  const [state, setState] = useState<ConnectState>(
    isConnected && currentUsername ? { phase: "success", username: currentUsername } : { phase: "idle" }
  );
  const [username, setUsername] = useState(currentUsername ?? "");
  const [password, setPassword] = useState("");

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setState({ phase: "loading" });

    try {
      // Auth goes to /api/leetcode/auth (Vercel/AWS) — not the Cloudflare Worker,
      // which shares IPs with LeetCode and triggers bot detection.
      const res = await fetch("/api/leetcode/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.sessionToken) {
        setState({
          phase: "error",
          message: data.error ?? "Login failed. Check your username/password.",
        });
        return;
      }

      // Store session token — password is NEVER stored
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 14); // LeetCode sessions typically last ~2 weeks

      await patchSettings({
        leetcodeUsername: username.trim(),
        leetcodeSession: data.sessionToken,
        leetcodeConnected: true,
        leetcodeSessionExpiry: expiry.toISOString(),
      });

      setPassword("");
      setState({ phase: "success", username: username.trim() });
      onConnected?.();
    } catch {
      setState({ phase: "error", message: "Network error — check your connection and try again." });
    }
  }

  async function handleDisconnect() {
    await patchSettings({
      leetcodeSession: null,
      leetcodeConnected: false,
      leetcodeSessionExpiry: null,
    });
    setPassword("");
    setState({ phase: "idle" });
  }

  // ── Connected state ─────────────────────────────────────────────────────
  if (state.phase === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3"
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
          <button
            onClick={() => setState({ phase: "form" })}
            className="rounded-lg p-1.5 text-text-faint hover:bg-surface-1 hover:text-text transition-colors"
            title="Re-authenticate"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDisconnect}
            className="rounded-lg p-1.5 text-text-faint hover:bg-surface-1 hover:text-red-400 transition-colors"
            title="Disconnect"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Idle: show connect button ───────────────────────────────────────────
  if (state.phase === "idle") {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setState({ phase: "form" })}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-2 px-4 py-3 text-sm text-text-muted hover:border-focus hover:text-focus transition-all"
      >
        <LogIn className="h-4 w-4" />
        Connect LeetCode account
      </motion.button>
    );
  }

  // ── Form (and error/loading) ────────────────────────────────────────────
  return (
    <AnimatePresence mode="wait">
      <motion.form
        key="form"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        onSubmit={handleConnect}
        className="space-y-3 rounded-xl border border-border bg-surface-2 p-4"
      >
        <p className="text-xs text-text-muted leading-relaxed">
          Your password is sent <strong className="text-text">only once</strong> to our proxy, which
          returns a session token. The password is never stored anywhere.
        </p>

        <div className="space-y-2">
          <input
            type="text"
            autoComplete="username"
            placeholder="LeetCode username or email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={state.phase === "loading"}
            className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-focus disabled:opacity-50"
          />
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={state.phase === "loading"}
            className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm text-text placeholder:text-text-faint outline-none focus:border-focus disabled:opacity-50"
          />
        </div>

        <AnimatePresence>
          {state.phase === "error" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {state.message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setState(isConnected && currentUsername ? { phase: "success", username: currentUsername } : { phase: "idle" })}
            className="flex-1 rounded-lg border border-border bg-surface-1 py-2 text-sm text-text-muted hover:text-text transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={state.phase === "loading" || !username.trim() || !password.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-focus py-2 text-sm font-medium text-white disabled:opacity-50 transition-opacity"
          >
            {state.phase === "loading" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                Connect
              </>
            )}
          </button>
        </div>
      </motion.form>
    </AnimatePresence>
  );
}

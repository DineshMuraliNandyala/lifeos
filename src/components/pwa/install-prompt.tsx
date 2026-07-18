"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const LS_KEY = "lifeos_install_dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or already installed (standalone)
    const dismissed = localStorage.getItem(LS_KEY);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone);

    if (dismissed || isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay slightly so it doesn't pop immediately on load
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(LS_KEY, "1");
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div
              className="glass glass-rim relative m-3 rounded-3xl p-6"
              style={{
                boxShadow:
                  "var(--glass-shadow), 0 0 60px rgba(124,157,255,0.15)",
              }}
            >
              {/* Dismiss */}
              <button
                onClick={handleDismiss}
                className="absolute right-4 top-4 rounded-full p-1.5 text-text-faint hover:text-text transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* App icon */}
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--accent-focus), var(--accent-calm))",
                  boxShadow: "0 8px 24px var(--accent-focus-glow)",
                }}
              >
                <span className="text-3xl">🧠</span>
              </div>

              <h2 className="font-display text-xl font-bold text-text">
                Add LifeOS to Home Screen
              </h2>
              <p className="mt-1 text-sm text-text-muted leading-relaxed">
                Install for offline access, step count sync, and a native app experience — no App Store needed.
              </p>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="flex-1 rounded-2xl border border-[var(--border)] py-3 text-sm font-medium text-text-muted hover:text-text transition-colors"
                >
                  Not now
                </button>
                <motion.button
                  onClick={handleInstall}
                  whileTap={{ scale: 0.97 }}
                  className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-focus py-3 text-sm font-semibold text-white"
                  style={{
                    boxShadow: "0 6px 20px -4px var(--accent-focus-glow)",
                  }}
                >
                  {/* Specular */}
                  <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <Download className="h-4 w-4" />
                  Install App
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

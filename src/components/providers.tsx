"use client";

import { useEffect } from "react";
import { ensureSettingsSeed } from "@/lib/db";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureSettingsSeed().catch((err) => {
      console.error("Failed to seed settings row", err);
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("Service worker registration failed", err));
    }
  }, []);

  return (
    <ThemeProvider>
      {children}
      <InstallPrompt />
    </ThemeProvider>
  );
}

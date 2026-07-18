"use client";

/**
 * ThemeProvider — reads the theme from IndexedDB and applies it to <html>
 * as a data-theme attribute before the first paint via a synchronous
 * localStorage fallback (avoids the flash of wrong theme on cold start).
 */

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const LS_THEME_KEY = "lifeos_theme";

// Called on the server + client during hydration — reads localStorage for
// the theme applied by the inline script in layout.tsx <head>.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const settings = useLiveQuery(() => db.settings.get(1), []);

  useEffect(() => {
    const theme = settings?.theme ?? "dark";
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(LS_THEME_KEY, theme); } catch { /* */ }
  }, [settings?.theme]);

  return <>{children}</>;
}

/**
 * Inline script for <head> — runs synchronously before React hydrates
 * to avoid flash of wrong theme. Reads localStorage (set by ThemeProvider).
 */
export const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('${LS_THEME_KEY}') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`.trim();

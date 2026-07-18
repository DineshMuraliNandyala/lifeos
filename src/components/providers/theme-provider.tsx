"use client";

/**
 * ThemeProvider — reads theme + accentDomain from IndexedDB and applies:
 *   data-theme  → dark | amoled | light
 *   data-accent → focus | energy | calm
 * Both are mirrored to localStorage so the inline anti-flash script
 * in layout.tsx can restore them before React hydrates.
 */

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const LS_THEME_KEY  = "lifeos_theme";
const LS_ACCENT_KEY = "lifeos_accent";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const settings = useLiveQuery(() => db.settings.get(1), []);

  useEffect(() => {
    const theme  = settings?.theme        ?? "dark";
    const accent = settings?.accentDomain ?? "focus";

    document.documentElement.setAttribute("data-theme",  theme);
    document.documentElement.setAttribute("data-accent", accent);

    try {
      localStorage.setItem(LS_THEME_KEY,  theme);
      localStorage.setItem(LS_ACCENT_KEY, accent);
    } catch { /* storage blocked */ }
  }, [settings?.theme, settings?.accentDomain]);

  return <>{children}</>;
}

/**
 * Inline script injected into <head> — runs synchronously before React
 * hydrates so theme + accent are correct from the very first frame.
 */
export const themeScript = `(function(){
  try {
    var t = localStorage.getItem('${LS_THEME_KEY}')  || 'dark';
    var a = localStorage.getItem('${LS_ACCENT_KEY}') || 'focus';
    document.documentElement.setAttribute('data-theme',  t);
    document.documentElement.setAttribute('data-accent', a);
  } catch(e) {
    document.documentElement.setAttribute('data-theme',  'dark');
    document.documentElement.setAttribute('data-accent', 'focus');
  }
})();`;

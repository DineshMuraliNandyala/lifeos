"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Code2, Dumbbell, NotebookText, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/today",     label: "Today",     icon: Sun },
  { href: "/placement", label: "Placement", icon: Code2 },
  { href: "/fitness",   label: "Fitness",   icon: Dumbbell },
  { href: "/notes",     label: "Notes",     icon: NotebookText },
  { href: "/analytics", label: "Stats",     icon: BarChart3 },
  { href: "/settings",  label: "Settings",  icon: SettingsIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    /* Floating pill nav — glass panel lifted above the page */
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <nav
        className="glass glass-rim relative flex w-full max-w-[420px] items-stretch justify-between rounded-[1.5rem] px-2 py-1.5"
        aria-label="Primary"
        style={{
          /* extra bottom glow to lift it off the bg */
          boxShadow:
            "var(--glass-shadow), 0 8px 32px -8px rgba(124,157,255,0.12)",
        }}
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2 rounded-xl transition-colors"
            >
              {/* Active pill background */}
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: "var(--accent-focus-dim)",
                    boxShadow: "0 0 12px var(--accent-focus-glow)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <Icon
                className={cn(
                  "relative z-10 h-5 w-5 transition-all duration-200",
                  active ? "text-focus" : "text-text-faint"
                )}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <span
                className={cn(
                  "relative z-10 text-[9px] font-semibold tracking-wide transition-colors duration-200",
                  active ? "text-focus" : "text-text-faint"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

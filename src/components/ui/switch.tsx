"use client";

import { motion } from "framer-motion";

export function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      style={{
        background: checked
          ? "linear-gradient(135deg, var(--accent-focus), var(--accent-calm))"
          : "var(--surface-2)",
        boxShadow: checked
          ? "0 0 16px var(--accent-focus-glow), inset 0 1px 0 rgba(255,255,255,0.2)"
          : "var(--neo-inset)",
      }}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 left-1 h-5 w-5 rounded-full"
        style={{
          background: "white",
          boxShadow: checked
            ? "0 2px 8px rgba(0,0,0,0.3)"
            : "0 2px 6px rgba(0,0,0,0.25)",
          x: checked ? 20 : 0,
        }}
      />
    </button>
  );
}

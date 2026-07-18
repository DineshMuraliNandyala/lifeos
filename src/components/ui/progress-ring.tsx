"use client";

import { cn } from "@/lib/utils";

const ACCENT_VARS: Record<"focus" | "energy" | "calm" | "success" | "warning", string> = {
  focus: "var(--accent-focus)",
  energy: "var(--accent-energy)",
  calm: "var(--accent-calm)",
  success: "var(--success)",
  warning: "var(--warning)",
};

interface ProgressRingProps {
  /** 0-1 */
  value: number;
  size?: number;
  strokeWidth?: number;
  accent?: keyof typeof ACCENT_VARS;
  /** Draws tick marks around the ring, e.g. one per day of a streak */
  segments?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}

/**
 * The app's one recurring visual motif: a segmented ring with a soft glow
 * on the active arc. Used for daily completion, streaks, and macro goals so
 * every domain (coding / gym / protein) reads as part of the same system.
 */
export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  accent = "focus",
  segments,
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const color = ACCENT_VARS[accent];

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        {segments && segments > 1
          ? Array.from({ length: segments }).map((_, i) => {
              const gap = 3; // degrees of gap between segments
              const segAngle = 360 / segments;
              const start = i * segAngle + gap / 2;
              const end = (i + 1) * segAngle - gap / 2;
              return (
                <path
                  key={i}
                  d={arcPath(size / 2, size / 2, radius, start, end)}
                  fill="none"
                  stroke={i / segments < clamped ? color : "var(--border)"}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  style={i / segments < clamped ? { filter: `drop-shadow(0 0 4px ${color}66)` } : undefined}
                />
              );
            })
          : (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                filter: `drop-shadow(0 0 5px ${color}66)`,
                transition: "stroke-dashoffset 500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
          )}
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label && (
            <span className="font-mono-tab text-lg font-semibold leading-none text-text">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-[10px] text-text-muted mt-1 tracking-wide uppercase">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

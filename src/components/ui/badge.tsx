import { cn } from "@/lib/utils";

type Tone = "focus" | "energy" | "calm" | "success" | "warning" | "danger" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  focus: "bg-focus-dim text-focus",
  energy: "bg-energy-dim text-energy",
  calm: "bg-calm-dim text-calm",
  success: "bg-success-dim text-success",
  warning: "bg-warning-dim text-warning",
  danger: "bg-danger-dim text-danger",
  neutral: "bg-surface-2 text-text-muted",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

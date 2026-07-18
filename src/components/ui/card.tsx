import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/**
 * Glass card — liquid glass panel with specular rim highlight.
 * Use `variant="neo"` for a neomorphic raised look (no blur, soft shadows).
 */
export function Card({
  className,
  variant = "glass",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "glass" | "neo" | "flat" }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden",
        variant === "glass" && "glass glass-rim",
        variant === "neo"   && "neo bg-surface-1",
        variant === "flat"  && "border border-[var(--border)] bg-surface-1",
        "p-4",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-3", className)}>
      <div>
        <h3 className="font-display text-[15px] font-semibold tracking-tight text-text">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

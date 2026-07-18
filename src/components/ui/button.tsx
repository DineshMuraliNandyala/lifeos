import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "glass" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: [
    "relative overflow-hidden",
    "bg-focus text-white font-semibold",
    "shadow-[0_6px_20px_-4px_var(--accent-focus-glow),0_2px_6px_-2px_rgba(0,0,0,0.4)]",
    "before:absolute before:inset-x-0 before:top-0 before:h-px",
    "before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent",
    "active:scale-[0.97] active:shadow-none",
  ].join(" "),

  // glass and secondary are identical — secondary kept for back-compat
  glass: [
    "relative overflow-hidden",
    "text-text",
    "active:scale-[0.97]",
  ].join(" "),

  secondary: [
    "relative overflow-hidden",
    "text-text",
    "active:scale-[0.97]",
  ].join(" "),

  ghost: "text-text-muted hover:text-text hover:bg-white/5 active:scale-[0.97]",
};

const SIZE: Record<Size, string> = {
  sm: "h-8  px-3 text-xs  rounded-xl  gap-1.5",
  md: "h-11 px-5 text-sm  rounded-2xl gap-2",
  lg: "h-14 px-6 text-base rounded-2xl gap-2",
};

export function Button({
  className,
  variant = "glass",
  size = "md",
  style,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const isGlass = variant === "glass" || variant === "secondary";

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150",
        "disabled:opacity-40 disabled:pointer-events-none",
        VARIANT[variant],
        SIZE[size],
        className
      )}
      style={
        isGlass
          ? {
              background: "var(--glass-bg)",
              backdropFilter: "blur(16px) saturate(160%)",
              WebkitBackdropFilter: "blur(16px) saturate(160%)",
              border: "1px solid var(--glass-border)",
              boxShadow: "var(--glass-shadow)",
              ...style,
            }
          : style
      }
      {...props}
    />
  );
}

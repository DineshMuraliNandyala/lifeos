import { cn } from "@/lib/utils";

/** Glass card section with a floating label */
export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-faint">
        {title}
      </p>
      {/* Liquid glass panel */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(32px) saturate(180%)",
          WebkitBackdropFilter: "blur(32px) saturate(180%)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        {/* Specular rim */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--glass-highlight), transparent)",
          }}
        />
        <div className="divide-y divide-[var(--border)]">{children}</div>
      </div>
    </div>
  );
}

export function SettingsRow({
  label,
  description,
  right,
  className,
}: {
  label: string;
  description?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-4 py-3.5", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{label}</p>
        {description && (
          <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

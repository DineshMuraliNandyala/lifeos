"use client";

export function NumberField({
  value,
  onCommit,
  suffix,
}: {
  value: number;
  onCommit: (next: number) => void;
  suffix?: string;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-xl px-3 py-1.5"
      style={{
        background: "var(--surface-2)",
        boxShadow: "var(--neo-inset)",
        border: "1px solid var(--border)",
      }}
    >
      <input
        type="number"
        defaultValue={value}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n) && n >= 0) onCommit(n);
        }}
        className="w-14 bg-transparent text-right font-mono-tab text-sm text-text outline-none"
      />
      {suffix && <span className="text-xs text-text-faint">{suffix}</span>}
    </div>
  );
}

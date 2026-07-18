import { cn } from "@/lib/utils";

export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-md px-4 space-y-5",
        "pt-[calc(env(safe-area-inset-top)+1.5rem)]",
        "pb-36", // extra bottom padding for floating glass nav
        className
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-2">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-faint mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[2rem] font-bold leading-tight tracking-tight text-text">
          {title}
        </h1>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

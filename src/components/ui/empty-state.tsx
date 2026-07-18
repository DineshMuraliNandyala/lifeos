import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-6",
        className
      )}
    >
      <div className="w-11 h-11 rounded-full bg-surface-2 border border-border-soft flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-text-faint" strokeWidth={1.75} />
      </div>
      <p className="text-sm font-medium text-text">{title}</p>
      {description && (
        <p className="text-xs text-text-muted mt-1 max-w-[240px]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

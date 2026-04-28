import { cn } from "@/lib/utils.js";

export function StatCard({ label, value, accent = "primary", className }: {
  label: string;
  value: React.ReactNode;
  accent?: "primary" | "success" | "error" | "muted";
  className?: string;
}) {
  const left = {
    primary: "border-l-[var(--color-primary)]",
    success: "border-l-[var(--color-success)]",
    error: "border-l-[var(--color-error)]",
    muted: "border-l-border",
  }[accent];
  return (
    <div className={cn("bg-surface border border-border border-l-[3px] rounded-[4px] shadow-sm p-4", left, className)}>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="font-serif text-[28px] font-bold text-dark leading-tight mt-1">{value}</div>
    </div>
  );
}

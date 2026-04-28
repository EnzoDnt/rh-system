import { cn } from "@/lib/utils.js";

const OPTIONS = [
  ["", "Tous"], ["nouveau", "Nouveau"], ["en_analyse", "En analyse"], ["score", "Scoré"],
  ["en_cours", "En cours"], ["entretien", "Entretien"], ["offre", "Offre"],
  ["accepte", "Accepté"], ["refuse", "Refusé"], ["archive", "Archivé"],
] as const;

export function StatutFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-[4px] border transition-colors",
                  value === v ? "bg-dark text-white border-dark" : "bg-surface text-text-secondary border-border hover:bg-bg",
                )}>{label}</button>
      ))}
    </div>
  );
}

import { cn } from "@/lib/utils.js";

export function PromptsSidebar({ prompts, selectedId, onSelect }: {
  prompts: any[]; selectedId: string | null; onSelect: (id: string) => void;
}) {
  return (
    <aside className="border border-border rounded-[4px] bg-surface p-2 space-y-1 max-h-[80vh] overflow-auto">
      {prompts.map((p) => (
        <button key={p.id} onClick={() => onSelect(p.id)}
                className={cn("w-full text-left px-2 py-1.5 rounded-[4px] text-sm",
                  p.id === selectedId ? "bg-dark text-white" : "hover:bg-bg")}>
          <div>{p.nom}</div>
          <div className={cn("text-[11px]", p.id === selectedId ? "text-white/70" : "text-text-muted")}>
            {p.model} · v{p.version}
          </div>
        </button>
      ))}
    </aside>
  );
}

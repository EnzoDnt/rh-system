import { Button } from "@/components/ui/button.js";
import { useFormatDate } from "@/lib/format.js";
import { useRestorePrompt } from "@/lib/mutations.js";

export function PromptHistory({ prompt }: { prompt: any }) {
  const fmt = useFormatDate();
  const restore = useRestorePrompt(prompt.id);
  const items = prompt.history ?? [];
  if (!items.length) return <div className="text-sm text-text-muted">Aucun historique.</div>;
  return (
    <ul className="space-y-1.5">
      {items.map((h: any) => (
        <li key={h.id} className="flex items-center justify-between border border-border rounded-[4px] px-3 py-2">
          <span className="text-sm">v{h.version} · {h.model}</span>
          <span className="text-xs text-text-muted">{fmt(h.created_at)}</span>
          <Button size="sm" variant="outline" onClick={() => restore.mutate(h.id)}>Restaurer</Button>
        </li>
      ))}
    </ul>
  );
}

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input.js";
import { Button } from "@/components/ui/button.js";

type Criteres = Record<string, { poids: number; description: string }>;

export function CriteresEditor({ value, onChange }: { value: Criteres; onChange: (v: Criteres) => void }) {
  const entries = Object.entries(value);

  function patchAt(idx: number, patch: { nom?: string; poids?: number; description?: string }) {
    const next: Criteres = {};
    entries.forEach(([nom, c], i) => {
      const finalNom = i === idx && patch.nom !== undefined ? patch.nom : nom;
      const finalC = i === idx ? { poids: patch.poids ?? c.poids, description: patch.description ?? c.description } : c;
      next[finalNom] = finalC;
    });
    onChange(next);
  }
  function add() {
    const key = `critere_${entries.length + 1}`;
    onChange({ ...value, [key]: { poids: 50, description: "" } });
  }
  function remove(idx: number) {
    onChange(Object.fromEntries(entries.filter((_, i) => i !== idx)));
  }

  return (
    <div className="space-y-2">
      {entries.map(([nom, c], idx) => (
        <div key={idx} className="grid grid-cols-[1fr,80px,2fr,32px] gap-2 items-center">
          <Input value={nom} onChange={(e) => patchAt(idx, { nom: e.target.value })} placeholder="nom_critere" />
          <Input type="number" min={0} max={100} value={c.poids} onChange={(e) => patchAt(idx, { poids: Number(e.target.value) })} />
          <Input value={c.description} onChange={(e) => patchAt(idx, { description: e.target.value })} placeholder="Description" />
          <button type="button" onClick={() => remove(idx)} aria-label="Supprimer" className="p-1 text-text-muted hover:text-error">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus size={14} className="mr-1" />Ajouter un critère
      </Button>
    </div>
  );
}

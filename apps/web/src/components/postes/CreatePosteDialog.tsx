import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { Textarea } from "@/components/ui/textarea.js";
import { CriteresEditor } from "./CriteresEditor.js";
import { useCreatePoste, useGenerateCriteres } from "@/lib/mutations.js";

export function CreatePosteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [criteres, setCriteres] = useState<Record<string, { poids: number; description: string }>>({});
  const create = useCreatePoste();
  const gen = useGenerateCriteres();
  const nav = useNavigate();

  async function generate() {
    if (!titre || !description) return;
    const out = await gen.mutateAsync({ titre, description, instructions });
    setCriteres(out);
  }

  async function submit() {
    const created = await create.mutateAsync({ titre, description, criteres_scoring: criteres });
    onOpenChange(false);
    nav(`/postes/${created.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Nouveau poste</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-text-secondary">Titre</Label>
            <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-text-secondary">Description</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-text-secondary">Instructions critères (optionnel)</Label>
            <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Ex: pondérer fortement la maîtrise de Rust" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-text-secondary">Critères de scoring</Label>
            <Button type="button" variant="outline" size="sm" onClick={generate} disabled={!titre || !description || gen.isPending}>
              <Sparkles size={14} className="mr-1" />{gen.isPending ? "Génération…" : "Générer avec l'IA"}
            </Button>
          </div>
          <CriteresEditor value={criteres} onChange={setCriteres} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={!titre || !description || create.isPending}
                  className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
            {create.isPending ? "Création…" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

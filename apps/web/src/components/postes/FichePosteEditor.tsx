import { useState } from "react";
import { Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { Textarea } from "@/components/ui/textarea.js";
import { Label } from "@/components/ui/label.js";
import { toast } from "sonner";
import { useGenerateFichePoste } from "@/lib/mutations.js";
import { useUpdatePoste } from "@/lib/mutations.js";

export function FichePosteEditor({ poste }: { poste: any }) {
  const [brief, setBrief] = useState(poste.fiche_brief ?? "");
  const [feedback, setFeedback] = useState("");
  const gen = useGenerateFichePoste();
  const update = useUpdatePoste(poste.id);
  const ficheUrl = `${import.meta.env.VITE_API_URL ?? ""}/fiches/${poste.id}`;

  async function generate() {
    const html = await gen.mutateAsync({
      titre: poste.titre,
      description: poste.description,
      brief,
      formbricks_survey_id: poste.formbricks_survey_id ?? undefined,
      ...(feedback ? { feedback, current_html: poste.fiche_html } : {}),
    });
    await update.mutateAsync({ fiche_html: html, fiche_brief: brief });
    toast.success("Fiche générée");
    setFeedback("");
  }

  return (
    <div className="bg-surface border border-border rounded-[4px] p-5 space-y-3">
      <h3 className="font-serif text-base text-dark">Fiche de poste publique</h3>
      <div>
        <Label className="text-xs text-text-secondary">Brief</Label>
        <Textarea rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="Ton, public visé, points à mettre en avant…" />
      </div>
      {poste.fiche_html && (
        <div>
          <Label className="text-xs text-text-secondary">Modifications demandées (optionnel)</Label>
          <Textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Ex: ajouter une section avantages" />
        </div>
      )}
      <Button onClick={generate} disabled={gen.isPending} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
        <Sparkles size={14} className="mr-1" />{gen.isPending ? "Génération…" : poste.fiche_html ? "Régénérer" : "Générer"}
      </Button>
      {poste.fiche_html && (
        <>
          <iframe srcDoc={poste.fiche_html} sandbox="allow-same-origin"
                  className="w-full h-[480px] border border-border rounded-[4px] bg-white" />
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">Lien public :</span>
            <a href={ficheUrl} target="_blank" rel="noreferrer" className="underline">{ficheUrl}</a>
            <button onClick={() => { navigator.clipboard.writeText(ficheUrl); toast.success("Copié"); }}
                    className="p-1 hover:bg-bg rounded-[4px]" title="Copier">
              <Copy size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

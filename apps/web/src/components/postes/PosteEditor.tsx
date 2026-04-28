import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { Textarea } from "@/components/ui/textarea.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { CriteresEditor } from "./CriteresEditor.js";
import { useUpdatePoste } from "@/lib/mutations.js";
import { useCalendlyEvents } from "@/lib/queries.js";

const NONE_CALENDLY = "__none__";

export function PosteEditor({ poste }: { poste: any }) {
  const [titre, setTitre] = useState(poste.titre);
  const [description, setDescription] = useState(poste.description ?? "");
  const [statut, setStatut] = useState(poste.statut);
  const [calendly, setCalendly] = useState<string>(poste.calendly_event_type ?? "");
  const [criteres, setCriteres] = useState(poste.criteres_scoring ?? {});
  const update = useUpdatePoste(poste.id);
  const { data: events } = useCalendlyEvents();

  useEffect(() => { setCriteres(poste.criteres_scoring ?? {}); }, [poste.id]);

  async function save() {
    await update.mutateAsync({ titre, description, statut, calendly_event_type: calendly || null, criteres_scoring: criteres });
  }

  return (
    <div className="bg-surface border border-border rounded-[4px] p-5 space-y-3">
      <div>
        <Label className="text-xs text-text-secondary">Titre</Label>
        <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs text-text-secondary">Description</Label>
        <Textarea rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-text-secondary">Statut</Label>
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ouvert">Ouvert</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="ferme">Fermé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-text-secondary">Calendly event type</Label>
          <Select value={calendly || NONE_CALENDLY} onValueChange={(v) => setCalendly(v === NONE_CALENDLY ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_CALENDLY}>Aucun</SelectItem>
              {(events ?? []).map((e: any) => <SelectItem key={e.uri} value={e.uri}>{e.name} ({e.duration} min)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs text-text-secondary">Critères de scoring</Label>
        <CriteresEditor value={criteres} onChange={setCriteres} />
      </div>
      <Button onClick={save} disabled={update.isPending}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
        {update.isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
}

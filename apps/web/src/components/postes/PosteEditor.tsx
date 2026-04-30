import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { Textarea } from "@/components/ui/textarea.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { CriteresEditor } from "./CriteresEditor.js";
import { useUpdatePoste } from "@/lib/mutations.js";

export function PosteEditor({ poste }: { poste: any }) {
  const [titre, setTitre] = useState(poste.titre);
  const [description, setDescription] = useState(poste.description ?? "");
  const [statut, setStatut] = useState(poste.statut);
  const [lienReservation, setLienReservation] = useState<string>(poste.lien_reservation_url ?? "");
  const [criteres, setCriteres] = useState(poste.criteres_scoring ?? {});
  const update = useUpdatePoste(poste.id);

  useEffect(() => { setCriteres(poste.criteres_scoring ?? {}); }, [poste.id]);

  async function save() {
    await update.mutateAsync({ titre, description, statut, lien_reservation_url: lienReservation || null, criteres_scoring: criteres });
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
          <Label className="text-xs text-text-secondary">Lien de réservation entretien</Label>
          <Input
            type="url"
            value={lienReservation}
            onChange={(e) => setLienReservation(e.target.value)}
            placeholder="https://cal.com/votre-username/entretien"
          />
          <p className="text-[11px] text-text-muted mt-1">
            Colle n&apos;importe quelle URL de réservation (Calendly, Cal.com, Notion, Google Form, etc.). Insérée telle quelle dans les emails d&apos;invitation.
          </p>
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

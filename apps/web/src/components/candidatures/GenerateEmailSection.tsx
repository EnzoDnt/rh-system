import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { useGenerateEmail, useCreateCommunication } from "@/lib/mutations.js";

type EmailType = "invitation" | "refus" | "relance" | "accuse_reception";

function defaultEmailType(reco: string | null | undefined): EmailType {
  return reco === "refuser" ? "refus" : "invitation";
}

export function GenerateEmailSection({ cand }: { cand: any }) {
  const [type, setType] = useState<EmailType>(defaultEmailType(cand.recommandation));
  const gen = useGenerateEmail();
  const create = useCreateCommunication();

  async function go() {
    const out = await gen.mutateAsync({
      candidat_nom: cand.nom,
      candidat_email: cand.email,
      poste_titre: cand.poste_titre,
      score_global: cand.score_global,
      recommandation: cand.recommandation,
      type_email: type,
      rapport_ia: cand.rapport_ia ?? "",
    });
    await create.mutateAsync({
      candidature_id: cand.id, type, sujet: out.sujet, contenu: out.contenu,
    });
  }

  return (
    <div className="bg-surface border border-border rounded-[4px] p-5 flex items-end gap-3">
      <div className="flex-1">
        <label className="text-xs text-text-secondary block mb-1">Type d'email à générer</label>
        <Select value={type} onValueChange={(v) => setType(v as any)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="invitation">Invitation</SelectItem>
            <SelectItem value="refus">Refus</SelectItem>
            <SelectItem value="relance">Relance</SelectItem>
            <SelectItem value="accuse_reception">Accusé de réception</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={go} disabled={gen.isPending || create.isPending}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
        <Sparkles size={14} className="mr-1" />Générer un brouillon
      </Button>
    </div>
  );
}

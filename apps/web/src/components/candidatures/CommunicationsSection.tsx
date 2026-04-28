import { useState } from "react";
import { Send, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import { useFormatDate } from "@/lib/format.js";
import { useUpdateCommunication, useSendCommunication, useRegenerateEmail } from "@/lib/mutations.js";

function DraftEditor({ comm, candId }: { comm: any; candId: string }) {
  const [sujet, setSujet] = useState(comm.sujet);
  const [contenu, setContenu] = useState(comm.contenu);
  const [feedback, setFeedback] = useState("");
  const update = useUpdateCommunication(comm.id, candId);
  const send = useSendCommunication(comm.id, candId);
  const regen = useRegenerateEmail();

  return (
    <div className="border border-border rounded-[4px] p-3 space-y-2">
      <div className="flex justify-between items-start">
        <span className="text-xs uppercase tracking-wider text-text-muted">{comm.type} — brouillon</span>
      </div>
      <Input value={sujet} onChange={(e) => setSujet(e.target.value)} />
      <Textarea rows={6} value={contenu} onChange={(e) => setContenu(e.target.value)} />
      <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback pour régénération…" />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => update.mutate({ sujet, contenu })}>Enregistrer</Button>
        <Button size="sm" variant="outline" disabled={!feedback || regen.isPending} onClick={async () => {
          // Caller fills in needed context; simplest: pass the existing draft body.
          const out = await regen.mutateAsync({
            candidat_nom: "—", candidat_email: "—", poste_titre: "—",
            recommandation: "a_voir", rapport_ia: contenu, score_global: 0, feedback,
          });
          setSujet(out.sujet); setContenu(out.contenu);
        }}><RotateCw size={14} className="mr-1" />Régénérer</Button>
        <Button size="sm" onClick={() => send.mutate()} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
          <Send size={14} className="mr-1" />Valider et envoyer
        </Button>
      </div>
    </div>
  );
}

export function CommunicationsSection({ cand }: { cand: any }) {
  const fmt = useFormatDate();
  const comms = cand.communications ?? [];
  return (
    <div className="bg-surface border border-border rounded-[4px] p-5 space-y-3">
      <h3 className="font-serif text-base text-dark">Communications</h3>
      {comms.length === 0 && <p className="text-sm text-text-muted">Aucune communication.</p>}
      {comms.map((c: any) => c.statut === "brouillon"
        ? <DraftEditor key={c.id} comm={c} candId={cand.id} />
        : (
          <div key={c.id} className="border border-border rounded-[4px] p-3">
            <div className="flex justify-between text-xs">
              <span className="uppercase tracking-wider text-text-muted">{c.type} — {c.statut}</span>
              <span className="text-text-muted">{fmt(c.envoye_at ?? c.created_at)}</span>
            </div>
            <div className="mt-1 font-medium text-sm">{c.sujet}</div>
            <div className="mt-1 text-sm text-text-secondary whitespace-pre-wrap">{c.contenu}</div>
          </div>
        ))}
    </div>
  );
}

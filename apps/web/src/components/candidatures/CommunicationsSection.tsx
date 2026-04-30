import { useState } from "react";
import { Send, RotateCw, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import { useFormatDate } from "@/lib/format.js";
import { useUpdateCommunication, useSendCommunication, useRegenerateEmail, useMarkCommunicationSent } from "@/lib/mutations.js";
import { useAppConfig } from "@/lib/config.js";
import { toast } from "sonner";

function DraftActions({ comm, candId, candidatEmail, sujet, contenu, onSave }: {
  comm: any;
  candId: string;
  candidatEmail: string;
  sujet: string;
  contenu: string;
  onSave: () => void;
}) {
  const config = useAppConfig();
  const markSent = useMarkCommunicationSent(comm.id, candId);
  const sendResend = useSendCommunication(comm.id, candId);

  const mailtoUrl = `mailto:${encodeURIComponent(candidatEmail)}?subject=${encodeURIComponent(sujet)}&body=${encodeURIComponent(contenu)}`;

  async function copyToClipboard() {
    await navigator.clipboard.writeText(`Sujet : ${sujet}\n\n${contenu}`);
    toast.success("Copié dans le presse-papier");
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button size="sm" variant="outline" onClick={onSave}>Enregistrer</Button>
      <Button size="sm" variant="outline" onClick={copyToClipboard}>
        <Copy size={14} className="mr-1" />Copier
      </Button>
      <Button size="sm" variant="outline" asChild>
        <a href={mailtoUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} className="mr-1" />Ouvrir dans mon mail
        </a>
      </Button>
      <Button
        size="sm"
        onClick={() => markSent.mutate()}
        disabled={markSent.isPending}
        className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
      >
        <CheckCircle2 size={14} className="mr-1" />Marquer comme envoyé
      </Button>
      {config.data?.resend_enabled && (
        <Button size="sm" variant="outline" onClick={() => sendResend.mutate()} disabled={sendResend.isPending}>
          <Send size={14} className="mr-1" />Envoyer via Resend
        </Button>
      )}
    </div>
  );
}

function DraftEditor({ comm, candId, candidatEmail }: { comm: any; candId: string; candidatEmail: string }) {
  const [sujet, setSujet] = useState(comm.sujet);
  const [contenu, setContenu] = useState(comm.contenu);
  const [feedback, setFeedback] = useState("");
  const update = useUpdateCommunication(comm.id, candId);
  const regen = useRegenerateEmail();

  return (
    <div className="border border-border rounded-[4px] p-3 space-y-2">
      <div className="flex justify-between items-start">
        <span className="text-xs uppercase tracking-wider text-text-muted">{comm.type} — brouillon</span>
      </div>
      <Input value={sujet} onChange={(e) => setSujet(e.target.value)} />
      <Textarea rows={6} value={contenu} onChange={(e) => setContenu(e.target.value)} />
      <div className="flex gap-2">
        <Input
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback pour régénération…"
          className="flex-1"
        />
        <Button size="sm" variant="outline" disabled={!feedback || regen.isPending} onClick={async () => {
          const out = await regen.mutateAsync({
            candidat_nom: "—", candidat_email: candidatEmail, poste_titre: "—",
            recommandation: "a_voir", rapport_ia: contenu, score_global: 0, feedback,
          });
          setSujet(out.sujet); setContenu(out.contenu);
        }}><RotateCw size={14} className="mr-1" />Régénérer</Button>
      </div>
      <DraftActions
        comm={comm}
        candId={candId}
        candidatEmail={candidatEmail}
        sujet={sujet}
        contenu={contenu}
        onSave={() => update.mutate({ sujet, contenu })}
      />
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
        ? <DraftEditor key={c.id} comm={c} candId={cand.id} candidatEmail={cand.email} />
        : (
          <div key={c.id} className="border border-border rounded-[4px] p-3">
            <div className="flex justify-between text-xs">
              <span className="uppercase tracking-wider text-text-muted">{c.type} — {c.statut}</span>
              <span className="text-text-muted">{fmt(c.marque_envoye_at ?? c.envoye_at ?? c.created_at)}</span>
            </div>
            <div className="mt-1 font-medium text-sm">{c.sujet}</div>
            <div className="mt-1 text-sm text-text-secondary whitespace-pre-wrap">{c.contenu}</div>
          </div>
        ))}
    </div>
  );
}

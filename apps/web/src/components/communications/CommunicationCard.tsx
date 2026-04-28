import { Link } from "react-router-dom";
import { useFormatDate } from "@/lib/format.js";

const STATUT_BG: Record<string, string> = {
  brouillon: "bg-bg text-text-secondary border-border",
  valide: "bg-[#fef3cd] text-[#856404] border-[#ffeeba]",
  envoye: "bg-[#d4edda] text-[#155724] border-[#c3e6cb]",
  erreur: "bg-[#f8d7da] text-[#721c24] border-[#f5c6cb]",
};

export function CommunicationCard({ c }: { c: any }) {
  const fmt = useFormatDate();
  return (
    <div className="bg-surface border border-border rounded-[4px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-sm">{c.candidat_nom} <span className="text-text-muted text-xs">· {c.poste_titre}</span></div>
          <div className="text-xs text-text-muted">{c.candidat_email}</div>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-[4px] border ${STATUT_BG[c.statut]}`}>{c.statut}</span>
      </div>
      <div className="mt-2 text-sm font-medium">{c.sujet}</div>
      <div className="mt-1 text-xs text-text-muted flex items-center justify-between">
        <span>{c.type}</span>
        <span>{fmt(c.envoye_at ?? c.created_at)}</span>
      </div>
      <Link to={`/candidatures/${c.candidature_id}`} className="text-xs underline mt-2 inline-block">Voir candidature</Link>
    </div>
  );
}

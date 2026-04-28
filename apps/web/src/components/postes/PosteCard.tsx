import { Link } from "react-router-dom";
import { useFormatDate } from "@/lib/format.js";

const STATUT_LABEL: Record<string, string> = { ouvert: "Ouvert", en_cours: "En cours", ferme: "Fermé" };
const STATUT_BG: Record<string, string> = {
  ouvert: "bg-[#d4edda] text-[#155724] border-[#c3e6cb]",
  en_cours: "bg-[#fef3cd] text-[#856404] border-[#ffeeba]",
  ferme: "bg-[#f8d7da] text-[#721c24] border-[#f5c6cb]",
};

export function PosteCard({ poste }: { poste: any }) {
  const fmt = useFormatDate();
  return (
    <Link to={`/postes/${poste.id}`}
          className="block bg-surface border border-border rounded-[4px] shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <h3 className="font-serif text-base font-semibold text-dark leading-snug">{poste.titre}</h3>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-[4px] border ${STATUT_BG[poste.statut] ?? ""}`}>
          {STATUT_LABEL[poste.statut] ?? poste.statut}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
        <span>{poste.nb_candidatures} candidature{poste.nb_candidatures > 1 ? "s" : ""}</span>
        <span>{fmt(poste.created_at)}</span>
      </div>
    </Link>
  );
}

import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { scoreClass, useFormatDate, recoBadgeClass } from "@/lib/format.js";
import { ScoreBadge } from "./ScoreBadge.js";

export function CandidatureCard({ cand }: { cand: any }) {
  const fmt = useFormatDate();
  const cls = scoreClass(cand.score_global);
  const accent = cls === "high" ? "border-l-[var(--color-success)]"
              : cls === "mid"  ? "border-l-[var(--color-primary)]"
                                : "border-l-[var(--color-error)]";
  return (
    <Link to={`/candidatures/${cand.id}`}
          className={cn(
            "block bg-surface border border-border border-l-[3px] rounded-[4px] p-4 hover:shadow-md transition-shadow",
            accent,
            cand.flagged && "bg-flagged",
          )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-sm">{cand.nom}</div>
          <div className="text-xs text-text-muted">{cand.poste_titre}</div>
        </div>
        <ScoreBadge score={cand.score_global} />
      </div>
      <div className="flex items-center justify-between mt-3">
        {cand.recommandation
          ? <span className={`text-[11px] px-2 py-0.5 rounded-[4px] border ${recoBadgeClass(cand.recommandation)}`}>{cand.recommandation}</span>
          : <span className="text-[11px] text-text-muted">{cand.statut ?? ""}</span>}
        <span className="text-[11px] text-text-muted">{fmt(cand.created_at)}</span>
      </div>
      {cand.flagged && (
        <div className="mt-2 inline-flex items-center text-[11px] text-[#856404]">
          <AlertTriangle size={12} className="mr-1" />Signalé : {cand.flag_motif ?? "guardrails"}
        </div>
      )}
    </Link>
  );
}

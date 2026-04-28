import { Link } from "react-router-dom";
import { useCandidatures } from "@/lib/queries.js";
import { scoreColorVar } from "@/lib/format.js";

export function PosteCandidaturesList({ posteId }: { posteId: string }) {
  const { data } = useCandidatures({ poste_id: posteId });
  return (
    <div className="bg-surface border border-border rounded-[4px] p-5">
      <h3 className="font-serif text-base text-dark mb-3">Candidatures</h3>
      {(data ?? []).length === 0 && <p className="text-sm text-text-muted">Aucune candidature.</p>}
      <div className="space-y-1.5">
        {(data ?? []).map((c: any) => (
          <Link key={c.id} to={`/candidatures/${c.id}`}
                className="flex items-center justify-between p-2 border border-border rounded-[4px] hover:bg-bg">
            <span className="text-sm">{c.nom}</span>
            {c.score_global != null && (
              <span className="w-7 h-7 inline-flex items-center justify-center text-[11px] font-semibold text-white rounded-[4px]"
                    style={{ background: scoreColorVar(c.score_global) }}>
                {c.score_global}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

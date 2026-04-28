import { useState } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { ScoreBadge } from "./ScoreBadge.js";
import { ScoreBar } from "./ScoreBar.js";
import { Markdown } from "@/components/Markdown.js";
import { recoBadgeClass } from "@/lib/format.js";
import { useRescore, useUpdateScore } from "@/lib/mutations.js";

export function ScoreSection({ cand }: { cand: any }) {
  const rescore = useRescore(cand.id);
  const update = useUpdateScore(cand.id);
  const [editing, setEditing] = useState(false);
  const [score, setScore] = useState<number>(cand.score_global ?? 0);
  if (cand.score_global == null) {
    return (
      <div className="bg-surface border border-border rounded-[4px] p-5">
        <p className="text-sm text-text-muted">Pas encore scoré.</p>
        <Button onClick={() => rescore.mutate()} className="mt-2"><RotateCw size={14} className="mr-1" />Lancer le scoring</Button>
      </div>
    );
  }
  return (
    <div className="bg-surface border border-border rounded-[4px] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base text-dark">Score IA</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing((b) => !b)}>{editing ? "Fermer" : "Modifier"}</Button>
          <Button variant="outline" size="sm" onClick={() => rescore.mutate()}><RotateCw size={14} className="mr-1" />Re-scorer</Button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {editing
          ? <input type="number" min={0} max={100} value={score}
                   className="border border-border rounded-[4px] w-20 px-2 py-1 text-sm"
                   onChange={(e) => setScore(Number(e.target.value))} />
          : <ScoreBadge score={cand.score_global} />}
        <span className={`text-[11px] px-2 py-0.5 rounded-[4px] border ${recoBadgeClass(cand.recommandation)}`}>{cand.recommandation}</span>
        {editing && (
          <Button size="sm" onClick={async () => { await update.mutateAsync({ score_global: score }); setEditing(false); }}>
            Enregistrer
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {Object.entries(cand.scores_details ?? {}).map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-xs mb-0.5"><span>{k}</span><span>{v as number}/100</span></div>
            <ScoreBar score={v as number} />
          </div>
        ))}
      </div>
      {cand.rapport_ia && <Markdown>{cand.rapport_ia}</Markdown>}
    </div>
  );
}

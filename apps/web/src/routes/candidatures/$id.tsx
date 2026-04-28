import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useCandidature } from "@/lib/queries.js";
import { useUpdateCandidatureStatut } from "@/lib/mutations.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { ScoreSection } from "@/components/candidatures/ScoreSection.js";
import { DataSection } from "@/components/candidatures/DataSection.js";
import { FormulaireSection } from "@/components/candidatures/FormulaireSection.js";
import { NotesRHSection } from "@/components/candidatures/NotesRHSection.js";
import { CommunicationsSection } from "@/components/candidatures/CommunicationsSection.js";
import { GenerateEmailSection } from "@/components/candidatures/GenerateEmailSection.js";

const STATUTS = ["nouveau", "en_analyse", "score", "en_cours", "entretien", "offre", "accepte", "refuse", "archive"];

export default function CandidatureDetail() {
  const { id = "" } = useParams();
  const { data: cand, isLoading } = useCandidature(id);
  const updStatut = useUpdateCandidatureStatut(id);
  if (isLoading || !cand) return <p className="text-text-muted">Chargement…</p>;
  return (
    <div className="space-y-4">
      <Link to="/candidatures" className="inline-flex items-center text-sm text-text-secondary hover:text-dark">
        <ChevronLeft size={14} />Retour
      </Link>
      <div className="bg-surface border border-border rounded-[4px] p-5 flex items-start justify-between">
        <div>
          <h2 className="font-serif text-xl text-dark">{cand.nom}</h2>
          <p className="text-sm text-text-muted">{cand.email}{cand.telephone ? ` · ${cand.telephone}` : ""}</p>
          <p className="text-xs text-text-muted mt-1">{cand.poste_titre}</p>
        </div>
        <Select value={cand.statut} onValueChange={(v) => updStatut.mutate(v)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <ScoreSection cand={cand} />
      <DataSection cand={cand} />
      <FormulaireSection cand={cand} />
      <NotesRHSection cand={cand} />
      <CommunicationsSection cand={cand} />
      <GenerateEmailSection cand={cand} />
    </div>
  );
}

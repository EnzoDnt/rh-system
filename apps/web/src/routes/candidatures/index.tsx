import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.js";
import { CandidatureCard } from "@/components/candidatures/CandidatureCard.js";
import { CandidatureTable } from "@/components/candidatures/CandidatureTable.js";
import { StatutFilter } from "@/components/candidatures/StatutFilter.js";
import { useCandidatures } from "@/lib/queries.js";

export default function CandidaturesPage() {
  const [statut, setStatut] = useState("");
  const [view, setView] = useState<"cards" | "table">("cards");
  const { data } = useCandidatures(statut ? { statut } : {});

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-xl text-dark">Candidatures</h2>
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as any)}>
          <ToggleGroupItem value="cards">Cards</ToggleGroupItem>
          <ToggleGroupItem value="table">Table</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="mb-3"><StatutFilter value={statut} onChange={setStatut} /></div>
      {view === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(data ?? []).map((c: any) => <CandidatureCard key={c.id} cand={c} />)}
        </div>
      ) : (
        <CandidatureTable rows={data ?? []} />
      )}
    </div>
  );
}

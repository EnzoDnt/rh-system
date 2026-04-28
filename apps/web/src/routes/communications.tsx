import { useState } from "react";
import { useCommunications } from "@/lib/queries.js";
import { CommunicationCard } from "@/components/communications/CommunicationCard.js";
import { cn } from "@/lib/utils.js";

const FILTERS = [["", "Tous"], ["brouillon", "Brouillon"], ["valide", "Validé"], ["envoye", "Envoyé"], ["erreur", "Erreur"]] as const;

export default function CommunicationsPage() {
  const [statut, setStatut] = useState("");
  const { data } = useCommunications(statut || undefined);
  return (
    <div>
      <h2 className="font-serif text-xl text-dark mb-3">Communications</h2>
      <div className="flex gap-1.5 mb-3">
        {FILTERS.map(([v, l]) => (
          <button key={v} onClick={() => setStatut(v)}
                  className={cn("text-xs px-2.5 py-1 rounded-[4px] border",
                    statut === v ? "bg-dark text-white border-dark" : "bg-surface text-text-secondary border-border hover:bg-bg")}>
            {l}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(data ?? []).map((c) => <CommunicationCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea.js";
import { useUpdateNotesRH } from "@/lib/mutations.js";

export function NotesRHSection({ cand }: { cand: any }) {
  const [notes, setNotes] = useState(cand.notes_rh ?? "");
  const update = useUpdateNotesRH(cand.id);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (notes === (cand.notes_rh ?? "")) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => update.mutate(notes), 1000);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [notes]);

  return (
    <div className="bg-surface border border-border rounded-[4px] p-5">
      <h3 className="font-serif text-base text-dark mb-2">Notes RH</h3>
      <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <p className="text-xs text-text-muted mt-1">{update.isPending ? "Enregistrement…" : "Auto-sauvegarde activée"}</p>
    </div>
  );
}

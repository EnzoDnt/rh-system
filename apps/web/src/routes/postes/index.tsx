import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { PosteCard } from "@/components/postes/PosteCard.js";
import { CreatePosteDialog } from "@/components/postes/CreatePosteDialog.js";
import { usePostes } from "@/lib/queries.js";

export default function PostesPage() {
  const { data, isLoading } = usePostes();
  const [creating, setCreating] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-xl text-dark">Postes</h2>
        <Button onClick={() => setCreating(true)} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
          <Plus size={14} className="mr-1" />Nouveau poste
        </Button>
      </div>
      {isLoading ? (
        <p className="text-text-muted">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data ?? []).map((p) => <PosteCard key={p.id} poste={p} />)}
        </div>
      )}
      <CreatePosteDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

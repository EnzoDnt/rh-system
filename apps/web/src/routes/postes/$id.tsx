import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Copy, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { usePoste } from "@/lib/queries.js";
import { useGenerateQuestions } from "@/lib/mutations.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { PosteEditor } from "@/components/postes/PosteEditor.js";
import { PosteStats } from "@/components/postes/PosteStats.js";
import { FichePosteEditor } from "@/components/postes/FichePosteEditor.js";
import { PosteCandidaturesList } from "@/components/postes/PosteCandidaturesList.js";

function PublicFormLink({ poste }: { poste: any }) {
  const genQ = useGenerateQuestions(poste.id);
  const slug: string | null = poste.slug ?? null;
  const url = slug ? `${window.location.origin}/postuler/${slug}` : null;

  return (
    <div className="bg-surface border border-border rounded-[4px] p-5 space-y-3">
      <h3 className="font-serif text-base text-dark">Formulaire de candidature</h3>
      {url ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Lien du formulaire public</p>
          <div className="flex gap-2">
            <Input value={url} readOnly className="flex-1" />
            <Button
              size="sm"
              onClick={() =>
                navigator.clipboard
                  .writeText(url)
                  .then(() => toast.success("Lien copié"))
              }
              title="Copier le lien"
            >
              <Copy size={14} />
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} />
              </a>
            </Button>
          </div>
          <p className="text-xs text-text-muted">
            Partage ce lien aux candidats. Ils accéderont au formulaire de
            candidature.
          </p>
        </div>
      ) : (
        <p className="text-sm text-text-muted">
          Slug non défini pour ce poste. Contacte l&apos;administrateur.
        </p>
      )}
      <div className="pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => genQ.mutate()}
          disabled={genQ.isPending}
        >
          <Sparkles size={14} className="mr-1" />
          {genQ.isPending ? "Génération…" : "Régénérer les questions"}
        </Button>
        <p className="text-xs text-text-muted mt-1">
          Régénère les questions du formulaire à partir de la description et des
          critères du poste.
        </p>
      </div>
    </div>
  );
}

export default function PosteDetail() {
  const { id = "" } = useParams();
  const { data: poste, isLoading } = usePoste(id);
  if (isLoading || !poste) return <p className="text-text-muted">Chargement…</p>;
  return (
    <div className="space-y-4">
      <Link
        to="/postes"
        className="inline-flex items-center text-sm text-text-secondary hover:text-dark"
      >
        <ChevronLeft size={14} />Retour
      </Link>
      <h2 className="font-serif text-xl text-dark">{poste.titre}</h2>
      <PosteStats stats={poste.stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PosteEditor poste={poste} />
        <div className="space-y-4">
          <PublicFormLink poste={poste} />
          <FichePosteEditor poste={poste} />
        </div>
      </div>
      <PosteCandidaturesList posteId={poste.id} />
    </div>
  );
}

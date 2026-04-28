import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { usePoste } from "@/lib/queries.js";
import { PosteEditor } from "@/components/postes/PosteEditor.js";
import { PosteStats } from "@/components/postes/PosteStats.js";
import { FichePosteEditor } from "@/components/postes/FichePosteEditor.js";
import { FormbricksSurveyManager } from "@/components/postes/FormbricksSurveyManager.js";
import { PosteCandidaturesList } from "@/components/postes/PosteCandidaturesList.js";

export default function PosteDetail() {
  const { id = "" } = useParams();
  const { data: poste, isLoading } = usePoste(id);
  if (isLoading || !poste) return <p className="text-text-muted">Chargement…</p>;
  return (
    <div className="space-y-4">
      <Link to="/postes" className="inline-flex items-center text-sm text-text-secondary hover:text-dark">
        <ChevronLeft size={14} />Retour
      </Link>
      <h2 className="font-serif text-xl text-dark">{poste.titre}</h2>
      <PosteStats stats={poste.stats} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PosteEditor poste={poste} />
        <div className="space-y-4">
          <FormbricksSurveyManager poste={poste} />
          <FichePosteEditor poste={poste} />
        </div>
      </div>
      <PosteCandidaturesList posteId={poste.id} />
    </div>
  );
}

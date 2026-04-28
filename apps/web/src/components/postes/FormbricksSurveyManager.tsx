import { Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { useGenerateSurveyQuestions, useSetupSurvey } from "@/lib/mutations.js";
import { toast } from "sonner";

export function FormbricksSurveyManager({ poste }: { poste: any }) {
  const genQ = useGenerateSurveyQuestions();
  const setup = useSetupSurvey(poste.id);

  async function createSurvey() {
    const { questions } = await genQ.mutateAsync({
      poste_titre: poste.titre,
      poste_description: poste.description,
      criteres: poste.criteres_scoring,
    });
    await setup.mutateAsync({ generatedQuestions: questions });
  }

  const surveyUrl = poste.formbricks_survey_id
    ? `https://formbricks.your-domain.example/s/${poste.formbricks_survey_id}`
    : null;

  return (
    <div className="bg-surface border border-border rounded-[4px] p-5 space-y-3">
      <h3 className="font-serif text-base text-dark">Formulaire Formbricks</h3>
      {surveyUrl ? (
        <a href={surveyUrl} target="_blank" rel="noreferrer" className="text-sm underline inline-flex items-center gap-1">
          {surveyUrl}<ExternalLink size={12} />
        </a>
      ) : (
        <Button onClick={createSurvey} disabled={genQ.isPending || setup.isPending}
                className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
          <Sparkles size={14} className="mr-1" />
          {genQ.isPending || setup.isPending ? "Création…" : "Créer le formulaire"}
        </Button>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import type { Question } from "@rh/types";
import { Button } from "@/components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.js";
import { QuestionsEditor } from "./QuestionsEditor.js";
import { useUpdatePoste } from "@/lib/mutations.js";

export function QuestionsEditorDialog({
  posteId,
  initialQuestions,
}: {
  posteId: string;
  initialQuestions: Question[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Question[]>(initialQuestions);
  const update = useUpdatePoste(posteId);

  // Reset draft when reopening or when source changes
  useEffect(() => {
    if (open) setDraft(initialQuestions);
  }, [open, initialQuestions]);

  async function handleSave() {
    await update.mutateAsync({ questions_json: draft });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil size={14} className="mr-1" />
          Modifier le formulaire
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le formulaire de candidature</DialogTitle>
          <DialogDescription>
            Édite, réordonne ou ajoute des questions. Les champs standards
            (nom, email, CV, …) restent figés car ils sont nécessaires au
            scoring et aux emails.
          </DialogDescription>
        </DialogHeader>

        <QuestionsEditor value={draft} onChange={setDraft} />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={update.isPending}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={update.isPending}
          >
            {update.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

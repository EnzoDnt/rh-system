import { useEffect, useState } from "react";
import { usePrompts, usePrompt } from "@/lib/queries.js";
import { PromptsSidebar } from "@/components/prompts/PromptsSidebar.js";
import { PromptEditor } from "@/components/prompts/PromptEditor.js";
import { PromptHistory } from "@/components/prompts/PromptHistory.js";

export default function PromptsPage() {
  const { data: list } = usePrompts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { if (list && !selectedId) setSelectedId(list[0]?.id ?? null); }, [list]);
  const { data: detail } = usePrompt(selectedId ?? "");
  return (
    <div className="grid grid-cols-[260px,1fr] gap-4">
      <PromptsSidebar prompts={list ?? []} selectedId={selectedId} onSelect={setSelectedId} />
      <div className="space-y-4">
        {detail ? (
          <>
            <PromptEditor prompt={detail} />
            <div className="border border-border rounded-[4px] bg-surface p-5">
              <h3 className="font-serif text-base text-dark mb-3">Historique</h3>
              <PromptHistory prompt={detail} />
            </div>
          </>
        ) : <p className="text-text-muted">Sélectionne un prompt</p>}
      </div>
    </div>
  );
}

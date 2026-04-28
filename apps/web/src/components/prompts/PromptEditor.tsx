import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.js";
import { Textarea } from "@/components/ui/textarea.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { Markdown } from "@/components/Markdown.js";
import { useUpdatePrompt } from "@/lib/mutations.js";

const MODELS = ["claude-sonnet-4-6", "claude-sonnet-4-20250514", "claude-opus-4-6", "claude-haiku-4-5"];

export function PromptEditor({ prompt }: { prompt: any }) {
  const [text, setText] = useState(prompt.system_prompt);
  const [model, setModel] = useState(prompt.model);
  const [preview, setPreview] = useState(false);
  const update = useUpdatePrompt(prompt.id);

  useEffect(() => { setText(prompt.system_prompt); setModel(prompt.model); }, [prompt.id, prompt.version]);

  return (
    <div className="border border-border rounded-[4px] bg-surface p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-base text-dark">{prompt.nom} · v{prompt.version}</h3>
        <div className="flex items-center gap-2">
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setPreview((b) => !b)}>{preview ? "Source" : "Preview"}</Button>
        </div>
      </div>
      {prompt.variables_disponibles?.length > 0 && (
        <div className="text-[11px] text-text-muted">
          Variables disponibles : {prompt.variables_disponibles.map((v: any) => v.nom).join(", ")}
        </div>
      )}
      {preview
        ? <div className="border border-border rounded-[4px] p-3 bg-bg max-h-[60vh] overflow-auto"><Markdown>{text}</Markdown></div>
        : <Textarea rows={20} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" />}
      <Button onClick={() => update.mutateAsync({ system_prompt: text, model })}
              className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
        {update.isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </div>
  );
}

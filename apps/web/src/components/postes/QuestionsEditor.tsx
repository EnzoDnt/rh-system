import { useId } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import type { Question } from "@rh/types";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import { Label } from "@/components/ui/label.js";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.js";

const STANDARD_IDS = new Set([
  "nom",
  "email",
  "telephone",
  "linkedin_url",
  "cv_pdf",
]);

const TYPE_OPTIONS: Array<{ value: Question["type"]; label: string }> = [
  { value: "text", label: "Texte court" },
  { value: "long_text", label: "Texte long" },
  { value: "select", label: "Choix unique" },
  { value: "url", label: "URL" },
  { value: "tel", label: "Téléphone" },
  { value: "email", label: "Email" },
];

function genId(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 40) || `question_${Math.random().toString(36).slice(2, 8)}`
  );
}

export function QuestionsEditor({
  value,
  onChange,
}: {
  value: Question[];
  onChange: (next: Question[]) => void;
}) {
  const standards = value.filter((q) => STANDARD_IDS.has(q.id));
  const customs = value.filter((q) => !STANDARD_IDS.has(q.id));

  function updateCustom(idx: number, patch: Partial<Question>) {
    const nextCustoms = customs.map((q, i) => (i === idx ? { ...q, ...patch } : q));
    onChange([...standards, ...nextCustoms]);
  }

  function moveCustom(idx: number, direction: -1 | 1) {
    const target = idx + direction;
    if (target < 0 || target >= customs.length) return;
    const a = customs[idx];
    const b = customs[target];
    if (!a || !b) return;
    const nextCustoms = [...customs];
    nextCustoms[idx] = b;
    nextCustoms[target] = a;
    onChange([...standards, ...nextCustoms]);
  }

  function removeCustom(idx: number) {
    const nextCustoms = customs.filter((_, i) => i !== idx);
    onChange([...standards, ...nextCustoms]);
  }

  function addCustom() {
    const next: Question = {
      id: genId(`question_${customs.length + 1}_${Math.random().toString(36).slice(2, 5)}`),
      type: "long_text",
      label: "Nouvelle question",
      required: false,
    };
    onChange([...standards, ...customs, next]);
  }

  return (
    <div className="space-y-6">
      {/* Read-only standards */}
      <section>
        <h3 className="text-sm font-medium text-text-secondary mb-2">
          Champs standards (non modifiables)
        </h3>
        <ul className="text-xs text-text-muted space-y-1">
          {standards.length === 0 ? (
            <li className="opacity-70">Aucun champ standard détecté.</li>
          ) : (
            standards.map((q) => (
              <li key={q.id}>
                • {q.label}{" "}
                <span className="opacity-60">
                  ({q.type}
                  {q.required ? ", requis" : ""})
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Editable customs */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Questions du poste</h3>
          <Button type="button" variant="outline" size="sm" onClick={addCustom}>
            <Plus size={14} className="mr-1" />
            Ajouter
          </Button>
        </div>
        {customs.length === 0 ? (
          <p className="text-sm text-text-muted">
            Aucune question spécifique. Clique sur « Ajouter » ou utilise « Régénérer les questions » sur la page poste.
          </p>
        ) : (
          customs.map((q, i) => (
            <QuestionRow
              key={q.id}
              q={q}
              index={i}
              total={customs.length}
              onUpdate={(patch) => updateCustom(i, patch)}
              onMoveUp={() => moveCustom(i, -1)}
              onMoveDown={() => moveCustom(i, 1)}
              onRemove={() => removeCustom(i)}
            />
          ))
        )}
      </section>
    </div>
  );
}

function QuestionRow({
  q,
  index,
  total,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  q: Question;
  index: number;
  total: number;
  onUpdate: (patch: Partial<Question>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const uid = useId();
  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="flex items-start gap-2">
        <div className="flex flex-col gap-1 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === 0}
            onClick={onMoveUp}
            aria-label="Monter"
          >
            <ArrowUp size={14} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={index === total - 1}
            onClick={onMoveDown}
            aria-label="Descendre"
          >
            <ArrowDown size={14} />
          </Button>
        </div>
        <div className="flex-1 space-y-3 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`${uid}-label`}>Label</Label>
              <Input
                id={`${uid}-label`}
                value={q.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${uid}-type`}>Type</Label>
              <Select
                value={q.type}
                onValueChange={(v) => onUpdate({ type: v as Question["type"] })}
              >
                <SelectTrigger id={`${uid}-type`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${uid}-help`}>Texte d'aide (optionnel)</Label>
            <Input
              id={`${uid}-help`}
              value={q.help_text ?? ""}
              onChange={(e) => onUpdate({ help_text: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${uid}-placeholder`}>Placeholder (optionnel)</Label>
            <Input
              id={`${uid}-placeholder`}
              value={q.placeholder ?? ""}
              onChange={(e) => onUpdate({ placeholder: e.target.value || undefined })}
            />
          </div>
          {q.type === "select" && (
            <div className="space-y-1">
              <Label htmlFor={`${uid}-options`}>Options (une par ligne)</Label>
              <Textarea
                id={`${uid}-options`}
                rows={4}
                value={(q.options ?? []).join("\n")}
                onChange={(e) =>
                  onUpdate({
                    options: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm pt-1">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
            />
            Question obligatoire
          </label>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label="Supprimer"
        >
          <Trash2 size={14} className="text-red-600" />
        </Button>
      </div>
    </div>
  );
}

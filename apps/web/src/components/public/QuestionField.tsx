import { useState, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input.js";
import { Textarea } from "@/components/ui/textarea.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";

const BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000";

export type Question = {
  id: string;
  type: "text" | "email" | "tel" | "url" | "long_text" | "file_pdf" | "select";
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
  help_text?: string;
};

export function QuestionField({
  q,
  value,
  onChange,
  slug,
}: {
  q: Question;
  value: any;
  onChange: (v: any) => void;
  slug: string;
}) {
  const id = `q_${q.id}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {q.label}
        {q.required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {q.help_text && (
        <p className="text-xs text-text-muted">{q.help_text}</p>
      )}
      {q.type === "long_text" ? (
        <Textarea
          id={id}
          rows={4}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder}
          required={q.required}
        />
      ) : q.type === "select" ? (
        <Select
          value={value ?? "__none__"}
          onValueChange={(v) => onChange(v === "__none__" ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {q.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : q.type === "file_pdf" ? (
        <FileUpload
          id={id}
          value={value}
          onChange={onChange}
          required={q.required}
          slug={slug}
        />
      ) : (
        <Input
          id={id}
          type={
            q.type === "email"
              ? "email"
              : q.type === "tel"
                ? "tel"
                : q.type === "url"
                  ? "url"
                  : "text"
          }
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder}
          required={q.required}
        />
      )}
    </div>
  );
}

function FileUpload({
  id,
  value,
  onChange,
  required,
  slug,
}: {
  id: string;
  value: string | null;
  onChange: (url: string | null) => void;
  required?: boolean;
  slug: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("PDF uniquement");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Max 5 MB");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/api/public/upload-url/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Erreur lors de la génération du lien d'upload");
      }
      const { upload_url, file_url } = await res.json();
      const upload = await fetch(upload_url, { method: "PUT", body: file });
      if (!upload.ok) throw new Error("Upload du fichier échoué");
      onChange(file_url);
    } catch (e: any) {
      setError(e.message ?? "Upload échoué");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-700 shrink-0"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="text-green-700 truncate">Fichier téléversé</span>
          </div>
          <button
            type="button"
            className="text-xs underline text-text-muted hover:text-text shrink-0"
            onClick={() => onChange(null)}
          >
            Changer
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={`flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-6 text-sm text-text-muted hover:border-[var(--color-primary)] hover:text-text transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>
            <strong className="font-medium">Cliquez pour téléverser</strong> un fichier PDF
          </span>
          <span className="text-xs">5 MB maximum</span>
          <input
            id={id}
            type="file"
            accept="application/pdf"
            onChange={handleFile}
            required={required}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      )}
      {uploading && (
        <p className="text-xs text-text-muted">Téléversement en cours…</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

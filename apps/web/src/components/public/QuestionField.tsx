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
    <div className="space-y-1">
      {value ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-green-700">Fichier uploadé</span>
          <button
            type="button"
            className="text-xs underline"
            onClick={() => onChange(null)}
          >
            Changer
          </button>
        </div>
      ) : (
        <input
          id={id}
          type="file"
          accept="application/pdf"
          onChange={handleFile}
          required={required}
          disabled={uploading}
        />
      )}
      {uploading && (
        <p className="text-xs text-text-muted">Upload en cours…</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

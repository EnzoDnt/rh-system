import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { QuestionField } from "./QuestionField.js";
import { ThankYou } from "./ThankYou.js";
import { Button } from "@/components/ui/button.js";

const BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3000";

export function ApplicationForm() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [reponses, setReponses] = useState<Record<string, any>>({});
  const [website_url, setWebsiteUrl] = useState(""); // honeypot
  const [submitted, setSubmitted] = useState(false);

  const {
    data: poste,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-poste", slug],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/public/postes/${slug}`);
      if (!res.ok) throw new Error("Poste introuvable ou fermé");
      return res.json();
    },
    enabled: !!slug,
    retry: false,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE}/api/public/applications/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website_url, reponses }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Erreur lors de l'envoi");
      }
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-text-muted">Chargement…</p>
      </div>
    );
  }

  if (error || !poste) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-red-600">Poste introuvable ou fermé.</p>
      </div>
    );
  }

  if (submitted) {
    return <ThankYou poste_titre={poste.titre} />;
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {poste.fiche_html ? (
        <div
          dangerouslySetInnerHTML={{ __html: poste.fiche_html }}
          className="prose max-w-none"
        />
      ) : (
        <div className="space-y-2">
          <h1 className="text-2xl font-serif">{poste.titre}</h1>
          {poste.description && (
            <p className="text-text-secondary whitespace-pre-wrap">
              {poste.description}
            </p>
          )}
        </div>
      )}
      <hr className="my-6" />
      <h2 className="text-xl font-serif">Candidature</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="space-y-4"
      >
        {/* Honeypot — invisible to real users */}
        <input
          type="text"
          name="website_url"
          value={website_url}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          style={{ position: "absolute", left: "-9999px" }}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
        {(poste.questions ?? []).map((q: any) => (
          <QuestionField
            key={q.id}
            q={q}
            value={reponses[q.id] ?? null}
            onChange={(v) =>
              setReponses((prev) => ({ ...prev, [q.id]: v }))
            }
            slug={slug}
          />
        ))}
        {submit.error && (
          <p className="text-sm text-red-600">
            {(submit.error as Error).message}
          </p>
        )}
        <Button
          type="submit"
          disabled={submit.isPending}
          className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
        >
          {submit.isPending ? "Envoi…" : "Envoyer ma candidature"}
        </Button>
      </form>
    </div>
  );
}

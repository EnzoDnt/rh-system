import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { QuestionField } from "./QuestionField.js";
import { ThankYou } from "./ThankYou.js";
import { Button } from "@/components/ui/button.js";

/**
 * Renders an HTML string (the AI-generated fiche de poste) inside an iframe.
 * Isolates its CSS (which uses `* { margin: 0; padding: 0; }`) from the
 * surrounding React app, otherwise the global reset bleeds into Tailwind
 * classes (mx-auto, etc.) and breaks the page layout.
 */
function FicheFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const iframe = ref.current;
    if (!iframe) return;

    const measure = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const h = doc.documentElement.scrollHeight;
      if (h > 0 && Math.abs(h - height) > 4) setHeight(h);
    };

    iframe.addEventListener("load", measure);
    // Re-measure if the iframe content reflows (fonts loading, images, etc.)
    const id = window.setInterval(measure, 500);
    return () => {
      iframe.removeEventListener("load", measure);
      window.clearInterval(id);
    };
  }, [html, height]);

  return (
    <iframe
      ref={ref}
      srcDoc={html}
      sandbox="allow-same-origin"
      title="Fiche de poste"
      className="block w-full border-0"
      style={{ height }}
    />
  );
}

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
    <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 sm:py-10 pb-16 space-y-8">
      {poste.fiche_html ? (
        <FicheFrame html={poste.fiche_html} />
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
        className="space-y-6"
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

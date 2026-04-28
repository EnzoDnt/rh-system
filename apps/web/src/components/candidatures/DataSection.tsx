import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function DataSection({ cand }: { cand: any }) {
  const [openCv, setOpenCv] = useState(false);
  const [openLi, setOpenLi] = useState(false);
  return (
    <div className="bg-surface border border-border rounded-[4px] p-5 space-y-3">
      <h3 className="font-serif text-base text-dark">Données candidat</h3>
      {cand.cv_url && (
        <div>
          <div className="flex items-center justify-between">
            <a className="text-sm underline" href={cand.cv_url} target="_blank" rel="noreferrer">CV</a>
            <button onClick={() => setOpenCv((b) => !b)} className="text-xs inline-flex items-center text-text-muted">
              {openCv ? <ChevronDown size={14} /> : <ChevronRight size={14} />}Texte extrait
            </button>
          </div>
          {openCv && <pre className="mt-2 p-3 bg-bg rounded-[4px] text-xs whitespace-pre-wrap max-h-64 overflow-auto">{cand.cv_texte_extrait || "(vide)"}</pre>}
        </div>
      )}
      {cand.linkedin_url && (
        <div>
          <div className="flex items-center justify-between">
            <a className="text-sm underline" href={cand.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>
            <button onClick={() => setOpenLi((b) => !b)} className="text-xs inline-flex items-center text-text-muted">
              {openLi ? <ChevronDown size={14} /> : <ChevronRight size={14} />}Données scrapées
            </button>
          </div>
          {openLi && <pre className="mt-2 p-3 bg-bg rounded-[4px] text-xs whitespace-pre-wrap max-h-64 overflow-auto">{JSON.stringify(cand.linkedin_data, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}

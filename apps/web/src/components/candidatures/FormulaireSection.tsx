export function FormulaireSection({ cand }: { cand: any }) {
  const entries = Object.entries(cand.reponses_formulaire ?? {});
  if (!entries.length) return null;
  return (
    <div className="bg-surface border border-border rounded-[4px] p-5">
      <h3 className="font-serif text-base text-dark mb-3">Réponses au formulaire</h3>
      <dl className="space-y-2 text-sm">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-text-muted">{k}</dt>
            <dd className="text-text">{String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

import { StatCard } from "@/components/StatCard.js";

const fmtEur = (n: number | null | undefined) =>
  (n ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function KpiCards({ overview }: { overview: any }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Postes ouverts" value={overview.postes_ouverts} />
        <StatCard label="Candidatures totales" value={overview.total_candidatures} />
        <StatCard label="Score moyen" value={overview.score_moyen != null ? Math.round(overview.score_moyen) : "—"} accent="success" />
        <StatCard label="Emails envoyés" value={overview.emails_envoyes} />
        <StatCard label="Signalées" value={overview.flagged} accent={overview.flagged ? "error" : "muted"} />
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <StatCard label="Coût IA — aujourd'hui" value={fmtEur(overview.cout_ia_today_eur)} />
        <StatCard label="Coût IA — ce mois" value={fmtEur(overview.cout_ia_month_eur)} />
      </div>
    </div>
  );
}

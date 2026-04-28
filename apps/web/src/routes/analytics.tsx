import { useAnalytics } from "@/lib/queries.js";
import { KpiCards } from "@/components/analytics/KpiCards.js";
import { DistributionChart } from "@/components/analytics/DistributionChart.js";
import { ParPosteTable } from "@/components/analytics/ParPosteTable.js";

export default function AnalyticsPage() {
  const { data, isLoading } = useAnalytics();
  if (isLoading || !data) return <p className="text-text-muted">Chargement…</p>;
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl text-dark">Analytics</h2>
      <KpiCards overview={data.overview} />
      <DistributionChart distribution={data.distribution} />
      <ParPosteTable rows={data.par_poste} />
    </div>
  );
}

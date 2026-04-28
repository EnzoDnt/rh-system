import { StatCard } from "@/components/StatCard.js";

export function PosteStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="Candidatures" value={stats?.total_candidatures ?? 0} />
      <StatCard label="Scorées" value={stats?.total_scored ?? 0} />
      <StatCard label="Score moyen" value={stats?.avg_score != null ? Math.round(stats.avg_score) : "—"} accent="success" />
      <StatCard label="Signalées" value={stats?.total_flagged ?? 0} accent={stats?.total_flagged ? "error" : "muted"} />
    </div>
  );
}

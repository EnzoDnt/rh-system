import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

const COLORS: Record<string, string> = {
  excellent: "var(--color-success)",
  bon: "#7ab584",
  moyen: "var(--color-primary)",
  faible: "var(--color-error)",
};

export function DistributionChart({ distribution }: { distribution: any }) {
  const data = [
    { name: "Excellent (≥80)", key: "excellent", value: distribution.excellent },
    { name: "Bon (60-79)",     key: "bon",       value: distribution.bon },
    { name: "Moyen (40-59)",   key: "moyen",     value: distribution.moyen },
    { name: "Faible (<40)",    key: "faible",    value: distribution.faible },
  ];
  return (
    <div className="bg-surface border border-border rounded-[4px] p-5">
      <h3 className="font-serif text-base text-dark mb-3">Distribution des scores</h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((d) => <Cell key={d.key} fill={COLORS[d.key]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

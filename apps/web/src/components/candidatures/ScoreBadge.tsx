import { scoreColorVar } from "@/lib/format.js";
export function ScoreBadge({ score, size = 40 }: { score: number | null; size?: 40 | 28 }) {
  if (score == null) return <span className="text-text-muted text-sm">—</span>;
  const fontSize = size === 40 ? 14 : 11;
  return (
    <span style={{ width: size, height: size, background: scoreColorVar(score), fontSize }}
          className="inline-flex items-center justify-center font-semibold text-white rounded-[4px]">
      {score}
    </span>
  );
}

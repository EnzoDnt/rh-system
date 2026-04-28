import { scoreColorVar } from "@/lib/format.js";
export function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-1.5 bg-bg rounded-[3px]">
      <div className="h-full rounded-[3px]" style={{ width: `${score}%`, background: scoreColorVar(score) }} />
    </div>
  );
}

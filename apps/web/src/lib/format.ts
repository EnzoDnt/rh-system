import { useUi } from "@/stores/uiStore.js";

export function useFormatDate() {
  const hideDates = useUi((s) => s.hideDates);
  return (iso: string | null | undefined) => {
    if (!iso) return "—";
    if (hideDates) return "•••";
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  };
}

export function scoreClass(score: number | null | undefined): "high" | "mid" | "low" {
  if (score == null) return "low";
  if (score >= 75) return "high";
  if (score >= 50) return "mid";
  return "low";
}

export function scoreColorVar(score: number | null | undefined): string {
  const c = scoreClass(score);
  return c === "high" ? "var(--color-success)" : c === "mid" ? "var(--color-primary)" : "var(--color-error)";
}

export function recoBadgeClass(reco: string | null | undefined) {
  if (reco === "retenir") return "bg-[#d4edda] text-[#155724] border-[#c3e6cb]";
  if (reco === "refuser") return "bg-[#f8d7da] text-[#721c24] border-[#f5c6cb]";
  return "bg-[#fef3cd] text-[#856404] border-[#ffeeba]";
}

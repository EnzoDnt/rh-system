import { useQuery } from "@tanstack/react-query";
import { api } from "./api.js";

export const qk = {
  postes: () => ["postes"] as const,
  poste: (id: string) => ["postes", id] as const,
  candidatures: (params: { poste_id?: string; statut?: string }) => ["candidatures", params] as const,
  candidature: (id: string) => ["candidatures", id] as const,
  communications: (statut?: string) => ["communications", statut] as const,
  analytics: () => ["analytics"] as const,
  prompts: () => ["prompts"] as const,
  prompt: (id: string) => ["prompts", id] as const,
};

export const usePostes = () => useQuery({ queryKey: qk.postes(), queryFn: () => api<any[]>("/api/postes") });
export const usePoste = (id: string) => useQuery({ queryKey: qk.poste(id), queryFn: () => api<any>(`/api/postes/${id}`), enabled: !!id });

export const useCandidatures = (params: { poste_id?: string; statut?: string }) => {
  const qs = new URLSearchParams();
  if (params.poste_id) qs.set("poste_id", params.poste_id);
  if (params.statut) qs.set("statut", params.statut);
  const path = "/api/candidatures" + (qs.toString() ? `?${qs}` : "");
  return useQuery({ queryKey: qk.candidatures(params), queryFn: () => api<any[]>(path) });
};
export const useCandidature = (id: string) =>
  useQuery({ queryKey: qk.candidature(id), queryFn: () => api<any>(`/api/candidatures/${id}`), enabled: !!id });

export const useCommunications = (statut?: string) => {
  const path = "/api/communications" + (statut ? `?statut=${statut}` : "");
  return useQuery({ queryKey: qk.communications(statut), queryFn: () => api<any[]>(path) });
};

export const useAnalytics = () => useQuery({ queryKey: qk.analytics(), queryFn: () => api<any>("/api/analytics") });

export const usePrompts = () => useQuery({ queryKey: qk.prompts(), queryFn: () => api<any[]>("/api/prompts") });
export const usePrompt = (id: string) => useQuery({ queryKey: qk.prompt(id), queryFn: () => api<any>(`/api/prompts/${id}`), enabled: !!id });

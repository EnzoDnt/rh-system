import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./api.js";
import { qk } from "./queries.js";

export function useCreatePoste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => api<any>("/api/postes", { method: "POST", json: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.postes() }); toast.success("Poste créé"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePoste(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => api<any>(`/api/postes/${id}`, { method: "PATCH", json: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.poste(id) }); qc.invalidateQueries({ queryKey: qk.postes() }); toast.success("Poste enregistré"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateCandidature(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => api<any>(`/api/candidatures/${id}`, { method: "PATCH", json: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.candidature(id) }); toast.success("Candidature enregistrée"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateCandidatureStatut(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (statut: string) => api<any>(`/api/candidatures/${id}/statut`, { method: "PATCH", json: { statut } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.candidature(id) }); qc.invalidateQueries({ queryKey: ["candidatures"] }); toast.success("Statut mis à jour"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateNotesRH(id: string) {
  return useMutation({
    mutationFn: (notes_rh: string) => api<any>(`/api/candidatures/${id}/notes`, { method: "PATCH", json: { notes_rh } }),
  });
}

export function useUpdateScore(candidatureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => api<any>(`/api/candidatures/${candidatureId}/score`, { method: "PATCH", json: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.candidature(candidatureId) }); toast.success("Score mis à jour"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRescore(candidatureId: string) {
  return useMutation({
    mutationFn: () => api<any>(`/api/candidatures/${candidatureId}/rescore`, { method: "POST" }),
    onSuccess: () => toast.info("Re-scoring lancé. Le résultat apparaîtra d'ici 30s."),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useCreateCommunication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => api<any>("/api/communications", { method: "POST", json: input }),
    onSuccess: (_data, vars: any) => qc.invalidateQueries({ queryKey: qk.candidature(vars.candidature_id) }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateCommunication(id: string, candidatureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => api<any>(`/api/communications/${id}`, { method: "PATCH", json: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.candidature(candidatureId) }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSendCommunication(id: string, candidatureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<any>(`/api/communications/${id}/send`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.candidature(candidatureId) }); toast.success("Email validé et envoi déclenché"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMarkCommunicationSent(id: string, candidatureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<any>(`/api/communications/${id}/mark-sent`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.candidature(candidatureId) }); toast.success("Communication marquée comme envoyée"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePrompt(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { system_prompt: string; model: string }) => api<any>(`/api/prompts/${id}`, { method: "PATCH", json: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.prompt(id) }); qc.invalidateQueries({ queryKey: qk.prompts() }); toast.success("Prompt enregistré"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRestorePrompt(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (history_id: string) => api<any>(`/api/prompts/${id}/restore`, { method: "POST", json: { history_id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.prompt(id) }); toast.success("Version restaurée"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGenerateCriteres() {
  return useMutation({
    mutationFn: (input: { titre: string; description: string; instructions?: string }) =>
      api<Record<string, { poids: number; description: string }>>("/api/ai/generate-criteres", { method: "POST", json: input }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGenerateEmail() {
  return useMutation({
    mutationFn: (input: any) => api<{ sujet: string; contenu: string }>("/api/ai/generate-email", { method: "POST", json: input }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRegenerateEmail() {
  return useMutation({
    mutationFn: (input: any) => api<{ type: string; sujet: string; contenu: string }>("/api/ai/regenerate-email", { method: "POST", json: input }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGenerateFichePoste() {
  return useMutation({
    mutationFn: (input: any) => api<string>("/api/ai/generate-fiche-poste", { method: "POST", json: input }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useSetupSurvey(posteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => api<any>(`/api/postes/${posteId}/setup-survey`, { method: "POST", json: input }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.poste(posteId) }); toast.success("Formulaire Formbricks créé et webhook configuré"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useGenerateSurveyQuestions() {
  return useMutation({
    mutationFn: (input: any) => api<{ questions: any[] }>("/api/ai/generate-survey", { method: "POST", json: input }),
    onError: (e: any) => toast.error(e.message),
  });
}

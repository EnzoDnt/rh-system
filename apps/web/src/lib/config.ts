import { useQuery } from "@tanstack/react-query";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type AppConfig = { resend_enabled: boolean };

export function useAppConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async (): Promise<AppConfig> => {
      const res = await fetch(`${BASE}/config`);
      if (!res.ok) return { resend_enabled: false };
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase.js";

export function useSession() {
  const [session, setSession] = useState<Session | null | "loading">("loading");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

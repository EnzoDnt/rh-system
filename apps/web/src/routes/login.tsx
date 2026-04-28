import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/postes" },
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <form onSubmit={send} className="w-full max-w-sm bg-surface border border-border rounded-[4px] shadow-sm p-8">
        <h1 className="font-serif text-2xl text-dark mb-1">Recrutement</h1>
        <p className="text-sm text-text-muted mb-6">Connexion par lien magique</p>
        {sent ? (
          <p className="text-sm text-success">Email envoyé. Vérifie ta boîte de réception.</p>
        ) : (
          <>
            <Label htmlFor="email" className="text-xs text-text-secondary">Email</Label>
            <Input id="email" type="email" required value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   className="mt-1 mb-4" />
            <Button type="submit" disabled={sending} className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
              {sending ? "Envoi…" : "Envoyer le lien"}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}

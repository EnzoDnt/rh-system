import { useState } from "react";
import { supabase } from "@/lib/supabase.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    if (password.length < 8) {
      setError("Minimum 8 caractères");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-full max-w-sm bg-surface border border-border rounded-[4px] shadow-sm p-8 text-center space-y-4">
          <h1 className="font-serif text-2xl text-dark">Mot de passe mis à jour</h1>
          <p className="text-sm text-text-muted">
            Tu peux maintenant te connecter avec ton nouveau mot de passe.
          </p>
          <a href="/login" className="text-sm underline text-text-secondary">
            Aller à la connexion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm bg-surface border border-border rounded-[4px] shadow-sm p-8">
        <h1 className="font-serif text-2xl text-dark mb-1">Nouveau mot de passe</h1>
        <p className="text-sm text-text-muted mb-6">Choisis un nouveau mot de passe pour ton compte.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="new-password" className="text-xs text-text-secondary">Nouveau mot de passe</Label>
            <Input
              id="new-password"
              type="password"
              required
              placeholder="Minimum 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password" className="text-xs text-text-secondary">Confirmer</Label>
            <Input
              id="confirm-password"
              type="password"
              required
              placeholder="Répète le mot de passe"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
          >
            {loading ? "Mise à jour…" : "Mettre à jour"}
          </Button>
        </form>
      </div>
    </div>
  );
}

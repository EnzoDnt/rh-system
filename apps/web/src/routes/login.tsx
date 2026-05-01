import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { Label } from "@/components/ui/label.js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.js";
import { BRAND_NAME, BRAND_LOGO_URL } from "@/lib/brand.js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [mode, setMode] = useState<"magic" | "password">("magic");

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + "/postes" },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setMagicSent(true);
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    window.location.href = "/postes";
  }

  async function handleResetPassword() {
    if (!email) { toast.error("Entre ton email d'abord"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Email de réinitialisation envoyé");
  }

  function handleTabChange(value: string) {
    setMode(value as "magic" | "password");
    setMagicSent(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm bg-surface border border-border rounded-[4px] shadow-sm p-8">
        {BRAND_LOGO_URL && <img src={BRAND_LOGO_URL} alt={BRAND_NAME} className="h-12 w-auto mb-3" />}
        <h1 className="font-serif text-2xl text-dark mb-1">{BRAND_NAME}</h1>
        <p className="text-sm text-text-muted mb-6">Connexion</p>

        <Tabs value={mode} onValueChange={handleTabChange}>
          <TabsList className="w-full mb-6">
            <TabsTrigger value="magic" className="flex-1">Lien magique</TabsTrigger>
            <TabsTrigger value="password" className="flex-1">Mot de passe</TabsTrigger>
          </TabsList>

          <TabsContent value="magic">
            {magicSent ? (
              <p className="text-sm text-success text-center">
                Email envoyé à <strong>{email}</strong>. Vérifie ta boîte de réception.
              </p>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <Label htmlFor="email-magic" className="text-xs text-text-secondary">Email</Label>
                  <Input
                    id="email-magic"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
                >
                  {loading ? "Envoi…" : "Envoyer le lien"}
                </Button>
              </form>
            )}
          </TabsContent>

          <TabsContent value="password">
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <Label htmlFor="email-password" className="text-xs text-text-secondary">Email</Label>
                <Input
                  id="email-password"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-xs text-text-secondary">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]"
              >
                {loading ? "Connexion…" : "Se connecter"}
              </Button>
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={loading}
                className="text-xs underline text-text-muted block w-full text-center"
              >
                Mot de passe oublié ?
              </button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

import { Eye, EyeOff, LogOut } from "lucide-react";
import { useUi } from "@/stores/uiStore.js";
import { signOut } from "@/lib/auth.js";
import { BRAND_NAME, BRAND_LOGO_URL } from "@/lib/brand.js";
import { NotificationsBell } from "./NotificationsBell.js";

export function Header() {
  const { hideDates, toggleHideDates } = useUi();
  return (
    <header className="border-b border-border bg-surface">
      <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {BRAND_LOGO_URL && <img src={BRAND_LOGO_URL} alt={BRAND_NAME} className="h-10 w-auto" />}
          <div>
            <h1 className="font-serif text-2xl font-semibold text-dark leading-tight">{BRAND_NAME}</h1>
            <p className="text-sm text-text-muted">Gestion du recrutement</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleHideDates} className="p-2 hover:bg-bg rounded-[4px]" title={hideDates ? "Afficher les dates" : "Masquer les dates"}>
            {hideDates ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <NotificationsBell />
          <button onClick={signOut} className="p-2 hover:bg-bg rounded-[4px]" title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

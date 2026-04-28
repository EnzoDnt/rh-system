import { NavLink } from "react-router-dom";
import { Briefcase, Users, Mail, BarChart3, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils.js";

const TABS = [
  { to: "/postes", icon: Briefcase, label: "Postes" },
  { to: "/candidatures", icon: Users, label: "Candidatures" },
  { to: "/communications", icon: Mail, label: "Communications" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/prompts", icon: Sparkles, label: "Prompts IA" },
] as const;

export function TabsNav() {
  return (
    <nav className="border-b border-border bg-surface">
      <div className="max-w-[1280px] mx-auto px-6 flex">
        {TABS.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => cn(
              "px-5 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              isActive
                ? "text-dark border-[var(--color-primary)]"
                : "text-text-muted border-transparent hover:text-dark"
            )}>
            <Icon size={15} />{label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header.js";
import { TabsNav } from "@/components/layout/TabsNav.js";
import { ErrorBoundary } from "@/components/ErrorBoundary.js";
import { useSession } from "@/lib/auth.js";

export default function Layout() {
  const session = useSession();
  const location = useLocation();
  if (session === "loading") return <div className="p-10 text-text-muted">Chargement…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <TabsNav />
      <main className="max-w-[1280px] mx-auto px-6 py-6">
        <ErrorBoundary resetKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

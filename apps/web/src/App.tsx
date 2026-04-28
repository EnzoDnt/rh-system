import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./routes/_layout.js";
import LoginPage from "./routes/login.js";

// Lazy-load route modules (filled by Tasks 5–9)
import { lazy, Suspense } from "react";
const PostesIndex = lazy(() => import("./routes/postes/index.js"));
const PosteDetail = lazy(() => import("./routes/postes/$id.js"));
const CandidaturesIndex = lazy(() => import("./routes/candidatures/index.js"));
const CandidatureDetail = lazy(() => import("./routes/candidatures/$id.js"));
const Communications = lazy(() => import("./routes/communications.js"));
const Analytics = lazy(() => import("./routes/analytics.js"));
const Prompts = lazy(() => import("./routes/prompts.js"));

const Spinner = () => <div className="p-10 text-text-muted">Chargement…</div>;

export default function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/postes" replace />} />
          <Route path="postes" element={<PostesIndex />} />
          <Route path="postes/:id" element={<PosteDetail />} />
          <Route path="candidatures" element={<CandidaturesIndex />} />
          <Route path="candidatures/:id" element={<CandidatureDetail />} />
          <Route path="communications" element={<Communications />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="prompts" element={<Prompts />} />
        </Route>
        <Route path="*" element={<Navigate to="/postes" replace />} />
      </Routes>
    </Suspense>
  );
}

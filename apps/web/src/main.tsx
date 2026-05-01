import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App.js";
import { BRAND_NAME, BRAND_PRIMARY_COLOR, BRAND_PRIMARY_COLOR_HOVER } from "./lib/brand.js";
import "./styles/globals.css";

document.title = BRAND_NAME;

if (BRAND_PRIMARY_COLOR || BRAND_PRIMARY_COLOR_HOVER) {
  const root = document.documentElement;
  if (BRAND_PRIMARY_COLOR) root.style.setProperty("--color-primary", BRAND_PRIMARY_COLOR);
  if (BRAND_PRIMARY_COLOR_HOVER) root.style.setProperty("--color-primary-hover", BRAND_PRIMARY_COLOR_HOVER);
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

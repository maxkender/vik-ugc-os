import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { i18nReady } from "./i18n";
import { applyTheme, currentTheme } from "./lib/theme";

applyTheme(currentTheme());
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } } });

// Performance (18/11) : les pages publiques (/join, /apply…) chargent une application légère, sans le client
// Supabase ni l'auth ; le code de la page se télécharge en même temps que la langue.
const path = location.pathname;
const isPublic = /^\/(join|apply|privacy|terms)(\/|$)/.test(path);
const shell: Promise<React.ComponentType> = isPublic
  ? import("./PublicApp").then((m) => m.PublicApp)
  : import("./FullApp").then((m) => m.FullApp);
const pagePreload = path.startsWith("/join") ? import("./pages/public/Landing")
  : path.startsWith("/apply/video") ? import("./pages/public/VideoLater")
  : path.startsWith("/apply") ? import("./pages/public/Apply") : Promise.resolve();

// Premier rendu après le chargement de la langue initiale (pas de flash en anglais).
const root = ReactDOM.createRoot(document.getElementById("root")!);
Promise.all([shell, i18nReady.catch(() => {}), pagePreload.catch(() => {})]).then(([Shell]) => root.render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
));

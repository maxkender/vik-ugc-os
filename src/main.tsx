import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { i18nReady } from "./i18n";
import { App } from "./App";
import { AuthProvider } from "./lib/auth";
import { ToastProvider } from "./components/ui";
import { applyTheme, currentTheme } from "./lib/theme";

applyTheme(currentTheme());
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } } });

// Performance de la landing (18/11) : le code de la page publique se télécharge en même temps que la langue,
// au lieu d'attendre le premier rendu (un aller-retour réseau de moins avant l'affichage du titre).
const path = location.pathname;
const pagePreload = path.startsWith("/join") ? import("./pages/public/Landing")
  : path.startsWith("/apply/video") ? import("./pages/public/VideoLater")
  : path.startsWith("/apply") ? import("./pages/public/Apply") : Promise.resolve();

// Premier rendu après le chargement de la langue initiale (pas de flash en anglais).
const root = ReactDOM.createRoot(document.getElementById("root")!);
Promise.all([i18nReady, pagePreload.catch(() => {})]).finally(() => root.render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
));

import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Spinner } from "@/components/ui";

/*
 * Application publique légère (18/11) : /join, /apply, /privacy, /terms sans le client Supabase ni l'auth
 * (chargés seulement pour l'admin et l'espace créateur). Toute autre adresse recharge l'application complète.
 */
const Landing = lazy(() => import("./pages/public/Landing"));
const Apply = lazy(() => import("./pages/public/Apply"));
const VideoLater = lazy(() => import("./pages/public/VideoLater"));
const Legal = lazy(() => import("./pages/public/Legal"));

export const PUBLIC_PATH = /^\/(join|apply|privacy|terms)(\/|$)/;

function FullReload() {
  const loc = useLocation();
  useEffect(() => { window.location.assign(loc.pathname + loc.search + loc.hash); }, [loc]);
  return null;
}

export function PublicApp() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner /></div>}>
      <Routes>
        <Route path="/join" element={<Landing />} />
        <Route path="/join/:country" element={<Landing />} />
        <Route path="/apply" element={<Apply />} />
        <Route path="/apply/video/:token" element={<VideoLater />} />
        <Route path="/apply/:country" element={<Apply />} />
        <Route path="/privacy" element={<Legal />} />
        <Route path="/terms" element={<Legal />} />
        <Route path="*" element={<FullReload />} />
      </Routes>
    </Suspense>
  );
}

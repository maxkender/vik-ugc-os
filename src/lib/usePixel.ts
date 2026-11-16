import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { callFn } from "@/lib/supabase";
import { captureClick, getConsent, loadPixel, track } from "@/lib/pixel";

/**
 * Pages publiques : récupère l'ID pixel (Réglages → Intégrations → Meta), garde le fbclid,
 * charge le pixel après consentement et envoie PageView (+ ViewContent pour la landing).
 */
export function usePixel(params: URLSearchParams, page: "landing" | "apply") {
  const cfg = useQuery({ queryKey: ["public-tracking"], queryFn: async () => (await callFn("apply", { action: "pricing", country: "" })).tracking as { pixel_id: string } | null, staleTime: 3600_000 });
  const [consent, setC] = useState(getConsent());
  useEffect(() => { captureClick(params); }, []);
  useEffect(() => {
    const f = () => setC(getConsent());
    window.addEventListener("vik-consent", f);
    return () => window.removeEventListener("vik-consent", f);
  }, []);
  useEffect(() => {
    const id = cfg.data?.pixel_id;
    if (!id || consent !== "yes") return;
    captureClick(params); // pose _fbc maintenant que le consentement est donné
    loadPixel(id);
    if (page === "landing") track("ViewContent", { content_name: "ugc_creator_offer" });
    else track("ViewContent", { content_name: "ugc_creator_application_form" });
  }, [cfg.data?.pixel_id, consent]);
  return { enabled: !!cfg.data?.pixel_id };
}

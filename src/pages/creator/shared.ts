import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

export interface PosterZone {
  id: string;
  display_name: string;
  ruul_email: string | null;
  ruul_status: "none" | "email_given" | "added" | "done" | "stopped";
  zones: { code: string; price_per_video: number; rpm: number; rpm_views: number; currency: string; videos_per_day: number } | null;
}

/**
 * « Voir comme un posteur » (Réglages → Contenus & aperçus) : l'admin affiche les pages de l'espace
 * créateur pour un posteur donné, en lecture seule. Sans ce contexte, les pages utilisent le compte connecté.
 */
export interface CreatorView {
  posterId: string;
  fullName: string | null;
  readOnly: boolean;
}
export const CreatorViewContext = createContext<CreatorView | null>(null);

/** Identité affichée par l'espace créateur : le posteur prévisualisé, sinon l'utilisateur connecté. */
export function useCreatorIdentity(): { id: string | null; fullName: string | null; readOnly: boolean } {
  const view = useContext(CreatorViewContext);
  const { profile } = useAuth();
  if (view) return { id: view.posterId, fullName: view.fullName, readOnly: view.readOnly };
  return { id: profile?.id ?? null, fullName: profile?.full_name ?? null, readOnly: false };
}

/** Infobulle des boutons désactivés en aperçu. */
export const READ_ONLY_HINT = "Aperçu en lecture seule : action désactivée";

export function useMyPoster() {
  const { id } = useCreatorIdentity();
  return useQuery({
    queryKey: ["my-poster", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("posters").select("id, display_name, ruul_email, ruul_status, zone_code").eq("id", id!).maybeSingle();
      if (!data) return null;
      // zones : lecture publique (RLS zones_public)
      const { data: z } = data.zone_code ? await supabase.from("zones").select("*").eq("code", data.zone_code).maybeSingle() : { data: null };
      return { ...data, zones: z } as unknown as PosterZone;
    },
  });
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

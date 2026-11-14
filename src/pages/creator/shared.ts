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

export function useMyPoster() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["my-poster", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase.from("posters").select("id, display_name, ruul_email, ruul_status, zone_code").eq("id", profile!.id).maybeSingle();
      if (!data) return null;
      // zones : lecture publique (RLS zones_public)
      const { data: z } = data.zone_code ? await supabase.from("zones").select("*").eq("code", data.zone_code).maybeSingle() : { data: null };
      return { ...data, zones: z } as unknown as PosterZone;
    },
  });
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

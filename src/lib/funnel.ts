import { supabase } from "@/lib/supabase";

/**
 * Funnel first-party (sans cookie ni identifiant, aucune donnée personnelle) : view_join, start_apply, submit_apply.
 * Un envoi par événement et par page affichée ; les échecs sont ignorés (ne bloque jamais la candidature).
 */
const sent = new Set<string>();
export function trackFunnel(event: "view_join" | "start_apply" | "submit_apply" | "submit_no_video", country: string | null | undefined, lang: string | null | undefined) {
  const key = `${event}:${country ?? ""}:${location.pathname}`;
  if (event !== "submit_apply" && sent.has(key)) return;
  sent.add(key);
  const q = new URLSearchParams(location.search);
  supabase.rpc("track_funnel", {
    p_event: event, p_country: country ?? null, p_lang: lang ?? null,
    p_utm_source: q.get("utm_source"), p_utm_campaign: q.get("utm_campaign"), p_utm_content: q.get("utm_content"),
  }).then(() => {}, () => {});
}

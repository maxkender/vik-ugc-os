import { rpc } from "@/lib/publicApi";

/**
 * Funnel first-party (sans cookie ni identifiant, aucune donnée personnelle) : view_join, start_apply, submit_apply.
 * Un envoi par événement et par page affichée ; les échecs sont ignorés (ne bloque jamais la candidature).
 */
const sent = new Set<string>();
export type FunnelEvent = "view_join" | "click_apply_hero" | "click_apply_sticky" | "start_apply" | "apply_step1_done" | "submit_apply" | "submit_no_video";
export function trackFunnel(event: FunnelEvent, country: string | null | undefined, lang: string | null | undefined) {
  const key = `${event}:${country ?? ""}:${location.pathname}`;
  if (event !== "submit_apply" && sent.has(key)) return;
  sent.add(key);
  const q = new URLSearchParams(location.search);
  rpc("track_funnel", {
    p_event: event, p_country: country ?? null, p_lang: lang ?? null,
    p_utm_source: q.get("utm_source"), p_utm_campaign: q.get("utm_campaign"), p_utm_content: q.get("utm_content"),
  }).then(() => {}, () => {});
}

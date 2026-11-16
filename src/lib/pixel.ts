// Meta Pixel (navigateur), chargé UNIQUEMENT après consentement publicitaire (RGPD), sur /join et /apply.
// Dédupliqué avec la Conversions API (serveur) par event_id. Garde fbclid / _fbc / _fbp pour l'attribution.
import { fbcFromFbclid } from "@shared/pixel.ts";

declare global { interface Window { fbq?: any; _fbq?: any } }

const CONSENT_KEY = "vik_ad_consent";
const CLICK_KEY = "vik_fb_click";

const safe = <T,>(f: () => T, d: T): T => { try { return f(); } catch { return d; } };

export type Consent = "yes" | "no" | null;
export const getConsent = (): Consent => safe(() => (localStorage.getItem(CONSENT_KEY) as Consent) ?? null, null);
export function setConsent(v: "yes" | "no") {
  safe(() => localStorage.setItem(CONSENT_KEY, v), undefined);
  window.dispatchEvent(new Event("vik-consent"));
}

function cookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

/** À l'arrivée sur une page publique : garde le fbclid de l'URL (90 jours, comme Meta). */
export function captureClick(params: URLSearchParams) {
  const fbclid = params.get("fbclid");
  if (!fbclid) return;
  const fbc = fbcFromFbclid(fbclid)!;
  safe(() => localStorage.setItem(CLICK_KEY, JSON.stringify({ fbclid, fbc, at: Date.now() })), undefined);
  if (getConsent() === "yes") document.cookie = `_fbc=${encodeURIComponent(fbc)}; max-age=${90 * 86400}; path=/; SameSite=Lax`;
}

/** Attribution à joindre à la candidature (envoyée au serveur pour la Conversions API). */
export function attribution(eventId: string) {
  const click = safe(() => JSON.parse(localStorage.getItem(CLICK_KEY) ?? "null"), null) as { fbclid: string; fbc: string; at: number } | null;
  const fresh = click && Date.now() - click.at < 90 * 86400_000 ? click : null;
  const consent = getConsent() === "yes";
  return {
    consent, event_id: eventId,
    fbclid: consent ? fresh?.fbclid ?? null : null,
    fbc: consent ? cookie("_fbc") ?? fresh?.fbc ?? null : null,
    fbp: consent ? cookie("_fbp") : null,
    source_url: location.href.split("#")[0],
  };
}

export const newEventId = () => `lead-${crypto.randomUUID()}`;

let loadedId: string | null = null;
/** Charge fbevents.js et envoie PageView (une seule fois par pixel). */
export function loadPixel(pixelId: string) {
  if (loadedId === pixelId || getConsent() !== "yes") return;
  if (!window.fbq) {
    const n: any = (window.fbq = function (...args: any[]) { n.callMethod ? n.callMethod(...args) : n.queue.push(args); });
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  loadedId = pixelId;
}

/** Événement standard (ViewContent, Lead…) ; eventID partagé avec la Conversions API pour la déduplication. */
export function track(event: string, params: Record<string, unknown> = {}, eventId?: string) {
  if (!loadedId || !window.fbq) return;
  window.fbq("track", event, params, eventId ? { eventID: eventId } : undefined);
}

// Conversions API Meta (serveur) : envoi d'un événement au pixel, journalisé dans meta_events.
// Jamais de donnée personnelle en clair : email / téléphone / pays hachés en SHA-256. Jamais le token dans les logs.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { getSetting } from "./http.ts";
import { capiLeadEvent, normEmail, normPhone, type CapiLeadInput } from "./logic/pixel.ts";

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface MetaTracking { pixel_id?: string; capi_enabled?: boolean; capi_test_code?: string; api_version?: string }

export async function sendLead(db: SupabaseClient, p: {
  applicationId: string | null; eventId: string; email: string; phone: string | null; country: string | null;
  fbc: string | null; fbp: string | null; ip: string | null; userAgent: string | null; sourceUrl: string | null; testCode?: string | null;
}): Promise<{ ok: boolean; skipped?: string; events_received?: number; error?: string }> {
  const cfg = await getSetting<MetaTracking>(db, "meta");
  const token = Deno.env.get("META_ACCESS_TOKEN");
  if (!cfg.pixel_id || cfg.capi_enabled === false) return { ok: false, skipped: "capi_disabled" };
  if (!token) return { ok: false, skipped: "no_token" };
  const em = normEmail(p.email), ph = normPhone(p.phone);
  const input: CapiLeadInput = {
    eventId: p.eventId, eventTimeSec: Math.floor(Date.now() / 1000), sourceUrl: p.sourceUrl,
    emailHash: em ? await sha256(em) : null, phoneHash: ph ? await sha256(ph) : null,
    countryHash: p.country ? await sha256(p.country.toLowerCase()) : null,
    fbc: p.fbc, fbp: p.fbp, ip: p.ip, userAgent: p.userAgent,
  };
  const testCode = (p.testCode ?? cfg.capi_test_code ?? "").trim() || null;
  const body = new FormData();
  body.append("data", JSON.stringify([capiLeadEvent(input)]));
  if (testCode) body.append("test_event_code", testCode);
  let ok = false, status = 0, received: number | undefined, error: string | undefined, trace: string | undefined;
  try {
    const res = await fetch(`https://graph.facebook.com/${cfg.api_version ?? "v21.0"}/${cfg.pixel_id}/events`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` }, body, signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
    const j = await res.json().catch(() => ({}));
    ok = res.ok && !j.error;
    received = j.events_received;
    error = j.error ? String(j.error.error_user_msg ?? j.error.message).slice(0, 300) : undefined;
    trace = j.fbtrace_id ?? j.error?.fbtrace_id;
  } catch (e) {
    error = e instanceof Error ? e.message.slice(0, 300) : String(e);
  }
  await db.from("meta_events").insert({
    event_name: "Lead", event_id: p.eventId, application_id: p.applicationId, test_code: testCode, ok, status_code: status || null,
    events_received: received ?? null, error: error ?? null, fbtrace_id: trace ?? null,
  });
  if (!ok) console.error(`capi Lead ${status} ${error ?? ""}`.trim());
  return { ok, events_received: received, error };
}

/**
 * Vérification de la Conversions API sans fausse conversion : événement technique personnalisé « VikCapiCheck »
 * (pas un Lead), données utilisateur minimales hachées. OK si Meta répond events_received >= 1.
 */
export async function capiHealthCheck(db: SupabaseClient): Promise<{ ok: boolean; events_received?: number; error?: string; pixel_id?: string }> {
  const cfg = await getSetting<MetaTracking>(db, "meta");
  const token = Deno.env.get("META_ACCESS_TOKEN");
  if (!cfg.pixel_id) return { ok: false, error: "pixel_id manquant" };
  if (!token) return { ok: false, error: "META_ACCESS_TOKEN manquant" };
  const eventId = `check-${crypto.randomUUID()}`;
  const body = new FormData();
  body.append("data", JSON.stringify([{
    event_name: "VikCapiCheck", event_time: Math.floor(Date.now() / 1000), event_id: eventId, action_source: "system_generated",
    user_data: { em: [await sha256("capi-check@vik-qa.test")], client_user_agent: "vik-ugc-os capi_check" },
  }]));
  let ok = false, status = 0, received: number | undefined, error: string | undefined, trace: string | undefined;
  try {
    const res = await fetch(`https://graph.facebook.com/${cfg.api_version ?? "v21.0"}/${cfg.pixel_id}/events`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body, signal: AbortSignal.timeout(10_000) });
    status = res.status;
    const j = await res.json().catch(() => ({}));
    received = j.events_received;
    ok = res.ok && !j.error && (received ?? 0) >= 1;
    error = j.error ? String(j.error.error_user_msg ?? j.error.message).slice(0, 300) : undefined;
    trace = j.fbtrace_id ?? j.error?.fbtrace_id;
  } catch (e) { error = e instanceof Error ? e.message.slice(0, 300) : String(e); }
  await db.from("meta_events").insert({ event_name: "VikCapiCheck", event_id: eventId, ok, status_code: status || null, events_received: received ?? null, error: error ?? null, fbtrace_id: trace ?? null });
  return { ok, events_received: received, error, pixel_id: cfg.pixel_id };
}

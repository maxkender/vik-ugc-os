// apply — fonction publique de la landing.
//   GET  ?country=FR        tarifs de la zone du pays (affichage landing)
//   POST { action: "submit", ...candidature }   enregistre la candidature, email « Candidature reçue »
// La vidéo « yap » est envoyée avant par le navigateur (upload résumable TUS) dans yap-videos/pending/<uuid>.<ext>.
import { HttpError, serve } from "../_shared/http.ts";
import { queueEmail } from "../_shared/outbox.ts";
import { ageOn } from "../_shared/logic/zones.ts";
import { yapLinkProvider } from "../_shared/logic/yapVideo.ts";
import { videoDueAt } from "../_shared/logic/videoLater.ts";
import { appUrl } from "../_shared/http.ts";
import { getSetting } from "../_shared/http.ts";
import { sendLead } from "../_shared/capi.ts";
import { fbcFromFbclid, validEventId, validFbc, validFbp } from "../_shared/logic/pixel.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? Math.round(x) : null;
};

serve(async (req, body, db) => {
  if (req.method === "GET" || body.action === "pricing") {
    const country = s(body.country, 2).toUpperCase();
    const { data: c } = await db.from("countries").select("code, name, language, open, zone_code, zones(price_per_video, rpm, rpm_views, currency, videos_per_day)").eq("code", country).maybeSingle();
    // Pixel Meta (public) : la landing et le formulaire le chargent seulement après consentement.
    const meta = await getSetting<{ pixel_id?: string; tracking_enabled?: boolean }>(db, "meta");
    return { ok: true, country: c ?? null, tracking: meta.tracking_enabled !== false && meta.pixel_id ? { pixel_id: meta.pixel_id } : null };
  }
  // Journal des échecs d'upload (public, champs bornés) : visible dans Admin → Candidats.
  if (body.action === "upload_failure") {
    const t = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : null);
    await db.from("upload_failures").insert({
      context: "yap", file_size: Number.isFinite(Number(body.size)) ? Math.max(0, Math.round(Number(body.size))) : null,
      mime: t(body.mime, 80), file_ext: t(body.ext, 12), error: t(body.error, 300),
      user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300), country: t(body.country, 2),
    });
    return { ok: true };
  }
  if (body.action === "video_info") {
    const a = await videoByToken(db, body.token);
    const expired = a.status !== "video_pending" || new Date(a.video_due_at).getTime() < Date.now();
    return { ok: true, first_name: a.first_name, country: a.country, locale: a.locale, due_at: a.video_due_at, expired };
  }
  if (body.action === "video_submit") {
    const a = await videoByToken(db, body.token);
    if (a.status !== "video_pending" || new Date(a.video_due_at).getTime() < Date.now()) throw new HttpError(410, "video_token_expired");
    const yap = s(body.yap_video_path, 300), yapUrl = s(body.yap_video_url, 500);
    const hasFile = /^pending\/[0-9a-f-]{36}\.(mp4|mov|webm|m4v)$/i.test(yap);
    if (!hasFile && !(yapUrl && yapLinkProvider(yapUrl))) throw new HttpError(422, yapUrl ? "yap_video_url" : "yap_video");
    if (hasFile) {
      const [folder, file] = yap.split("/");
      const { data: listed } = await db.storage.from("yap-videos").list(folder, { search: file, limit: 1 });
      if (!listed?.length) throw new HttpError(422, "yap_video_missing");
    }
    // La candidature entre dans la file normale ; le jeton est consommé (usage unique).
    await db.from("applications").update({ status: "new", yap_video_path: hasFile ? yap : null, yap_video_url: hasFile ? null : yapUrl,
      video_received_at: new Date().toISOString(), video_token: null }).eq("id", a.id).eq("status", "video_pending");
    await db.from("funnel_events").insert({ event: "video_added", country: a.country, lang: a.locale });
    return { ok: true };
  }
  if (body.action !== "submit") throw new HttpError(400, "unknown action");

  // Pot de miel anti-bot
  if (s(body.website)) return { ok: true };
  const first_name = s(body.first_name, 80), last_name = s(body.last_name, 80), email = s(body.email, 200).toLowerCase();
  const birthdate = s(body.birthdate, 10), country = s(body.country, 2).toUpperCase();
  const errors: string[] = [];
  if (!first_name) errors.push("first_name");
  if (!last_name) errors.push("last_name");
  if (!EMAIL_RE.test(email)) errors.push("email");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) errors.push("birthdate");
  else if (ageOn(birthdate) < 18) errors.push("underage");
  if (body.adult !== true) errors.push("adult");
  if (body.consent !== true) errors.push("consent");
  if (body.has_iphone !== true) errors.push("iphone_required"); // iPhone requis (16/11)
  // Vidéo : fichier envoyé OU lien de secours (YouTube, Instagram, TikTok, Drive, Dropbox, WeTransfer, iCloud).
  const yap = s(body.yap_video_path, 300);
  const yapUrl = s(body.yap_video_url, 500);
  const hasFile = /^pending\/[0-9a-f-]{36}\.(mp4|mov|webm|m4v)$/i.test(yap);
  // « Je l'enverrai plus tard » (17/11) : la vidéo devient facultative, 3 jours pour l'ajouter via un lien personnel.
  const videoLater = body.video_later === true && !hasFile && !yapUrl;
  if (!videoLater && !hasFile && !(yapUrl && yapLinkProvider(yapUrl))) errors.push(yapUrl ? "yap_video_url" : "yap_video");
  const { data: c } = await db.from("countries").select("code, open, language").eq("code", country).maybeSingle();
  if (!c) errors.push("country");
  else if (!c.open) errors.push("country_closed");
  if (errors.length) throw new HttpError(422, errors.join(","));

  // Un fichier annoncé doit exister dans Storage.
  if (hasFile) {
    const [folder, file] = yap.split("/");
    const { data: listed } = await db.storage.from("yap-videos").list(folder, { search: file, limit: 1 });
    if (!listed?.length) throw new HttpError(422, "yap_video_missing");
  }

  const row = {
    first_name, last_name, email, birthdate, country, has_iphone: true,
    phone: s(body.phone, 40) || null,
    languages: Array.isArray(body.languages) ? body.languages.map((l: unknown) => s(l, 10)).filter(Boolean).slice(0, 10) : [],
    ugc_experience: s(body.ugc_experience, 2000) || null,
    tiktok_url: s(body.tiktok_url, 300) || null,
    tiktok_followers: n(body.tiktok_followers),
    instagram_url: s(body.instagram_url, 300) || null,
    instagram_followers: n(body.instagram_followers),
    equipment: s(body.equipment, 1000) || null,
    availability: s(body.availability, 1000) || null,
    motivation: s(body.motivation, 2000) || null,
    yap_video_path: hasFile ? yap : null,
    yap_video_url: hasFile || videoLater ? null : yapUrl,
    ...(videoLater ? { status: "video_pending", video_token: crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, ""),
      video_due_at: videoDueAt().toISOString(), video_pending_since: new Date().toISOString() } : { video_received_at: new Date().toISOString() }),
    locale: s(body.locale, 10) || c!.language || "en",
    utm: typeof body.utm === "object" && body.utm ? Object.fromEntries(Object.entries(body.utm).slice(0, 10).map(([k, v]) => [s(k, 40), s(v, 200)])) : {},
    attribution: attributionOf(body.tracking),
  };
  const { data, error } = await db.from("applications").insert(row).select("id, video_token, video_due_at").single();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "already_applied");
    throw error;
  }
  if (videoLater) {
    // Un seul email : « candidature reçue, il manque ta vidéo (3 jours) » avec le lien personnel ; pas d'« application_received » en double.
    await queueEmail(db, { template: "video_missing", to: email, language: row.locale, vars: { first_name, due_date: fmtDate(data.video_due_at, row.locale) },
      buttonUrl: appUrl(`/apply/video/${data.video_token}`), relatedType: "application", relatedId: data.id });
  } else {
    await queueEmail(db, { template: "application_received", to: email, language: row.locale, vars: { first_name }, relatedType: "application", relatedId: data.id });
  }
  // Conversions API : Lead côté serveur, dédupliqué avec le pixel par event_id. Seulement avec le consentement publicitaire.
  const a = row.attribution as Record<string, any>;
  // Jamais pour un compte de test (@vik-qa.test) : ce serait une fausse conversion sur le pixel.
  if (a.consent === true && a.event_id && !email.endsWith("@vik-qa.test")) {
    await sendLead(db, {
      applicationId: data.id, eventId: a.event_id, email, phone: row.phone, country,
      fbc: a.fbc ?? null, fbp: a.fbp ?? null,
      ip: (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null,
      userAgent: s(req.headers.get("user-agent"), 400) || null, sourceUrl: a.source_url ?? null,
    }).catch((e) => console.error("capi", e instanceof Error ? e.message : String(e)));
  }
  return { ok: true, id: data.id, video_pending: videoLater };
});

function fmtDate(iso: string, locale: string): string {
  try { return new Intl.DateTimeFormat(locale || "en", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso)); }
  catch { return iso.slice(0, 16).replace("T", " "); }
}

/** Page /apply/video/<token> : infos minimales, puis ajout de la vidéo (fichier ou lien). Jeton à usage unique, valable jusqu'à J+3. */
async function videoByToken(db: any, token: unknown) {
  const t = typeof token === "string" && /^[0-9a-f]{64}$/.test(token) ? token : null;
  if (!t) throw new HttpError(404, "video_token_invalid");
  const { data } = await db.from("applications").select("id, first_name, country, locale, status, video_due_at").eq("video_token", t).maybeSingle();
  if (!data) throw new HttpError(404, "video_token_invalid");
  return data;
}

/** Attribution envoyée par le navigateur (consentement, fbclid, _fbc, _fbp, event_id), validée. */
function attributionOf(t: any): Record<string, unknown> {
  if (!t || typeof t !== "object") return {};
  const fbclid = s(t.fbclid, 500) || null;
  const fbc = validFbc(t.fbc) ?? (fbclid ? fbcFromFbclid(fbclid) : null);
  const url = s(t.source_url, 500);
  return {
    consent: t.consent === true,
    event_id: validEventId(t.event_id),
    fbclid, fbc, fbp: validFbp(t.fbp),
    source_url: /^https:\/\//.test(url) ? url : null,
  };
}

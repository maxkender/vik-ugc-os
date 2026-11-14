// apply — fonction publique de la landing.
//   GET  ?country=FR        tarifs de la zone du pays (affichage landing)
//   POST { action: "submit", ...candidature }   enregistre la candidature, email « Candidature reçue »
// La vidéo « yap » est envoyée avant par le navigateur (upload résumable TUS) dans yap-videos/pending/<uuid>.<ext>.
import { HttpError, serve } from "../_shared/http.ts";
import { queueEmail } from "../_shared/outbox.ts";
import { ageOn } from "../_shared/logic/zones.ts";

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
    return { ok: true, country: c ?? null };
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
  const yap = s(body.yap_video_path, 300);
  if (!/^pending\/[0-9a-f-]{36}\.(mp4|mov|webm|m4v)$/i.test(yap)) errors.push("yap_video");
  const { data: c } = await db.from("countries").select("code, open, language").eq("code", country).maybeSingle();
  if (!c) errors.push("country");
  else if (!c.open) errors.push("country_closed");
  if (errors.length) throw new HttpError(422, errors.join(","));

  // La vidéo doit exister dans Storage.
  const [folder, file] = yap.split("/");
  const { data: listed } = await db.storage.from("yap-videos").list(folder, { search: file, limit: 1 });
  if (!listed?.length) throw new HttpError(422, "yap_video_missing");

  const row = {
    first_name, last_name, email, birthdate, country,
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
    yap_video_path: yap,
    locale: s(body.locale, 10) || c!.language || "en",
    utm: typeof body.utm === "object" && body.utm ? Object.fromEntries(Object.entries(body.utm).slice(0, 10).map(([k, v]) => [s(k, 40), s(v, 200)])) : {},
  };
  const { data, error } = await db.from("applications").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") throw new HttpError(409, "already_applied");
    throw error;
  }
  await queueEmail(db, { template: "application_received", to: email, language: row.locale, vars: { first_name }, relatedType: "application", relatedId: data.id });
  return { ok: true, id: data.id };
});

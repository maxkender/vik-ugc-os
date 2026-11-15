// handles — l'étape « Ton compte » du créateur. On ne crée JAMAIS de compte TikTok / Instagram
// (interdit par leurs CGU, impossible par API) : on propose des handles libres, la bio et le nom,
// puis on vérifie les comptes que le créateur a créés lui-même.
//   suggest { poster_id? }      posteur (le sien) / admin : ~10 candidats → 3 disponibles (TikTok + IG)
//   verify { poster_id? }       posteur / admin : les comptes existent-ils, la bio cite-t-elle l'app ?
//   verify_pending              cron / admin : tous les posteurs « submitted » (20 max)
//   check { handle }            admin / cron : sonde de disponibilité (diagnostic)
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { caller, HttpError, serve, type Caller } from "../_shared/http.ts";
import {
  bioFor, bioMentionsApp, displayNameFor, generateHandles, parseTikTokProfileHtml, pickSuggestions, type Availability,
} from "../_shared/logic/handles.ts";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

interface Probe { status: Availability; bio: string | null; via: string }

async function probeTikTok(h: string): Promise<Probe> {
  try {
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(h)}?lang=en`, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" }, signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 404) return { status: "available", bio: null, via: "web" };
    if (res.status !== 200) return { status: "unknown", bio: null, via: `web ${res.status}` };
    const p = parseTikTokProfileHtml(await res.text(), h);
    return { status: p.exists === true ? "taken" : p.exists === false ? "available" : "unknown", bio: p.bio, via: "web" };
  } catch {
    return { status: "unknown", bio: null, via: "web error" };
  }
}

async function probeInstagram(h: string): Promise<Probe> {
  try {
    const res = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(h)}`, {
      headers: { "User-Agent": UA, "x-ig-app-id": "936619743392459", Accept: "application/json" }, signal: AbortSignal.timeout(10_000),
    });
    // Vérifié le 15/11 : depuis Supabase, Instagram répond 404 même pour @instagram → un 404 ne prouve rien.
    if (res.status !== 200) return { status: "unknown", bio: null, via: `web ${res.status}` };
    const j = await res.json().catch(() => null);
    if (j?.data?.user) return { status: "taken", bio: j.data.user.biography ?? null, via: "web" };
    if (j?.data && j.data.user === null) return { status: "available", bio: null, via: "web" };
    return { status: "unknown", bio: null, via: "web ambiguous" };
  } catch {
    return { status: "unknown", bio: null, via: "web error" };
  }
}

/** Secours : petit run Apify synchrone (≈ 0,005 $), pour la vérification seulement. */
async function apifyProfile(platform: "tiktok" | "instagram", h: string): Promise<Probe> {
  const token = Deno.env.get("APIFY_TOKEN");
  if (!token) return { status: "unknown", bio: null, via: "apify missing" };
  const actor = platform === "tiktok" ? "clockworks~tiktok-scraper" : "apify~instagram-scraper";
  const input = platform === "tiktok"
    ? { profiles: [h], resultsPerPage: 1, profileScrapeSections: ["videos"], shouldDownloadVideos: false, shouldDownloadCovers: false }
    : { directUrls: [`https://www.instagram.com/${h}/`], resultsType: "details", resultsLimit: 1 };
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?timeout=60&maxItems=1&maxTotalChargeUsd=0.5`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(input),
      signal: AbortSignal.timeout(75_000),
    });
    if (!res.ok) return { status: "unknown", bio: null, via: `apify ${res.status}` };
    const items = await res.json();
    const x = Array.isArray(items) ? items[0] : null;
    if (!x || x.error || x.errorDescription) return { status: "available", bio: null, via: "apify" };
    const bio = platform === "tiktok" ? (x.authorMeta?.signature ?? null) : (x.biography ?? null);
    const handle = platform === "tiktok" ? x.authorMeta?.name : x.username;
    if (handle && String(handle).toLowerCase() !== h.toLowerCase()) return { status: "unknown", bio: null, via: "apify mismatch" };
    return { status: "taken", bio, via: "apify" };
  } catch {
    return { status: "unknown", bio: null, via: "apify error" };
  }
}

async function loadPoster(db: SupabaseClient, c: Caller, posterId: unknown) {
  let id: string | null = null;
  if (c.kind === "user" && c.role === "poster") id = c.id;
  else if (c.kind === "cron" || (c.kind === "user" && ["admin", "recruiter", "controller"].includes(c.role))) id = typeof posterId === "string" ? posterId : null;
  else throw new HttpError(401, "auth required");
  if (!id && c.kind === "user") id = c.id; // un admin qui teste son propre espace créateur
  const { data: p } = await db.from("posters").select("*, profiles(full_name)").eq("id", id).maybeSingle();
  if (!p) throw new HttpError(404, "poster not found");
  const { data: application } = p.application_id
    ? await db.from("applications").select("first_name, last_name").eq("id", p.application_id).maybeSingle()
    : { data: null };
  const { data: app } = p.app_id
    ? await db.from("apps").select("*").eq("id", p.app_id).maybeSingle()
    : await db.from("apps").select("*").eq("active", true).order("created_at").limit(1).maybeSingle();
  if (!app) throw new HttpError(404, "app not found");
  const full = String(p.profiles?.full_name ?? p.display_name ?? "").trim();
  const first = application?.first_name ?? full.split(/\s+/)[0] ?? "creator";
  const last = application?.last_name ?? full.split(/\s+/).slice(1).join(" ");
  return { p, app, ctx: { app: app.name as string, first: String(first), last: String(last ?? "") } };
}

async function suggest(db: SupabaseClient, c: Caller, body: any) {
  const { p, app, ctx } = await loadPoster(db, c, body.poster_id);
  const candidates = generateHandles(app.handle_patterns ?? [], ctx, 10, Math.floor(Math.random() * 8));
  const checks = await Promise.all(candidates.map(async (handle) => {
    const [tt, ig] = await Promise.all([probeTikTok(handle), probeInstagram(handle)]);
    return { handle, tiktok: tt.status, instagram: ig.status };
  }));
  const picked = pickSuggestions(checks, 3);
  await db.from("posters").update({
    handle_suggestions: picked,
    ...(p.handles_status === "none" ? { handles_status: "proposed" } : {}),
  }).eq("id", p.id);
  return {
    ok: true, suggestions: picked, checked: checks,
    display_name: displayNameFor(app.display_name_pattern, ctx),
    bio: bioFor(app.bio_templates, p.language, ctx),
    link_in_bio: app.link_in_bio ?? null, photo_tips: app.profile_photo_tips ?? null, app_name: app.name,
  };
}

async function verifyOne(db: SupabaseClient, p: any, appName: string) {
  const report: Record<string, { handle: string | null; exists: boolean | null; bio_ok: boolean; bio: string | null; via: string }> = {};
  for (const platform of ["tiktok", "instagram"] as const) {
    const h = platform === "tiktok" ? p.tiktok_handle : p.instagram_handle;
    if (!h) { report[platform] = { handle: null, exists: null, bio_ok: false, bio: null, via: "none" }; continue; }
    let probe = platform === "tiktok" ? await probeTikTok(h) : await probeInstagram(h);
    // Compte trouvé mais bio illisible, ou réponse ambiguë : on confirme avec Apify.
    if (probe.status === "unknown" || (probe.status === "taken" && probe.bio === null)) probe = await apifyProfile(platform, h);
    report[platform] = {
      handle: h, exists: probe.status === "taken" ? true : probe.status === "available" ? false : null,
      bio_ok: bioMentionsApp(probe.bio, appName), bio: probe.bio, via: probe.via,
    };
  }
  const tt = report.tiktok;
  const ig = report.instagram;
  // TikTok obligatoire ; Instagram vérifié s'il est renseigné.
  const ok = tt.exists === true && tt.bio_ok && (!ig.handle || (ig.exists === true && ig.bio_ok));
  const status = ok ? "verified" : "failed";
  await db.from("posters").update({ handles_status: status, handles_report: report, handles_checked_at: new Date().toISOString() }).eq("id", p.id);
  return { status, report };
}

serve(async (req, body, db) => {
  const c = await caller(req, db);
  switch (body.action) {
    case "suggest":
      return await suggest(db, c, body);
    case "verify": {
      const { p, app } = await loadPoster(db, c, body.poster_id);
      if (!p.tiktok_handle && !p.instagram_handle) throw new HttpError(409, "no_handles");
      return { ok: true, ...(await verifyOne(db, p, app.name)) };
    }
    case "verify_pending": {
      if (!(c.kind === "cron" || (c.kind === "user" && c.role === "admin"))) throw new HttpError(403, "admin_only");
      const { data: rows } = await db.from("posters").select("*, apps:app_id(name)").eq("handles_status", "submitted").limit(20);
      const out = [];
      for (const p of rows ?? []) out.push({ poster_id: p.id, ...(await verifyOne(db, p, p.apps?.name ?? "Micabo")) });
      return { ok: true, verified: out.filter((x) => x.status === "verified").length, results: out };
    }
    case "check": {
      if (!(c.kind === "cron" || (c.kind === "user" && c.role === "admin"))) throw new HttpError(403, "admin_only");
      const h = String(body.handle ?? "").toLowerCase().replace(/^@/, "");
      const [tt, ig] = await Promise.all([probeTikTok(h), probeInstagram(h)]);
      return { ok: true, handle: h, tiktok: tt, instagram: ig, ...(body.apify ? { tiktok_apify: await apifyProfile("tiktok", h) } : {}) };
    }
    default:
      throw new HttpError(400, "unknown action");
  }
});

// collect — agents de collecte Apify (TikTok, Instagram, Facebook Ad Library),
// relevé des vues des vidéos postées (J+2 / J+7) et archivage MP4 à la demande.
//
// Actions (POST { action, ... }) :
//   run_source { source_id }                       admin — lance un run sur une source
//   run_adhoc { platform, kind, value, max_results, app_id? }   admin — « collecter à la demande »
//   run_due                                         cron  — sources activées arrivées à échéance (si collect_cron_enabled)
//   poll                                            cron/admin — suit les runs en cours et ingère les résultats
//   measure_due                                     cron  — lance les relevés de vues J+2 / J+7
//   store_video { video_id }                        staff — archive le MP4 dans Storage (favori / brief)
//   rescore { after_id? }                           cron  — recalcule les scores (l'âge fait baisser la vélocité)
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { caller, getSetting, HttpError, requireAdmin, requireStaff, serve, userId } from "../_shared/http.ts";
import { abortRun, datasetItems, getRun, startRun } from "../_shared/apify.ts";
import {
  buildActorInput, buildViewsInput, capResults, maxChargeUsd, estimateCostUsd, type SourceSpec,
} from "../_shared/logic/apifyInput.ts";
import { normalizeItem, type VideoRow } from "../_shared/logic/normalize.ts";
import { heuristicClassify, type CategoryDef } from "../_shared/logic/categorize.ts";
import { performanceScore } from "../_shared/logic/score.ts";
import { attributeVideo, derivedMetrics, type CompetitorTerms } from "../_shared/logic/attribution.ts";
import { viewsCheckpoint } from "../_shared/logic/reminders.ts";

interface ApifySettings {
  hard_cap_per_run: number;
  default_max_results: number;
  monthly_budget_usd: number;
  daily_budget_usd: number;
  backfill_budget_usd: number;
  collect_cron_enabled: boolean;
  views_cron_enabled: boolean;
  actors: Record<string, string>;
}

async function apifySettings(db: SupabaseClient): Promise<ApifySettings> {
  const s = await getSetting<Partial<ApifySettings>>(db, "apify");
  return {
    hard_cap_per_run: s.hard_cap_per_run ?? 200,
    default_max_results: s.default_max_results ?? 30,
    monthly_budget_usd: s.monthly_budget_usd ?? 300,
    daily_budget_usd: s.daily_budget_usd ?? 30,
    backfill_budget_usd: s.backfill_budget_usd ?? 50,
    collect_cron_enabled: s.collect_cron_enabled ?? false,
    views_cron_enabled: s.views_cron_enabled ?? true,
    actors: { tiktok: "clockworks~tiktok-scraper", instagram: "apify~instagram-scraper", facebook_ads: "apify~facebook-ads-scraper", ...(s.actors ?? {}) },
  };
}

/** Dépense Apify depuis une date (runs terminés : coût réel ; en cours : estimation). */
async function spendSince(db: SupabaseClient, since: Date): Promise<number> {
  const { data } = await db.from("agent_runs").select("cost_usd, status, params").gte("started_at", since.toISOString());
  return (data ?? []).reduce((s, r) => s + Number(r.cost_usd ?? (["running", "queued"].includes(r.status) ? r.params?.estimated_cost_usd ?? 0 : 0)), 0);
}
async function budgetCheck(db: SupabaseClient, cfg: ApifySettings, est: number, trigger: string) {
  const day = new Date(); day.setUTCHours(0, 0, 0, 0);
  const month = new Date(day); month.setUTCDate(1);
  const [d, m] = await Promise.all([spendSince(db, day), spendSince(db, month)]);
  // Le backfill a son propre plafond (journée du backfill), sinon plafond quotidien.
  const dayCap = trigger === "backfill" ? Math.max(cfg.daily_budget_usd, cfg.backfill_budget_usd) : cfg.daily_budget_usd;
  if (d + est > dayCap) throw new HttpError(402, `Plafond Apify du jour atteint (${d.toFixed(2)} $ / ${dayCap} $)`);
  if (m + est > cfg.monthly_budget_usd) throw new HttpError(402, `Budget Apify du mois atteint (${m.toFixed(2)} $ / ${cfg.monthly_budget_usd} $)`);
}

async function launch(
  db: SupabaseClient,
  cfg: ApifySettings,
  spec: SourceSpec,
  meta: { source_id?: string | null; app_id?: string | null; competitor_id?: string | null; trigger: string; created_by: string | null },
) {
  const n = capResults(spec.max_results || cfg.default_max_results, cfg.hard_cap_per_run);
  const est = estimateCostUsd(spec.platform, n);
  await budgetCheck(db, cfg, est, meta.trigger);
  const input = buildActorInput({ ...spec, max_results: n }, cfg.hard_cap_per_run);
  const actor = cfg.actors[spec.platform];
  const { data: run, error } = await db.from("agent_runs").insert({
    source_id: meta.source_id ?? null, app_id: meta.app_id ?? null, agent: spec.platform, trigger: meta.trigger,
    params: { spec, input, max_results: n, estimated_cost_usd: est, competitor_id: meta.competitor_id ?? null },
    apify_actor: actor, status: "queued", created_by: meta.created_by,
  }).select("id").single();
  if (error) throw error;
  try {
    const r = await startRun(actor, input, { maxItems: n, maxChargeUsd: maxChargeUsd(spec.platform, n) });
    await db.from("agent_runs").update({ apify_run_id: r.id, apify_dataset_id: r.defaultDatasetId, status: "running" }).eq("id", run.id);
  } catch (e) {
    await db.from("agent_runs").update({ status: "failed", error: String(e).slice(0, 500), finished_at: new Date().toISOString() }).eq("id", run.id);
    throw e;
  }
  if (meta.source_id) {
    const { data: src } = await db.from("sources").select("frequency_hours").eq("id", meta.source_id).single();
    await db.from("sources").update({
      last_run_at: new Date().toISOString(),
      next_run_at: new Date(Date.now() + (src?.frequency_hours ?? 24) * 3600_000).toISOString(),
    }).eq("id", meta.source_id);
  }
  return { run_id: run.id, max_results: n, estimated_cost_usd: est };
}

// ───────────────────────── Ingestion ─────────────────────────

async function storeThumbnail(db: SupabaseClient, v: VideoRow): Promise<string | null> {
  if (!v.thumbnail_src) return null;
  try {
    const res = await fetch(v.thumbnail_src, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!/^image\//.test(type)) return null;
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const path = `${v.platform}/${v.external_id}.${ext}`;
    const { error } = await db.storage.from("thumbnails").upload(path, await res.arrayBuffer(), { contentType: type, upsert: true });
    return error ? null : path;
  } catch {
    return null;
  }
}

async function ingestVideos(db: SupabaseClient, run: any, items: any[]) {
  const now = new Date();
  const platform = run.agent as VideoRow["platform"];
  const rows = items.map((x) => normalizeItem(platform, x, now)).filter((r): r is VideoRow => !!r);
  if (rows.length === 0) return { found: items.length, created: 0 };
  const { data: cats } = await db.from("categories").select("id, slug, keywords");
  const { data: comps } = await db.from("competitors").select("id, name, brand_terms, official_handles").eq("active", true);
  const ids = rows.map((r) => r.external_id);
  const { data: existing } = await db.from("videos").select("id, external_id, category_id, category_auto, thumbnail_path, app_id, competitor_id, source_id")
    .eq("platform", platform).in("external_id", ids);
  const byExt = new Map((existing ?? []).map((e) => [e.external_id, e]));
  let created = 0;
  const upserts: any[] = [];
  const metrics: any[] = [];
  // Miniatures en parallèle (lots de 10) : une boucle séquentielle dépassait la durée max d'une edge function.
  const thumbs = new Map<string, string | null>();
  const need = rows.filter((r) => !byExt.get(r.external_id)?.thumbnail_path);
  for (let i = 0; i < need.length; i += 10) {
    const batch = need.slice(i, i + 10);
    const paths = await Promise.all(batch.map((r) => storeThumbnail(db, r)));
    batch.forEach((r, j) => thumbs.set(r.external_id, paths[j]));
  }
  for (const r of rows) {
    const prev = byExt.get(r.external_id);
    const cls = heuristicClassify({ caption: r.caption, hashtags: r.hashtags, duration_s: r.duration_s, is_ad: r.is_ad, raw_type: r.raw_type }, (cats ?? []) as CategoryDef[]);
    const keepCat = prev && prev.category_auto === false;
    const thumb = prev?.thumbnail_path ?? thumbs.get(r.external_id) ?? null;
    const { raw_type: _rt, ...cols } = r;
    const attr = attributeVideo(r, (comps ?? []) as CompetitorTerms[], run.params?.competitor_id ?? null);
    upserts.push({
      ...cols,
      ...derivedMetrics(r, now),
      origin: attr.origin,
      thumbnail_path: thumb,
      app_id: prev?.app_id ?? run.app_id ?? null,
      competitor_id: prev?.competitor_id ?? attr.competitor_id,
      source_id: prev?.source_id ?? run.source_id ?? null,
      category_id: keepCat ? prev!.category_id : cls.category_id ?? prev?.category_id ?? null,
      category_auto: keepCat ? false : true,
      score: performanceScore({ views: r.views, likes: r.likes, comments: r.comments, shares: r.shares, followers: r.author_followers, publishedAt: r.published_at, isAd: r.is_ad, adDays: r.ad_days, adActive: r.ad_active }, now),
      raw: null,
    });
    if (!prev) created++;
  }
  const { data: saved, error } = await db.from("videos").upsert(upserts, { onConflict: "platform,external_id" }).select("id, views, likes, comments, shares, is_ad");
  if (error) throw error;
  for (const s of saved ?? []) if (!s.is_ad && s.views !== null) metrics.push({ video_id: s.id, views: s.views, likes: s.likes, comments: s.comments, shares: s.shares });
  if (metrics.length) await db.from("video_metrics").insert(metrics);
  return { found: items.length, created };
}

/** Relevé de vues : retrouve chaque assignation par l'id de la vidéo dans l'URL. */
function videoIdFromUrl(url: string): string | null {
  const tt = url.match(/\/video\/(\d+)/) ?? url.match(/\/photo\/(\d+)/);
  if (tt) return tt[1];
  const ig = url.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return ig ? ig[1] : null;
}

async function ingestViews(db: SupabaseClient, run: any, items: any[]) {
  const targets: Array<{ id: string; checkpoint: "d2" | "d7"; url: string }> = run.params?.targets ?? [];
  let updated = 0;
  for (const t of targets) {
    const key = videoIdFromUrl(t.url);
    const hit = items.find((x) => {
      const ids = [String(x.id ?? ""), String(x.shortCode ?? ""), String(x.webVideoUrl ?? ""), String(x.url ?? ""), String(x.inputUrl ?? ""), String(x.submittedVideoUrl ?? "")];
      return (key && ids.some((s) => s === key || s.includes(key))) || ids.includes(t.url);
    });
    if (!hit) continue;
    const views = Number(hit.playCount ?? hit.videoPlayCount ?? hit.videoViewCount ?? NaN);
    if (!Number.isFinite(views)) continue;
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { last_views: views };
    if (t.checkpoint === "d2") Object.assign(patch, { views_d2: views, views_d2_at: now });
    else Object.assign(patch, { views_d7: views, views_d7_at: now });
    await db.from("brief_assignments").update(patch).eq("id", t.id);
    updated++;
  }
  return { found: items.length, created: updated };
}

async function ingestDownload(db: SupabaseClient, run: any, items: any[]) {
  const videoId = run.params?.video_id;
  const x = items[0];
  const url = x?.mediaUrls?.[0] ?? x?.videoUrl ?? x?.videoMeta?.downloadAddr;
  if (!videoId || !url) throw new Error("no media url in download run");
  const path = await uploadMp4(db, videoId, url);
  return { found: items.length, created: path ? 1 : 0 };
}

async function uploadMp4(db: SupabaseClient, videoId: string, url: string): Promise<string | null> {
  // Les MP4 téléchargés par l'acteur sont dans un key-value store Apify privé : il faut le token.
  const headers: Record<string, string> = /^https:\/\/api\.apify\.com\//.test(url) ? { Authorization: `Bearer ${Deno.env.get("APIFY_TOKEN") ?? ""}` } : {};
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const type = res.headers.get("content-type") ?? "video/mp4";
  if (!/video|octet-stream/.test(type)) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength > 200 * 1024 * 1024) throw new Error("video too large");
  const path = `${videoId}.mp4`;
  const { error } = await db.storage.from("reference-videos").upload(path, buf, { contentType: "video/mp4", upsert: true });
  if (error) throw error;
  await db.from("videos").update({ video_path: path }).eq("id", videoId);
  return path;
}

async function poll(db: SupabaseClient) {
  const { data: runs } = await db.from("agent_runs").select("*").eq("status", "running").not("apify_run_id", "is", null).order("started_at").limit(5);
  const out: any[] = [];
  for (const run of runs ?? []) {
    try {
      const r = await getRun(run.apify_run_id);
      if (r.status === "RUNNING" || r.status === "READY") {
        if (Date.now() - new Date(run.started_at).getTime() > 2 * 3600_000) {
          await abortRun(run.apify_run_id);
          await db.from("agent_runs").update({ status: "aborted", error: "timeout 2h", finished_at: new Date().toISOString() }).eq("id", run.id);
        }
        continue;
      }
      const cost = r.usageTotalUsd ?? null;
      if (r.status !== "SUCCEEDED") {
        await db.from("agent_runs").update({ status: "failed", error: `${r.status} ${r.statusMessage ?? ""}`.slice(0, 500), cost_usd: cost, finished_at: new Date().toISOString() }).eq("id", run.id);
        continue;
      }
      const items = await datasetItems(r.defaultDatasetId, Math.max(50, (run.params?.max_results ?? 200) * 2));
      const res = run.agent === "views" ? await ingestViews(db, run, items)
        : run.agent === "download" ? await ingestDownload(db, run, items)
        : await ingestVideos(db, run, items);
      await db.from("agent_runs").update({ status: "succeeded", items_found: res.found, items_new: res.created, cost_usd: cost, finished_at: new Date().toISOString() }).eq("id", run.id);
      out.push({ run: run.id, ...res });
    } catch (e) {
      await db.from("agent_runs").update({ status: "failed", error: String(e).slice(0, 500), finished_at: new Date().toISOString() }).eq("id", run.id);
    }
  }
  return { ok: true, processed: out };
}

async function measureDue(db: SupabaseClient, cfg: ApifySettings, force = false) {
  if (!cfg.views_cron_enabled && !force) return { ok: true, skipped: "views_cron_disabled" };
  const since = new Date(Date.now() - 10 * 86_400_000).toISOString();
  const { data: rows } = await db.from("brief_assignments").select("id, posted_url, posted_at, views_d2_at, views_d7_at")
    .not("posted_url", "is", null).gte("posted_at", since).neq("status", "rejected").limit(cfg.hard_cap_per_run);
  const now = new Date();
  const targets = (rows ?? []).map((a) => ({ id: a.id, url: a.posted_url as string, checkpoint: viewsCheckpoint(a, now) }))
    .filter((t): t is { id: string; url: string; checkpoint: "d2" | "d7" } => !!t.checkpoint);
  if (targets.length === 0) return { ok: true, targets: 0 };
  const inputs = buildViewsInput(targets.map((t) => t.url));
  const runs: string[] = [];
  for (const [platform, input] of [["tiktok", inputs.tiktok], ["instagram", inputs.instagram]] as const) {
    if (!input) continue;
    const mine = targets.filter((t) => (platform === "tiktok" ? /tiktok\.com/i : /instagram\.com/i).test(t.url));
    const n = mine.length;
    const { data: run } = await db.from("agent_runs").insert({
      agent: "views", trigger: "cron", apify_actor: cfg.actors[platform], status: "queued",
      params: { targets: mine, max_results: n, estimated_cost_usd: estimateCostUsd("views", n) },
    }).select("id").single();
    try {
      const r = await startRun(cfg.actors[platform], input, { maxItems: n, maxChargeUsd: maxChargeUsd("views", n) });
      await db.from("agent_runs").update({ apify_run_id: r.id, apify_dataset_id: r.defaultDatasetId, status: "running" }).eq("id", run!.id);
      runs.push(run!.id);
    } catch (e) {
      await db.from("agent_runs").update({ status: "failed", error: String(e).slice(0, 500), finished_at: new Date().toISOString() }).eq("id", run!.id);
    }
  }
  return { ok: true, targets: targets.length, runs };
}

async function storeVideo(db: SupabaseClient, cfg: ApifySettings, videoId: string, by: string | null) {
  const { data: v } = await db.from("videos").select("id, platform, url, video_src, video_path").eq("id", videoId).single();
  if (!v) throw new HttpError(404, "video not found");
  if (v.video_path) return { ok: true, video_path: v.video_path, cached: true };
  // 1) l'URL du CDN connue (souvent encore valide pour FB / IG)
  if (v.video_src) {
    try {
      const p = await uploadMp4(db, v.id, v.video_src);
      if (p) return { ok: true, video_path: p };
    } catch { /* URL expirée : on repasse par Apify */ }
  }
  if (v.platform === "facebook_ads" || !v.url) throw new HttpError(409, "Lien vidéo expiré : relancer la collecte de cette source");
  // 2) re-scrape de la vidéo seule, avec téléchargement par l'acteur
  const input = v.platform === "tiktok"
    ? { postURLs: [v.url], shouldDownloadVideos: true, resultsPerPage: 1 }
    : { directUrls: [v.url], resultsType: "posts", resultsLimit: 1 };
  const { data: run } = await db.from("agent_runs").insert({
    agent: "download", trigger: "manual", apify_actor: cfg.actors[v.platform], status: "queued", created_by: by,
    params: { video_id: v.id, max_results: 1, estimated_cost_usd: 0.01 },
  }).select("id").single();
  const r = await startRun(cfg.actors[v.platform], input, { maxItems: 1, maxChargeUsd: 0.5 });
  await db.from("agent_runs").update({ apify_run_id: r.id, apify_dataset_id: r.defaultDatasetId, status: "running" }).eq("id", run!.id);
  return { ok: true, pending: true, run_id: run!.id };
}

async function rescore(db: SupabaseClient, afterId: string | null) {
  let q = db.from("videos").select("id, views, likes, comments, shares, author_followers, published_at, is_ad, ad_days, ad_active, ad_started_at, ad_ended_at")
    .order("id").limit(1000);
  if (afterId) q = q.gt("id", afterId);
  const { data } = await q;
  const now = new Date();
  for (const v of data ?? []) {
    let adDays = v.ad_days;
    if (v.is_ad && v.ad_active && v.ad_started_at) adDays = Math.max(1, Math.round((now.getTime() - new Date(v.ad_started_at).getTime()) / 86_400_000) + 1);
    const score = performanceScore({ views: v.views, likes: v.likes, comments: v.comments, shares: v.shares, followers: v.author_followers, publishedAt: v.published_at, isAd: v.is_ad, adDays, adActive: v.ad_active }, now);
    await db.from("videos").update({ score, ad_days: adDays, ...derivedMetrics(v, now) }).eq("id", v.id);
  }
  const last = data?.length ? data[data.length - 1].id : null;
  return { ok: true, rescored: data?.length ?? 0, next_after_id: data?.length === 1000 ? last : null };
}

serve(async (req, body, db) => {
  const c = await caller(req, db);
  const cfg = await apifySettings(db);
  switch (body.action) {
    case "run_source": {
      requireAdmin(c);
      const { data: s } = await db.from("sources").select("*").eq("id", body.source_id).single();
      if (!s) throw new HttpError(404, "source not found");
      return { ok: true, ...(await launch(db, cfg, s, { source_id: s.id, app_id: s.app_id, competitor_id: s.competitor_id, trigger: "manual", created_by: userId(c) })) };
    }
    case "run_adhoc": {
      requireAdmin(c);
      const platform = String(body.platform);
      if (!["tiktok", "instagram", "facebook_ads"].includes(platform)) throw new HttpError(400, "platform");
      const kind = String(body.kind ?? "keyword");
      const value = String(body.value ?? "").trim();
      if (!value) throw new HttpError(400, "value");
      return { ok: true, ...(await launch(db, cfg, { platform: platform as any, kind: kind as any, value, max_results: Number(body.max_results ?? cfg.default_max_results) }, { app_id: body.app_id ?? null, competitor_id: body.competitor_id ?? null, trigger: "adhoc", created_by: userId(c) })) };
    }
    case "run_due": {
      requireAdmin(c);
      if (!cfg.collect_cron_enabled && !body.force) return { ok: true, skipped: "collect_cron_disabled" };
      const { data: due } = await db.from("sources").select("*").eq("enabled", true)
        .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`).limit(10);
      const started: any[] = [];
      for (const s of due ?? []) {
        try {
          started.push(await launch(db, cfg, s, { source_id: s.id, app_id: s.app_id, competitor_id: s.competitor_id, trigger: "cron", created_by: null }));
        } catch (e) {
          started.push({ source_id: s.id, error: String(e) });
          if (e instanceof HttpError && e.status === 402) break;
        }
      }
      return { ok: true, started };
    }
    case "backfill": {
      // Lot de runs ad hoc (plan fourni par l'admin ou par scripts/backfill.ts), plafonné par backfill_budget_usd.
      requireAdmin(c);
      const plan: any[] = Array.isArray(body.plan) ? body.plan.slice(0, 60) : [];
      const { data: app } = await db.from("apps").select("id").eq("slug", body.app_slug ?? "micabo").maybeSingle();
      const started: any[] = [];
      for (const p of plan) {
        try {
          started.push({ ...p, ...(await launch(db, cfg, { platform: p.platform, kind: p.kind, value: String(p.value), max_results: Number(p.max_results ?? 40), countries: p.countries }, { app_id: app?.id ?? null, competitor_id: p.competitor_id ?? null, trigger: "backfill", created_by: userId(c) })) });
        } catch (e) {
          started.push({ ...p, error: String(e instanceof Error ? e.message : e) });
          if (e instanceof HttpError && e.status === 402) break;
        }
      }
      return { ok: true, started: started.filter((x) => !x.error).length, results: started };
    }
    case "discover": {
      // Comptes UGC repérés (≥ min_videos vidéos qui citent un concurrent, ou une vidéo ≥ min_views) → nouvelles sources « compte ».
      requireAdmin(c);
      const minVideos = Number(body.min_videos ?? 2), minViews = Number(body.min_views ?? 100_000);
      const { data: rows } = await db.from("videos").select("author_handle, platform, competitor_id, app_id, views").eq("origin", "ugc").not("author_handle", "is", null).limit(20000);
      const agg = new Map<string, { handle: string; platform: string; competitor_id: string; app_id: string | null; n: number; max: number }>();
      for (const r of rows ?? []) {
        const k = `${r.platform}|${r.author_handle}`;
        const a = agg.get(k) ?? { handle: r.author_handle, platform: r.platform, competitor_id: r.competitor_id, app_id: r.app_id, n: 0, max: 0 };
        a.n++; a.max = Math.max(a.max, Number(r.views ?? 0));
        agg.set(k, a);
      }
      const picked = [...agg.values()].filter((a) => a.platform !== "facebook_ads" && (a.n >= minVideos || a.max >= minViews));
      const { data: app } = await db.from("apps").select("id").eq("slug", "micabo").maybeSingle();
      let created = 0;
      for (const a of picked) {
        const { error } = await db.from("sources").insert({
          app_id: a.app_id ?? app?.id, competitor_id: a.competitor_id, platform: a.platform, kind: "account", value: a.handle,
          max_results: 30, frequency_hours: 168, enabled: body.enable === true,
        });
        if (!error) created++;
      }
      return { ok: true, candidates: picked.length, created };
    }
    case "fix_thumbnails": {
      // Rattrapage : vidéos sans miniature stockée (premiers runs, ou téléchargement raté). Lots de 10 en parallèle.
      requireAdmin(c);
      const { data: rows } = await db.from("videos").select("id, platform, external_id, thumbnail_src").is("thumbnail_path", null)
        .not("thumbnail_src", "is", null).limit(Number(body.limit ?? 150));
      let fixed = 0, expired = 0;
      for (let i = 0; i < (rows ?? []).length; i += 10) {
        const batch = rows!.slice(i, i + 10);
        const paths = await Promise.all(batch.map((r) => storeThumbnail(db, r as unknown as VideoRow)));
        for (let j = 0; j < batch.length; j++) {
          if (paths[j]) { await db.from("videos").update({ thumbnail_path: paths[j] }).eq("id", batch[j].id); fixed++; } else expired++;
        }
      }
      return { ok: true, checked: rows?.length ?? 0, fixed, expired };
    }
    case "poll":
      requireAdmin(c);
      return await poll(db);
    case "measure_due":
      requireAdmin(c);
      return await measureDue(db, cfg, body.force === true);
    case "store_video":
      requireStaff(c);
      return await storeVideo(db, cfg, String(body.video_id), userId(c));
    case "rescore":
      requireAdmin(c);
      return await rescore(db, body.after_id ?? null);
    default:
      throw new HttpError(400, "unknown action");
  }
});

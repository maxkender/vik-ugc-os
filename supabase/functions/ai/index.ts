// ai — classement IA des vidéos via fal (OpenRouter) : catégorie de format + pertinence 0–100 par app.
//   classify_pending { limit? }   cron (toutes les 30 min) / admin : vidéos pas encore notées, par lots, sous plafond mensuel
//   status                        staff : en attente, dépense du mois, plafond, clé présente
// Garde-fous : rien sans FAL_KEY ; plafond settings.ai.monthly_cap_usd ; per_run vidéos max par appel ;
// une catégorie choisie à la main (category_auto = false) et une correction manuelle de compatibilité ne sont jamais écrasées.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { caller, getSetting, HttpError, requireAdmin, requireStaff, serve } from "../_shared/http.ts";
import { falChat } from "../_shared/fal.ts";
import { classifySystemPrompt, classifyUserPrompt, mergeAppScores, parseClassifyOutput, type ClassifyApp } from "../_shared/logic/classify.ts";

interface AiSettings { enabled: boolean; model: string; fallback_model: string; monthly_cap_usd: number; batch_size: number; per_run: number }
const DEFAULTS: AiSettings = { enabled: true, model: "google/gemini-2.5-flash", fallback_model: "anthropic/claude-sonnet-5.5", monthly_cap_usd: 5, batch_size: 10, per_run: 60 };

async function cfg(db: SupabaseClient): Promise<AiSettings> {
  return { ...DEFAULTS, ...(await getSetting<Partial<AiSettings>>(db, "ai")) };
}

async function monthSpend(db: SupabaseClient): Promise<number> {
  const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  const { data } = await db.from("ai_usage").select("cost_usd").gte("created_at", start.toISOString());
  return (data ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
}

async function classifyPending(db: SupabaseClient, limit?: number) {
  const s = await cfg(db);
  if (!s.enabled) return { ok: true, skipped: "disabled" };
  if (!Deno.env.get("FAL_KEY")) return { ok: true, skipped: "fal_not_configured" };
  let spent = await monthSpend(db);
  if (spent >= s.monthly_cap_usd) return { ok: true, skipped: "monthly_cap_reached", spent };

  const [{ data: cats }, { data: apps }] = await Promise.all([
    db.from("categories").select("id, slug, name, description").order("sort"),
    db.from("apps").select("id, slug, name, description, audience").eq("active", true),
  ]);
  if (!apps?.length) return { ok: true, skipped: "no_app" };
  const system = classifySystemPrompt(cats ?? [], apps as ClassifyApp[]);
  const catId = new Map((cats ?? []).map((c) => [c.slug, c.id]));
  const max = Math.min(limit ?? s.per_run, 200);
  const { data: videos } = await db.from("videos")
    .select("id, platform, caption, hashtags, sound_name, author_handle, ad_page_name, is_ad, language, duration_s, category_id, category_auto, app_scores")
    .is("ai_scored_at", null).order("first_seen_at", { ascending: false }).limit(max);

  let done = 0, categorized = 0, cost = 0, failed = 0;
  for (let i = 0; i < (videos ?? []).length; i += s.batch_size) {
    if (spent + cost >= s.monthly_cap_usd) break;
    const batch = videos!.slice(i, i + s.batch_size);
    let r;
    try {
      r = await falChat([s.model, s.fallback_model], [{ role: "system", content: system }, { role: "user", content: classifyUserPrompt(batch) }], { maxTokens: 300 * batch.length });
    } catch (e) {
      console.error(e instanceof Error ? e.message : String(e));
      failed += batch.length;
      continue;
    }
    cost += r.costUsd;
    await db.from("ai_usage").insert({ kind: "classify", model: r.model, items: batch.length, cost_usd: r.costUsd });
    const results = parseClassifyOutput(r.text, batch.map((v) => v.id), [...catId.keys()], apps.map((a) => a.slug));
    const at = new Date().toISOString();
    for (const res of results) {
      const v = batch.find((x) => x.id === res.id)!;
      const patch: Record<string, unknown> = { app_scores: mergeAppScores(v.app_scores, res, apps as ClassifyApp[], r.model, at), ai_scored_at: at };
      // Catégorie : seulement si vide ou posée automatiquement (jamais un choix manuel).
      if (res.category && (!v.category_id || v.category_auto)) {
        patch.category_id = catId.get(res.category);
        patch.category_auto = true;
        if (!v.category_id) categorized++;
      }
      await db.from("videos").update(patch).eq("id", v.id);
      done++;
    }
  }
  return { ok: true, scored: done, categorized, failed, cost_usd: Math.round(cost * 10000) / 10000, month_spent_usd: Math.round((spent + cost) * 10000) / 10000, cap_usd: s.monthly_cap_usd };
}

async function status(db: SupabaseClient) {
  const s = await cfg(db);
  const [{ count: pending }, { count: uncategorized }, spent] = await Promise.all([
    db.from("videos").select("id", { count: "exact", head: true }).is("ai_scored_at", null),
    db.from("videos").select("id", { count: "exact", head: true }).is("category_id", null),
    monthSpend(db),
  ]);
  return { ok: true, settings: s, fal_configured: !!Deno.env.get("FAL_KEY"), pending: pending ?? 0, uncategorized: uncategorized ?? 0, month_spent_usd: Math.round(spent * 10000) / 10000 };
}

serve(async (req, body, db) => {
  const c = await caller(req, db);
  switch (body.action) {
    case "classify_pending": requireAdmin(c); return classifyPending(db, body.limit ? Number(body.limit) : undefined);
    case "status": requireStaff(c); return status(db);
    default: throw new HttpError(400, "unknown_action");
  }
});

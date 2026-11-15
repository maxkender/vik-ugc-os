/**
 * Classement IA des vidéos (fal → OpenRouter, Gemini flash par défaut) : catégorie de format
 * et pertinence 0–100 pour chaque app Vik Studios, en un seul appel pour un lot de vidéos.
 * Entrée : légende, hashtags, son, créateur, métriques (pas de transcription stockée pour l'instant).
 */
export interface ClassifyVideo {
  id: string; platform: string; caption?: string | null; hashtags?: string[] | null; sound_name?: string | null;
  author_handle?: string | null; ad_page_name?: string | null; is_ad?: boolean | null; language?: string | null;
  duration_s?: number | null; transcript?: string | null;
}
export interface ClassifyCategory { slug: string; name: string; description?: string | null }
export interface ClassifyApp { id: string; slug: string; name: string; description?: string | null; audience?: string | null }

export interface AppScore {
  score: number; reason: string; ai_compatible: boolean; manual?: boolean | null; compatible: boolean; model?: string; at?: string;
  manual_by?: string | null; manual_at?: string | null;
}
export interface ClassifyResult { id: string; category: string | null; apps: Record<string, { score: number; compatible: boolean; reason: string }> }

/** Seuil « compatible » si le modèle ne le dit pas explicitement. */
export const COMPAT_THRESHOLD = 60;

export function classifySystemPrompt(categories: ClassifyCategory[], apps: ClassifyApp[]): string {
  return `You classify short-form social videos (TikTok, Instagram Reels, Meta ads) for a UGC marketing team.

Format categories (pick exactly one slug, or null if impossible to tell):
${categories.map((c) => `- ${c.slug}: ${c.name}${c.description ? ` — ${c.description}` : ""}`).join("\n")}

Apps we promote with UGC creators:
${apps.map((a) => `- ${a.slug} (${a.name}): ${a.description ?? ""}${a.audience ? ` Target: ${a.audience}` : ""}`).join("\n")}

For each app, give a relevance score 0-100: how good this video is as a reference to brief a UGC creator promoting that app
(audience fit, topic fit, and whether the format is easy to reproduce with the app). 80+ = perfect reference, 60-79 = usable,
below 60 = not compatible. Add a short reason in French (max 120 chars), concrete, e.g.
"Parfait pour Micabo : étudiante qui révise avec une app d'IA, format face cam facile à reproduire".

Answer with JSON only, no prose: {"results":[{"id":"<video id>","category":"<slug|null>","apps":{"<app slug>":{"score":0-100,"compatible":true|false,"reason":"..."}}}]}
Include every video id you were given, exactly once.`;
}

const clip = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function classifyUserPrompt(videos: ClassifyVideo[]): string {
  return JSON.stringify(videos.map((v) => ({
    id: v.id, platform: v.platform, ad: !!v.is_ad, lang: v.language ?? undefined,
    author: v.ad_page_name ?? v.author_handle ?? undefined, duration_s: v.duration_s ? Math.round(v.duration_s) : undefined,
    caption: clip(v.caption, 500), hashtags: (v.hashtags ?? []).slice(0, 15), sound: clip(v.sound_name, 80) || undefined,
    transcript: clip(v.transcript, 800) || undefined,
  })));
}

function extractJson(text: string): any {
  const raw = (text ?? "").trim();
  const tries = [raw];
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) tries.push(fence[1].trim());
  const a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a >= 0 && b > a) tries.push(raw.slice(a, b + 1));
  for (const t of tries) { try { return JSON.parse(t); } catch { /* suivant */ } }
  return null;
}

/** Lit la sortie du modèle ; ignore les ids inconnus, les catégories et apps hors liste ; borne les scores. */
export function parseClassifyOutput(text: string, ids: string[], categorySlugs: string[], appSlugs: string[]): ClassifyResult[] {
  const j = extractJson(text);
  const list: any[] = Array.isArray(j) ? j : Array.isArray(j?.results) ? j.results : [];
  const known = new Set(ids), cats = new Set(categorySlugs), seen = new Set<string>();
  const out: ClassifyResult[] = [];
  for (const r of list) {
    const id = String(r?.id ?? "");
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    const category = typeof r.category === "string" && cats.has(r.category) ? r.category : null;
    const apps: ClassifyResult["apps"] = {};
    for (const slug of appSlugs) {
      const a = r.apps?.[slug];
      if (!a || typeof a !== "object") continue;
      const score = Math.max(0, Math.min(100, Math.round(Number(a.score))));
      if (!Number.isFinite(score)) continue;
      apps[slug] = { score, compatible: typeof a.compatible === "boolean" ? a.compatible : score >= COMPAT_THRESHOLD, reason: clip(String(a.reason ?? ""), 160) };
    }
    out.push({ id, category, apps });
  }
  return out;
}

/** Fusionne les nouveaux scores IA dans app_scores, sans jamais écraser une correction manuelle. */
export function mergeAppScores(
  existing: Record<string, AppScore> | null | undefined, result: ClassifyResult, apps: ClassifyApp[], model: string, at: string,
): Record<string, AppScore> {
  const out: Record<string, AppScore> = { ...(existing ?? {}) };
  for (const app of apps) {
    const r = result.apps[app.slug];
    if (!r) continue;
    const prev = out[app.id];
    const manual = prev?.manual ?? null;
    out[app.id] = {
      ...prev, score: r.score, reason: r.reason, ai_compatible: r.compatible, manual,
      compatible: manual ?? r.compatible, model, at,
    };
  }
  return out;
}

/** Coût prévisionnel affiché avant un lancement (Gemini flash ≈ 0,0003 $ par vidéo en lot de 10, marge ×2). */
export function estimateClassifyCost(n: number, perVideoUsd = 0.0006): number {
  return Math.round(n * perVideoUsd * 100) / 100;
}

// Validation de la chaîne de collecte (sans service_role) : lance un petit run Apify
// synchrone, normalise / catégorise / score avec les MÊMES modules que l'edge function
// `collect`, puis écrit dans la base via l'API Management (scripts/sql.sh).
//
//   deno run -A scripts/validate-collect.ts tiktok account knowunity.fr 10 "Knowunity"
//
// APIFY_TOKEN et SUPABASE_ACCESS_TOKEN sont lus dans l'environnement (ou injectés par un proxy).
import { buildActorInput, maxChargeUsd, type SourcePlatform, type SourceKind } from "../supabase/functions/_shared/logic/apifyInput.ts";
import { normalizeItem } from "../supabase/functions/_shared/logic/normalize.ts";
import { heuristicClassify } from "../supabase/functions/_shared/logic/categorize.ts";
import { performanceScore } from "../supabase/functions/_shared/logic/score.ts";

const [platform, kind, value, nStr, competitor] = Deno.args;
const n = Number(nStr ?? 10);
const REF = Deno.env.get("SUPABASE_PROJECT_REF") ?? "lnytuhsgzkqrkehemasu";
const SBP = Deno.env.get("SUPABASE_ACCESS_TOKEN") ?? "sbp_" + "0".repeat(40);
const APIFY = Deno.env.get("APIFY_TOKEN") ?? "proxy-injected";
const ACTORS: Record<string, string> = { tiktok: "clockworks~tiktok-scraper", instagram: "apify~instagram-scraper", facebook_ads: "apify~facebook-ads-scraper" };

async function sql(query: string, attempt = 0): Promise<any[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 429 && attempt < 8) {
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
    return sql(query, attempt + 1);
  }
  if (!res.ok) throw new Error(JSON.stringify(body));
  return body;
}
const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `array[${v.map(lit).join(",")}]::text[]`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const input = buildActorInput({ platform: platform as SourcePlatform, kind: kind as SourceKind, value, max_results: n }, 50);
const t0 = Date.now();
const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTORS[platform]}/runs?maxItems=${n}&maxTotalChargeUsd=${maxChargeUsd(platform as SourcePlatform, n)}`, {
  method: "POST", headers: { Authorization: `Bearer ${APIFY}`, "Content-Type": "application/json" }, body: JSON.stringify(input),
});
const run = (await runRes.json()).data;
let status = run.status, info: any = run;
while (!["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
  await new Promise((r) => setTimeout(r, 5000));
  info = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}`, { headers: { Authorization: `Bearer ${APIFY}` } })).json()).data;
  status = info.status;
}
const items = await (await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?clean=1&limit=${n * 2}`, { headers: { Authorization: `Bearer ${APIFY}` } })).json();
const [app] = await sql("select id from apps where slug = 'micabo'");
const comp = competitor ? (await sql(`select id from competitors where name = ${lit(competitor)}`))[0] : null;
const src = (await sql(`select id from sources where platform = ${lit(platform)} and kind = ${lit(kind)} and value = ${lit(value)}`))[0] ?? null;
const cats = await sql("select id, slug, keywords from categories");
const now = new Date();
const rows = items.map((x: any) => normalizeItem(platform as any, x, now)).filter(Boolean);
const [runRow] = await sql(`insert into agent_runs (source_id, app_id, agent, trigger, params, apify_actor, apify_run_id, apify_dataset_id, status, items_found, items_new, cost_usd, finished_at, started_at)
  values (${lit(src?.id)}, ${lit(app.id)}, ${lit(platform)}, 'manual', ${lit(JSON.stringify({ input, max_results: n, via: "validate-collect" }))}::jsonb, ${lit(ACTORS[platform])}, ${lit(run.id)}, ${lit(run.defaultDatasetId)},
  ${lit(status === "SUCCEEDED" ? "succeeded" : "failed")}, ${items.length}, ${rows.length}, ${info.usageTotalUsd ?? 0}, now(), now() - interval '${Math.round((Date.now() - t0) / 1000)} seconds') returning id`);
const statements: string[] = [];
for (const r of rows) {
  const cls = heuristicClassify({ caption: r.caption, hashtags: r.hashtags, raw_type: r.raw_type }, cats);
  const score = performanceScore({ views: r.views, likes: r.likes, comments: r.comments, shares: r.shares, followers: r.author_followers, publishedAt: r.published_at, isAd: r.is_ad, adDays: r.ad_days, adActive: r.ad_active }, now);
  const { raw_type: _x, ...cols } = r;
  const all: Record<string, unknown> = { ...cols, app_id: app.id, competitor_id: comp?.id ?? null, source_id: src?.id ?? null, category_id: cls.category_id, score };
  const keys = Object.keys(all);
  const vals = keys.map((k) => lit(all[k]));
  statements.push(`insert into videos (${keys.join(",")}) values (${vals.join(",")})
    on conflict (platform, external_id) do update set views = excluded.views, likes = excluded.likes, comments = excluded.comments, shares = excluded.shares,
    score = excluded.score, thumbnail_src = excluded.thumbnail_src, video_src = excluded.video_src, ad_days = excluded.ad_days, ad_active = excluded.ad_active, ad_ended_at = excluded.ad_ended_at;`);
}
if (statements.length) await sql(statements.join("\n"));
if (src) await sql(`update sources set last_run_at = now() where id = ${lit(src.id)}`);
console.log(JSON.stringify({ run: runRow.id, status, items: items.length, videos: rows.length, cost_usd: info.usageTotalUsd, seconds: Math.round((Date.now() - t0) / 1000) }));

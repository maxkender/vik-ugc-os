// Classement IA du stock existant, lancé depuis la session de build (la clé fal est injectée par le proxy ;
// en prod, c'est l'edge function « ai » qui s'en charge avec le secret FAL_KEY).
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/ai-backfill.mts <max> <cap_usd> [batch]
// Écrit via l'API Management Supabase (SQL). Même logique que supabase/functions/ai (classify.ts).
import { classifySystemPrompt, classifyUserPrompt, mergeAppScores, parseClassifyOutput } from "../supabase/functions/_shared/logic/classify.ts";

const REF = "lnytuhsgzkqrkehemasu";
const TOKEN = "sbp_" + "0".repeat(40); // valeur factice : le proxy pose la vraie clé
const MODELS = ["google/gemini-2.5-flash", "anthropic/claude-sonnet-5.5"];
const [max = "20", cap = "3", batchSize = "10"] = process.argv.slice(2);
const TAG = "q" + "v" + "q"; // délimiteur de chaîne SQL ($qvq$ … $qvq$)

async function sql(query: string, tries = 6): Promise<any[]> {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ query }),
    });
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 2000 * (i + 1))); continue; }
    const j = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
    return j;
  }
  throw new Error("sql: trop de tentatives");
}
const D = "$" + TAG + "$";
const lit = (s: string) => D + s.split(D).join("") + D;

async function fal(messages: any[], maxTokens: number) {
  for (const model of MODELS) {
    const r = await fetch("https://fal.run/openrouter/router/openai/v1/chat/completions", {
      method: "POST", headers: { authorization: "Key placeholder", "content-type": "application/json" },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.2 }),
    });
    if (!r.ok) { console.error("fal", r.status, model, (await r.text()).slice(0, 200)); continue; }
    const j: any = await r.json();
    return { text: j.choices?.[0]?.message?.content ?? "", model, cost: Number(j.usage?.cost ?? 0) };
  }
  throw new Error("fal: aucun modèle");
}

const cats = await sql("select id, slug, name, description from categories order by sort");
const apps = await sql("select id, slug, name, description, audience from apps where active");
const system = classifySystemPrompt(cats, apps);
const catId = new Map<string, string>(cats.map((c: any) => [c.slug, c.id]));
const videos = await sql(`select id, platform, caption, hashtags, sound_name, author_handle, ad_page_name, is_ad, language, duration_s, category_id, category_auto, app_scores
  from videos where ai_scored_at is null order by first_seen_at desc limit ${Number(max)}`);
console.log(`${videos.length} vidéos à classer, plafond ${cap} $`);
let cost = 0, done = 0, categorized = 0;
const B = Number(batchSize);
const batches: any[][] = [];
for (let i = 0; i < videos.length; i += B) batches.push(videos.slice(i, i + B));
for (let i = 0; i < batches.length; i += 4) {
  if (cost >= Number(cap)) { console.log("\nplafond atteint"); break; }
  await Promise.all(batches.slice(i, i + 4).map(async (batch) => {
    let r;
    try { r = await fal([{ role: "system", content: system }, { role: "user", content: classifyUserPrompt(batch) }], 300 * batch.length); }
    catch (e) { console.error(String(e)); return; }
    cost += r.cost;
    const res = parseClassifyOutput(r.text, batch.map((v) => v.id), [...catId.keys()], apps.map((a: any) => a.slug));
    const at = new Date().toISOString();
    const stmts = [`insert into ai_usage (kind, model, items, cost_usd) values ('classify', ${lit(r.model)}, ${batch.length}, ${r.cost})`];
    for (const x of res) {
      const v = batch.find((b) => b.id === x.id)!;
      const scores = mergeAppScores(v.app_scores, x, apps, r.model, at);
      const setCat = x.category && (!v.category_id || v.category_auto) ? `, category_id = '${catId.get(x.category)}', category_auto = true` : "";
      if (setCat && !v.category_id) categorized++;
      stmts.push(`update videos set app_scores = ${lit(JSON.stringify(scores))}::jsonb, ai_scored_at = '${at}'${setCat} where id = '${v.id}'`);
      done++;
    }
    await sql(stmts.join(";\n"));
  }));
  process.stdout.write(`\r${done} classées · ${cost.toFixed(4)} $`);
}
console.log(`\nFini : ${done} vidéos, ${categorized} nouvelles catégories, coût réel ${cost.toFixed(4)} $`);

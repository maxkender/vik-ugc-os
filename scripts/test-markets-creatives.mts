// Pays de test (16/11, Max) : 3 styles (carte emploi, Notes iPhone, photo UGC) × 1:1 / 9:16 par pays, en brouillon.
// 1 photo IA par pays (fal flux/dev, filtre de sécurité activé). Textes contrôlés par copyViolations.
// Les brouillons précédents des mêmes pays passent en « rejected » (rien n'est supprimé).
// Écrit la liste des lignes créées (JSON) pour le rendu canvas (scratchpad/render-local.cjs) puis l'envoi dans Storage.
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/test-markets-creatives.mts <out.json> [FR,DE,…]
import { writeFileSync } from "node:fs";
import { cardCopy, countryName } from "../supabase/functions/_shared/logic/cardCopy.ts";
import { notesCopy } from "../supabase/functions/_shared/logic/notesCopy.ts";
import { copyViolations, jobCopy } from "../supabase/functions/_shared/logic/jobCopy.ts";
import { formatMoney } from "../supabase/functions/_shared/logic/zones.ts";

const REF = "lnytuhsgzkqrkehemasu";
const MGMT = { authorization: `Bearer sbp_${"0".repeat(40)}`, "content-type": "application/json" };
export const TEST_MARKETS: Record<string, string> = { FR: "fr", DE: "de", BE: "fr", ES: "es", IT: "it", PL: "pl", RS: "sr", RO: "ro", BG: "bg", MX: "es", GB: "en" };
const out = process.argv[2];
const only = (process.argv[3] ?? "").split(",").filter(Boolean);
const markets = Object.entries(TEST_MARKETS).filter(([c]) => !only.length || only.includes(c));

async function sql(q: string): Promise<any> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: MGMT, body: JSON.stringify({ query: q }) });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error(JSON.stringify(j).slice(0, 300));
  return j;
}
const lit = (v: unknown) => v === null || v === undefined ? "null" : `'${String(typeof v === "string" ? v : JSON.stringify(v)).replace(/'/g, "''")}'`;

const keys: any[] = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: MGMT })).json();
const SK = keys.find((k) => k.name === "service_role" || k.type === "secret")?.api_key;
if (!SK) throw new Error("service key");

const zones: any[] = await sql(`select c.code, z.code zone, z.price_per_video, z.currency from countries c join zones z on z.code = c.zone_code where c.code in (${markets.map(([c]) => `'${c}'`).join(",")})`);
const zoneOf = new Map(zones.map((z) => [z.code, z]));

// 1. Textes + contrôle de conformité avant toute écriture.
const rows: any[] = [];
for (const [code, lang] of markets) {
  const z = zoneOf.get(code);
  if (!z) throw new Error(`zone ${code}`);
  const card = cardCopy(lang, "student", code);
  const locale = code === "GB" ? "en-GB" : lang; // « US$10 », dates britanniques
  const notes = notesCopy(locale);
  const job = jobCopy(lang, "student", formatMoney(Number(z.price_per_video), z.currency, locale), code);
  for (const format of ["1:1", "9:16"]) {
    rows.push({ country: code, language: card.lang, format, style: "card", hook: "student", headline: job.headline, subline: null, cta: job.cta, bonus_line: null,
      card: { label: card.label, title: card.title, lines: card.lines, cta: card.cta, footer: card.footer }, ad_text: card.primary });
    rows.push({ country: code, language: notes.lang, format, style: "notes", hook: "student", headline: notes.title, subline: notes.subtitle, cta: notes.cta, bonus_line: null,
      card: { app: notes.app, date: notes.date, title: notes.title, subtitle: notes.subtitle, lines: notes.lines, cta: notes.cta }, ad_text: card.primary });
    rows.push({ country: code, language: job.lang, format, style: "photo", hook: "student", headline: job.headline, subline: job.tag, cta: job.cta, bonus_line: job.pay,
      card: null, ad_text: card.primary });
  }
}
const issues = rows.flatMap((r) => copyViolations([r.headline, r.subline, r.bonus_line, r.cta, r.ad_text, r.card?.title, r.card?.subtitle, ...(r.card?.lines ?? []), r.card?.cta].filter(Boolean).join(" · "), r.language).map((i) => `${r.country}/${r.style}: ${i}`));
if (issues.length) throw new Error(`Textes non conformes :\n${issues.join("\n")}`);

// 2. Une photo IA par pays (9:16, recadrée en carré au rendu 1:1). Plafond : 10 × ~0,05 $.
const bg = new Map<string, string>();
for (const [code] of markets) {
  const name = countryName(code, "en");
  const prompt = `Candid vertical smartphone photo, authentic UGC social-media look: a friendly university student (around 20, fictional person) who lives in ${name}, with a look typical of the local population, in an everyday setting typical of ${name}, studying at a desk with notebooks, highlighters and a laptop, holding a smartphone to film a short study video. Warm natural light, realistic skin texture, slightly imperfect framing, shallow depth of field. Subject in the middle third of the frame. No text, no letters, no watermark, no brand logos, no famous people.`;
  let path = "";
  for (let attempt = 0; attempt < 3 && !path; attempt++) {
    const r = await fetch("https://fal.run/fal-ai/flux/dev", { method: "POST", headers: { authorization: "Key placeholder", "content-type": "application/json" },
      body: JSON.stringify({ prompt, image_size: { width: 1080, height: 1920 }, num_images: 1, enable_safety_checker: true, sync_mode: true }) });
    const d: any = await r.json();
    if (!r.ok || d.has_nsfw_concepts?.[0]) { console.error(code, "fal", r.status, JSON.stringify(d).slice(0, 160)); continue; }
    // sync_mode : l'image revient en data URI (le CDN fal.media n'est pas joignable depuis cet environnement).
    const m = /^data:([^;]+);base64,(.*)$/s.exec(String(d.images?.[0]?.url ?? ""));
    if (!m) { console.error(code, "pas de data URI"); continue; }
    const img = { headers: new Map([["content-type", m[1]]]) };
    const buf = Buffer.from(m[2], "base64");
    path = `backgrounds/test-${code.toLowerCase()}-${Date.now()}.${m[1].includes("png") ? "png" : "jpg"}`;
    const up = await fetch(`https://${REF}.supabase.co/storage/v1/object/creatives/${path}`, { method: "POST", headers: { apikey: SK, authorization: `Bearer ${SK}`, "content-type": img.headers.get("content-type") ?? "image/jpeg", "x-upsert": "true" }, body: buf });
    if (!up.ok) throw new Error(`upload ${code} ${up.status}`);
    await sql(`insert into ai_usage (kind, model, items, cost_usd) values ('image', 'fal-ai/flux/dev', 1, ${Math.round(1080 * 1920 / 1e6 * 0.025 * 10000) / 10000})`);
    bg.set(code, path);
    process.stdout.write(`${code} `);
  }
  if (!path) throw new Error(`photo ${code}`);
}

// 3. Anciens brouillons de ces pays → rejected ; nouveaux brouillons.
await sql(`update recruitment_creatives set status = 'rejected' where status = 'draft' and country in (${markets.map(([c]) => `'${c}'`).join(",")})`);
const values = rows.map((r) => `(${[r.country, r.language, r.format, r.style, r.hook, r.headline, r.subline, r.cta, r.bonus_line, r.ad_text].map(lit).join(", ")}, ${r.card ? `${lit(r.card)}::jsonb` : "null"}, ${r.style === "photo" ? lit(bg.get(r.country)) : "null"}, ${r.style === "photo" ? lit("fal:fal-ai/flux/dev") : "null"}, 'draft')`);
const created = await sql(`insert into recruitment_creatives (country, language, format, style, hook, headline, subline, cta, bonus_line, ad_text, card, background_path, background_provider, status)
  values ${values.join(",\n")} returning *`);
writeFileSync(out, JSON.stringify(created));
console.log(`\n${created.length} brouillons créés`);

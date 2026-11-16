// Réécrit le texte des brouillons de créas avec le wording courant (cardCopy / jobCopy), sans toucher aux images IA.
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/refresh-draft-copy.mts
import { cardCopy } from "../supabase/functions/_shared/logic/cardCopy.ts";
import { jobCopy } from "../supabase/functions/_shared/logic/jobCopy.ts";
import { formatMoney } from "../supabase/functions/_shared/logic/zones.ts";
const REF = "lnytuhsgzkqrkehemasu";
async function sql(q: string) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { authorization: `Bearer sbp_${"0".repeat(40)}`, "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
  return r.json();
}
const rows: any[] = await sql(`select r.id, r.country, r.style, r.hook, c.language, z.price_per_video, z.currency from recruitment_creatives r
  join countries c on c.code = r.country join zones z on z.code = c.zone_code where r.status = 'draft'`);
const lit = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'`;
const stmts = rows.map((r) => {
  const lang = String(r.language ?? "en").split("-")[0];
  const card = cardCopy(lang, r.hook, r.country);
  const copy = jobCopy(lang, r.hook, formatMoney(Number(r.price_per_video), r.currency, lang), r.country);
  const set = r.style === "card"
    ? `card = ${lit({ label: card.label, title: card.title, lines: card.lines, cta: card.cta, footer: card.footer })}::jsonb, headline = ${lit(copy.headline)}::jsonb #>> '{}', cta = ${lit(copy.cta)}::jsonb #>> '{}'`
    : `headline = ${lit(copy.headline)}::jsonb #>> '{}', subline = ${lit(copy.tag)}::jsonb #>> '{}', bonus_line = ${lit(copy.pay)}::jsonb #>> '{}', cta = ${lit(copy.cta)}::jsonb #>> '{}'`;
  return `update recruitment_creatives set ${set}, ad_text = ${lit(card.primary)}::jsonb #>> '{}', image_path = case when style = 'card' then null else image_path end where id = '${r.id}';`;
});
console.log(JSON.stringify(await sql(stmts.join("\n"))), rows.length);

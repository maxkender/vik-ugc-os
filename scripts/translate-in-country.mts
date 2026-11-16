// « en [pays] » correctement décliné dans la langue de chaque pays (au Mexique, у Србији, no Brasil…),
// et titres des cartes réécrits avec {{in_country}}. Écrit inCountry.generated.ts + met à jour cardCopy.generated.ts.
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/translate-in-country.mts
import { readFileSync, writeFileSync } from "node:fs";
import { CARD_COPY } from "../supabase/functions/_shared/logic/cardCopy.ts";

const REF = "lnytuhsgzkqrkehemasu";
async function sql(q: string) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { authorization: `Bearer sbp_${"0".repeat(40)}`, "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
  return r.json();
}
async function llm(prompt: string): Promise<any> {
  for (const model of ["anthropic/claude-sonnet-5.5", "google/gemini-2.5-flash"]) {
    const r = await fetch("https://fal.run/openrouter/router/openai/v1/chat/completions", {
      method: "POST", headers: { authorization: "Key placeholder", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 4000, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) continue;
    const j: any = await r.json();
    try { return JSON.parse(String(j.choices?.[0]?.message?.content ?? "").replace(/^```(json)?|```$/g, "").trim()); } catch { /* suivant */ }
  }
  throw new Error("llm");
}

const countries: { code: string; language: string }[] = await sql("select code, language from countries where open order by code");
const langs = Object.keys(CARD_COPY);
// Pour chaque langue : les pays où elle est la langue principale, + en/es/fr pour tous les pays (repli).
const pairs: Record<string, string[]> = {};
for (const l of langs) pairs[l] = countries.filter((c) => c.language === l || ["en", "es", "fr"].includes(l)).map((c) => c.code);

const inCountry: Record<string, Record<string, string>> = {};
const titles: Record<string, string> = {};
const work = langs.filter((l) => pairs[l].length);
for (let i = 0; i < work.length; i += 6) {
  await Promise.all(work.slice(i, i + 6).map(async (l) => {
    const r = await llm(`Language code: ${l}. Current job-ad card title (with a {{country}} placeholder): ${JSON.stringify(CARD_COPY[l].title)}.
1) Rewrite this title so that the phrase meaning "in {{country}}" (preposition + country) becomes the single placeholder {{in_country}}. Keep everything else identical.
2) For each ISO country code in ${JSON.stringify(pairs[l])}, give the grammatically correct phrase meaning "in <country>" in this language, with the right preposition/article/case (e.g. fr: "au Mexique", "en France", "aux États-Unis"; pt: "no Brasil"; sr: "у Србији"; en: "in the United States").
Return JSON: {"title": "...", "in_country": {"MX": "...", ...}}`);
    if (!String(r.title).includes("{{in_country}}")) throw new Error(`title ${l}`);
    titles[l] = r.title;
    inCountry[l] = r.in_country;
    process.stdout.write(`${l} `);
  }));
}
writeFileSync("supabase/functions/_shared/logic/inCountry.generated.ts",
  `// Généré par scripts/translate-in-country.mts : « en [pays] » décliné par langue (à faire relire).\nexport const IN_COUNTRY: Record<string, Record<string, string>> = ${JSON.stringify(inCountry, null, 2)};\n\nexport const CARD_TITLES: Record<string, string> = ${JSON.stringify(titles, null, 2)};\n`);
console.log(`\n${Object.keys(titles).length} titres`);

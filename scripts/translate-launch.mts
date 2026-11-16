// Traductions nécessaires au lancement (16/11) pour les langues sans espace créateur : par défaut DE et IT.
//   1. sections « account », « login », « creator » de l'interface → src/i18n/locales/space/<l>.ts
//   2. guide / warm-up / brief / Ruul (src/i18n/guide.ts) → src/i18n/guide.generated.ts
//   3. écrans d'onboarding (table onboarding_screens)
//   4. modèles d'emails (table email_templates), placeholders {x} conservés
// À faire relire par un natif. NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/translate-launch.mts de,it
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import en from "../src/i18n/en.ts";
import { GUIDE } from "../src/i18n/guide.ts";

const LANGS = (process.argv[2] ?? "de,it").split(",");
const NAMES: Record<string, string> = { de: "German", it: "Italian", pl: "Polish", ro: "Romanian", bg: "Bulgarian", sr: "Serbian (Latin script)", pt: "Brazilian Portuguese", nl: "Dutch" };
const REF = "lnytuhsgzkqrkehemasu";
async function sql(q: string): Promise<any> {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { authorization: `Bearer sbp_${"0".repeat(40)}`, "content-type": "application/json" }, body: JSON.stringify({ query: q }) });
  return r.json();
}
async function llm(prompt: string, maxTokens = 12000): Promise<any> {
  for (const model of ["anthropic/claude-sonnet-5.5", "google/gemini-2.5-flash"]) {
    const r = await fetch("https://fal.run/openrouter/router/openai/v1/chat/completions", { method: "POST", headers: { authorization: "Key placeholder", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }) });
    if (!r.ok) { console.error(model, r.status); continue; }
    const j: any = await r.json();
    try { return JSON.parse(String(j.choices?.[0]?.message?.content ?? "").replace(/^```(json)?|```$/g, "").trim()); } catch { console.error("json", model); }
  }
  throw new Error("llm");
}
const RULES = `Context: the creator space of a paid UGC creator program (people film short videos for TikTok/Instagram to promote a study app, paid per validated video through Ruul). Friendly, informal "you" (du / tu). Keep EXACTLY: every {{placeholder}} and {placeholder}, markdown (**bold**, line breaks), emojis, brand and product names (Vik Studios, Micabo, Ruul, ruul.io, TikTok, Instagram, Reels, CapCut, Edits, Slack, UGC, IBAN), URLs, and the JSON structure/keys (translate values only; arrays keep the same length).`;

/** Vérifie que chaque placeholder de la source est présent dans la traduction. */
function checkPh(src: unknown, out: unknown, path = ""): string[] {
  if (typeof src === "string") {
    const need = src.match(/\{\{?\w+\}?\}/g) ?? [];
    return typeof out === "string" ? need.filter((p) => !out.includes(p)).map((p) => `${path} ${p}`) : [`${path} type`];
  }
  if (Array.isArray(src)) return Array.isArray(out) && out.length === src.length ? src.flatMap((v, i) => checkPh(v, out[i], `${path}[${i}]`)) : [`${path} array`];
  if (src && typeof src === "object") return Object.entries(src).flatMap(([k, v]) => checkPh(v, (out as any)?.[k], `${path}.${k}`));
  return [];
}
async function translate(obj: unknown, lang: string, what: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await llm(`${RULES}\nTranslate this JSON (${what}) from English into ${NAMES[lang] ?? lang}. Return only the JSON.\n${JSON.stringify(obj)}`);
    const bad = checkPh(obj, r);
    if (!bad.length) return r;
    console.error(lang, what, "placeholders", bad.slice(0, 5));
  }
  throw new Error(`${lang} ${what}`);
}

// 1. Interface de l'espace créateur
mkdirSync("src/i18n/locales/space", { recursive: true });
const space = { account: en.account, login: en.login, creator: en.creator };
// 2. Guide
const guideGen: Record<string, unknown> = {};
const genPath = "src/i18n/guide.generated.ts";
if (existsSync(genPath)) {
  const txt = readFileSync(genPath, "utf8");
  const i = txt.indexOf("= {");
  if (i > 0) try { Object.assign(guideGen, JSON.parse(txt.slice(i + 2).trim().replace(/;\s*$/, ""))); } catch { /* vide */ }
}
// 3–4. Onboarding + emails (anglais comme source)
const screens: any[] = await sql("select key, sort, title, body, button_label from onboarding_screens where language = 'en' order by sort");
const emails: any[] = await sql("select key, subject, body, button_label from email_templates where language = 'en' order by key");
const lit = (v: unknown) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

for (const l of LANGS) {
  const [sp, gd, sc, em] = await Promise.all([
    translate(space, l, "creator space UI strings"),
    translate(GUIDE.en, l, "creator guide: warm-up, video guide, brief labels, Ruul steps"),
    translate(screens.map(({ key, title, body, button_label }) => ({ key, title, body, button_label })), l, "welcome screens"),
    translate(emails.map(({ key, subject, body, button_label }) => ({ key, subject, body, button_label })), l, "transactional emails"),
  ]);
  writeFileSync(`src/i18n/locales/space/${l}.ts`, `// Généré par scripts/translate-launch.mts : à faire relire par un natif.\nimport type { SpaceDict } from "./types";\nconst ${l}: SpaceDict = ${JSON.stringify(sp, null, 2)};\nexport default ${l};\n`);
  guideGen[l] = gd;
  await sql(`insert into onboarding_screens (key, language, sort, title, body, button_label) values ${(sc as any[]).map((s, i) => `(${lit(screens[i].key)}, '${l}', ${screens[i].sort}, ${lit(s.title)}, ${lit(s.body)}, ${lit(s.button_label)})`).join(",")} on conflict (key, language) do nothing`);
  await sql(`insert into email_templates (key, language, subject, body, button_label) values ${(em as any[]).map((e, i) => `(${lit(emails[i].key)}, '${l}', ${lit(e.subject)}, ${lit(e.body)}, ${lit(e.button_label)})`).join(",")} on conflict do nothing`);
  console.log(l, "ok");
}
writeFileSync(genPath, `// Généré par scripts/translate-launch.mts (fal / OpenRouter) : à faire relire par un natif.\nimport type { GuideText } from "./guide";\n\nexport const GUIDE_GENERATED: Record<string, GuideText> = ${JSON.stringify(guideGen, null, 2)};\n`);
const all = [...new Set([...LANGS, ...(existsSync("src/i18n/locales/space/index.ts") ? [...readFileSync("src/i18n/locales/space/index.ts", "utf8").matchAll(/import (\w+) from/g)].map((m) => m[1]) : [])])].sort();
writeFileSync("src/i18n/locales/space/index.ts", `// Espace créateur (compte, connexion, briefs, paiements) dans les langues de lancement. Généré.\nimport type { SpaceDict } from "./types";\n${all.map((l) => `import ${l} from "./${l}";`).join("\n")}\n\nexport const SPACE: Record<string, SpaceDict> = { ${all.join(", ")} };\n`);

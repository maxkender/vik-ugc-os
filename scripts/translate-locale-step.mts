// Remplace l'étape 3 de « Comment ça marche » (landing.steps[2]) dans src/i18n/locales/*.ts : 1 vidéo par jour (16/11).
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/translate-locale-step.mts
import { readFileSync, writeFileSync } from "node:fs";
import { LOCALE_LABELS } from "../src/i18n/locales/index.ts";
const EN = ["Film and post 1 video a day", "You film your own quality UGC video on your phone. Every morning: a brief, a reference video and a hook."];
const langs = Object.keys(LOCALE_LABELS).filter((l) => !["en", "fr", "es"].includes(l));
const r = await fetch("https://fal.run/openrouter/router/openai/v1/chat/completions", { method: "POST", headers: { authorization: "Key placeholder", "content-type": "application/json" },
  body: JSON.stringify({ model: "anthropic/claude-sonnet-5.5", max_tokens: 8000, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "user",
    content: `Translate this step of a "How it works" section (job page for paid UGC creators) into each language below. Natural, friendly, informal "you" where usual. Keep "UGC" and "hook" if the language usually keeps it. No money amounts.
English: ${JSON.stringify(EN)}
Languages: ${JSON.stringify(Object.fromEntries(langs.map((l) => [l, LOCALE_LABELS[l]])))}
Return JSON {code: [title, text]}.` }] }) });
const j: any = await r.json();
const out = JSON.parse(String(j.choices[0].message.content).replace(/^```(json)?|```$/g, "").trim());
for (const l of langs) {
  const f = `src/i18n/locales/${l}.ts`;
  let s: string;
  try { s = readFileSync(f, "utf8"); } catch { continue; }
  const v = out[l];
  if (!Array.isArray(v) || v.length !== 2) throw new Error(l);
  const m = /(steps: \[\s*\n(?:\s*\[.*\],\s*\n){2})(\s*)\[.*\],\s*\n/.exec(s);
  if (!m) { console.error("pas trouvé", l); continue; }
  s = s.replace(m[0], `${m[1]}${m[2]}${JSON.stringify(v).replace(/","/, '", "')},\n`);
  writeFileSync(f, s);
  process.stdout.write(`${l} `);
}

// Complète LANDING_JOB_GENERATED avec les clés ajoutées depuis (EN/FR → chaque langue). À faire relire.
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/translate-landing-missing.mts
import { writeFileSync } from "node:fs";
import { LANDING_JOB } from "../src/i18n/landingJob.ts";
import { LANDING_JOB_GENERATED } from "../src/i18n/landingJob.generated.ts";
import { LOCALE_LABELS } from "../src/i18n/locales/index.ts";
const en = LANDING_JOB.en as Record<string, string>, fr = LANDING_JOB.fr as Record<string, string>;
const gen: Record<string, Record<string, string>> = JSON.parse(JSON.stringify(LANDING_JOB_GENERATED));
async function llm(prompt: string): Promise<any> {
  for (const model of ["anthropic/claude-sonnet-5.5", "google/gemini-2.5-flash"]) {
    const r = await fetch("https://fal.run/openrouter/router/openai/v1/chat/completions", { method: "POST", headers: { authorization: "Key placeholder", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 3000, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }) });
    if (!r.ok) continue;
    const j: any = await r.json();
    try { return JSON.parse(String(j.choices?.[0]?.message?.content ?? "").replace(/^```(json)?|```$/g, "").trim()); } catch { /* suivant */ }
  }
  throw new Error("llm");
}
const langs = Object.keys(gen);
for (let i = 0; i < langs.length; i += 8) {
  await Promise.all(langs.slice(i, i + 8).map(async (l) => {
    const missing = Object.keys(en).filter((k) => typeof gen[l][k] !== "string");
    if (!missing.length) return;
    const src = Object.fromEntries(missing.map((k) => [k, en[k]]));
    const r = await llm(`Translate this JSON (recruitment landing page and application form for paid UGC creators) from English into ${LOCALE_LABELS[l]} (code ${l}). Friendly informal "you". Keep {{placeholders}}, "iPhone", "Android". Return only JSON with the same keys.\nEnglish: ${JSON.stringify(src)}\nFrench (reference): ${JSON.stringify(Object.fromEntries(missing.map((k) => [k, fr[k]])))}`);
    for (const k of missing) { if (typeof r[k] !== "string") throw new Error(`${l}.${k}`); gen[l][k] = r[k]; }
    process.stdout.write(`${l} `);
  }));
}
writeFileSync("src/i18n/landingJob.generated.ts", `// Généré par scripts/translate-landing-job.mts (fal / OpenRouter) : à faire relire par un natif.\nimport type { LandingJob } from "./landingJob";\n\nexport const LANDING_JOB_GENERATED: Record<string, LandingJob> = ${JSON.stringify(gen, null, 2)};\n`);
console.log("\nok");

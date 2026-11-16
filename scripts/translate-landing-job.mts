// Traduit les nouvelles sections de la landing (src/i18n/landingJob.ts) dans toutes les langues publiques via fal.
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/translate-landing-job.mts
import { writeFileSync } from "node:fs";
import { LANDING_JOB } from "../src/i18n/landingJob.ts";
import { LOCALE_LABELS } from "../src/i18n/locales/index.ts";

async function llm(prompt: string): Promise<any> {
  for (const model of ["anthropic/claude-sonnet-5.5", "google/gemini-2.5-flash"]) {
    const r = await fetch("https://fal.run/openrouter/router/openai/v1/chat/completions", { method: "POST", headers: { authorization: "Key placeholder", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 3000, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }) });
    if (!r.ok) continue; const j: any = await r.json();
    try { return JSON.parse(String(j.choices?.[0]?.message?.content ?? "").replace(/^```(json)?|```$/g, "").trim()); } catch { /* suivant */ }
  }
  throw new Error("llm");
}
const out: Record<string, unknown> = {};
const langs = Object.keys(LOCALE_LABELS);
for (let i = 0; i < langs.length; i += 6) {
  await Promise.all(langs.slice(i, i + 6).map(async (l) => {
    const r = await llm(`Translate this JSON (recruitment landing page for paid UGC content creators) from English into the language "${LOCALE_LABELS[l]}" (code ${l}). Natural, friendly, informal "you" where usual. Keep every {{placeholder}} exactly, keep "UGC", "TikTok", "Instagram", "Ruul". The "warning" value must stay in UPPERCASE. Never add income promises. Return only JSON with exactly the same keys.\nEnglish:\n${JSON.stringify(LANDING_JOB.en)}\nFrench (reference):\n${JSON.stringify(LANDING_JOB.fr)}`);
    for (const [k, v] of Object.entries(LANDING_JOB.en)) {
      if (typeof r[k] !== "string") throw new Error(`${l}.${k}`);
      for (const ph of v.match(/\{\{\w+\}\}/g) ?? []) if (!r[k].includes(ph)) throw new Error(`${l}.${k} ${ph}`);
    }
    out[l] = r;
    process.stdout.write(`${l} `);
  }));
}
writeFileSync("src/i18n/landingJob.generated.ts", `// Généré par scripts/translate-landing-job.mts (fal / OpenRouter) : à faire relire par un natif.\nimport type { LandingJob } from "./landingJob";\n\nexport const LANDING_JOB_GENERATED: Record<string, LandingJob> = ${JSON.stringify(out, null, 2)};\n`);
console.log(`\n${Object.keys(out).length} langues`);

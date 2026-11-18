// Ajoute une clé à LANDING_JOB_GENERATED sans retraduire le reste : npx tsx scripts/translate-landing-key.mts pricePerVideo
import { writeFileSync } from "node:fs";
import { LANDING_JOB } from "../src/i18n/landingJob.ts";
import { readJobFiles, writeJobFiles } from "./lib/jobFiles.mts";
const LANDING_JOB_GENERATED = readJobFiles();
import { LOCALE_LABELS } from "../src/i18n/locales/index.ts";
const key = process.argv[2] as keyof typeof LANDING_JOB.en;
const langs = Object.keys(LANDING_JOB_GENERATED);
const r = await fetch("https://fal.run/openrouter/router/openai/v1/chat/completions", { method: "POST", headers: { authorization: "Key placeholder", "content-type": "application/json" },
  body: JSON.stringify({ model: "anthropic/claude-sonnet-5.5", max_tokens: 3000, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "user",
    content: `Short label on a mobile "Apply" button of a job page, shown after "Apply now · ". English: ${JSON.stringify(LANDING_JOB.en[key])}; French: ${JSON.stringify(LANDING_JOB.fr[key])}. Translate it into each language below, with natural word order, keeping {{price}} exactly (it becomes e.g. "3 US$"). No slash. Languages: ${JSON.stringify(Object.fromEntries(langs.map((l) => [l, LOCALE_LABELS[l]])))}. Return JSON {code: text}.` }] }) });
const j: any = await r.json();
const out = JSON.parse(String(j.choices[0].message.content).replace(/^```(json)?|```$/g, "").trim());
const gen: any = { ...LANDING_JOB_GENERATED };
for (const l of langs) { if (typeof out[l] !== "string" || !out[l].includes("{{price}}")) throw new Error(l); gen[l] = { ...gen[l], [key]: out[l] }; }
writeJobFiles(gen);
console.log(langs.map((l) => `${l}: ${out[l]}`).join(" | "));

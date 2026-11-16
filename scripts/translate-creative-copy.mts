// Génère les traductions des textes de créas (cartes offre d'emploi + offres d'emploi des nouvelles langues)
// via fal (OpenRouter), à partir de l'anglais et de l'espagnol. Écrit des fichiers *.generated.ts à faire relire.
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/translate-creative-copy.mts
import { writeFileSync } from "node:fs";
import { CARD_COPY } from "../supabase/functions/_shared/logic/cardCopy.ts";
import { JOB_COPY } from "../supabase/functions/_shared/logic/jobCopy.ts";
import { copyViolations } from "../supabase/functions/_shared/logic/jobCopy.ts";

const NAMES: Record<string, string> = {
  de: "German", it: "Italian", pt: "Brazilian Portuguese", nl: "Dutch", pl: "Polish", ro: "Romanian", cs: "Czech", sk: "Slovak",
  hu: "Hungarian", el: "Greek", bg: "Bulgarian", hr: "Croatian", sl: "Slovenian", sr: "Serbian (Latin script)", uk: "Ukrainian", tr: "Turkish",
  ar: "Arabic", he: "Hebrew", ja: "Japanese", ko: "Korean", sv: "Swedish", no: "Norwegian Bokmål", da: "Danish", fi: "Finnish",
  et: "Estonian", lv: "Latvian", lt: "Lithuanian", is: "Icelandic", hy: "Armenian", ka: "Georgian", kk: "Kazakh", hi: "Hindi",
  id: "Indonesian", ms: "Malay", th: "Thai", vi: "Vietnamese",
};
const NEW_JOB_LANGS = ["is", "hy", "ka", "kk", "hi", "id", "ms", "th", "vi"];

async function llm(prompt: string): Promise<any> {
  for (const model of ["anthropic/claude-sonnet-5.5", "google/gemini-2.5-flash"]) {
    const r = await fetch("https://fal.run/openrouter/router/openai/v1/chat/completions", {
      method: "POST", headers: { authorization: "Key placeholder", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 2500, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) { console.error(model, r.status, (await r.text()).slice(0, 200)); continue; }
    const j: any = await r.json();
    const t = j.choices?.[0]?.message?.content ?? "";
    try { return JSON.parse(t.replace(/^```(json)?|```$/g, "").trim()); } catch { console.error("json", t.slice(0, 200)); }
  }
  throw new Error("llm failed");
}

const RULES = `Rules: this is a job ad for paid UGC content creators (Meta "employment" ad). Keep it simple, casual, lowercase where the source is lowercase.
Never mention money amounts, income, "make money", "easy money", "from home", "up to". Never ask about a personal attribute (no "Student?").
Keep {{country}} and {{price}} placeholders exactly, keep the emojis (📱 ✅ 👇) at the same places, keep "18+", "UGC", "TikTok".
Return ONLY a JSON object with exactly the same keys as the English source.`;

const cards: Record<string, unknown> = {};
const jobs: Record<string, unknown> = {};
const langs = Object.keys(NAMES);
for (let i = 0; i < langs.length; i += 6) {
  await Promise.all(langs.slice(i, i + 6).map(async (l) => {
    const card = await llm(`Translate this job-ad card copy from English into ${NAMES[l]} (natural, as a native recruiter would write it). Spanish version given for reference.\n${RULES}\nEnglish:\n${JSON.stringify(CARD_COPY.en)}\nSpanish:\n${JSON.stringify(CARD_COPY.es)}`);
    if (!Array.isArray(card.primary) || Object.keys(CARD_COPY.en).some((k) => !(k in card)) || !String(card.title).includes("{{country}}")) throw new Error(`card ${l} invalide`);
    const issues = copyViolations(Object.values(card).flat().join(" · "), l);
    if (issues.length) console.warn(`⚠ card ${l}`, issues);
    cards[l] = card;
    if (NEW_JOB_LANGS.includes(l)) {
      const job = await llm(`Translate this job-ad copy from English into ${NAMES[l]}. Spanish for reference.\n${RULES}\nEnglish:\n${JSON.stringify(JOB_COPY.en)}\nSpanish:\n${JSON.stringify(JOB_COPY.es)}`);
      if (Object.keys(JOB_COPY.en).some((k) => !(k in job)) || !String(job.pay).includes("{{price}}")) throw new Error(`job ${l} invalide`);
      jobs[l] = job;
    }
    process.stdout.write(`${l} `);
  }));
}
const head = "// Généré par scripts/translate-creative-copy.mts (fal / OpenRouter) : traductions à faire relire par un natif.\n";
writeFileSync("supabase/functions/_shared/logic/cardCopy.generated.ts",
  `${head}import type { CardPack } from "./cardCopy.ts";\n\nexport const CARD_COPY_GENERATED: Record<string, CardPack> = ${JSON.stringify(cards, null, 2)};\n`);
writeFileSync("supabase/functions/_shared/logic/jobCopy.generated.ts",
  `${head}import type { JobPack } from "./jobCopy.ts";\n\nexport const JOB_COPY_GENERATED: Record<string, JobPack> = ${JSON.stringify(jobs, null, 2)};\n`);
console.log(`\n${Object.keys(cards).length} cartes, ${Object.keys(jobs).length} offres`);

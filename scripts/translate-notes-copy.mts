// Traduit le style « Notes iPhone » (notesCopy.ts) dans les 36 autres langues via fal. À faire relire par un natif.
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/translate-notes-copy.mts
import { writeFileSync } from "node:fs";
import { NOTES_COPY } from "../supabase/functions/_shared/logic/notesCopy.ts";
import { copyViolations } from "../supabase/functions/_shared/logic/jobCopy.ts";
const NAMES: Record<string, string> = {
  de: "German", it: "Italian", pt: "Brazilian Portuguese", nl: "Dutch", pl: "Polish", ro: "Romanian", cs: "Czech", sk: "Slovak",
  hu: "Hungarian", el: "Greek", bg: "Bulgarian", hr: "Croatian", sl: "Slovenian", sr: "Serbian (Cyrillic)", uk: "Ukrainian", tr: "Turkish",
  ar: "Arabic", he: "Hebrew", ja: "Japanese", ko: "Korean", sv: "Swedish", no: "Norwegian Bokmål", da: "Danish", fi: "Finnish",
  et: "Estonian", lv: "Latvian", lt: "Lithuanian", is: "Icelandic", hy: "Armenian", ka: "Georgian", kk: "Kazakh", hi: "Hindi",
  id: "Indonesian", ms: "Malay", th: "Thai", vi: "Vietnamese",
};
async function llm(prompt: string): Promise<any> {
  for (const model of ["anthropic/claude-sonnet-5.5", "google/gemini-2.5-flash"]) {
    const r = await fetch("https://fal.run/openrouter/router/openai/v1/chat/completions", { method: "POST", headers: { authorization: "Key placeholder", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 1500, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }) });
    if (!r.ok) continue;
    const j: any = await r.json();
    try { return JSON.parse(String(j.choices?.[0]?.message?.content ?? "").replace(/^```(json)?|```$/g, "").trim()); } catch { /* suivant */ }
  }
  throw new Error("llm");
}
const out: Record<string, unknown> = {};
const langs = Object.keys(NAMES);
for (let i = 0; i < langs.length; i += 6) {
  await Promise.all(langs.slice(i, i + 6).map(async (l) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await llm(`Translate this iPhone-Notes-style job ad for paid UGC content creators into ${NAMES[l]}. Casual, lowercase like the source, short lines.
"app" = the name of Apple's Notes app as shown on an iPhone set to ${NAMES[l]}. Keep "UGC" and the "↓" arrow. Never add money amounts, income claims, "make money", "from home", "up to", or questions about personal attributes. No first-person testimonial.
Return ONLY JSON with exactly the same keys (lines = array of 4 strings).
English: ${JSON.stringify(NOTES_COPY.en)}
French (reference): ${JSON.stringify(NOTES_COPY.fr)}`);
      const ok = ["app", "title", "subtitle", "cta"].every((k) => typeof r[k] === "string") && Array.isArray(r.lines) && r.lines.length === 4;
      const issues = ok ? copyViolations([r.title, r.subtitle, ...r.lines, r.cta].join(" · "), l) : ["shape"];
      if (ok && !issues.length) { out[l] = { app: r.app, title: r.title, subtitle: r.subtitle, lines: r.lines, cta: r.cta }; process.stdout.write(`${l} `); return; }
      console.error(l, issues);
    }
    throw new Error(l);
  }));
}
writeFileSync("supabase/functions/_shared/logic/notesCopy.generated.ts", `// Généré par scripts/translate-notes-copy.mts (fal / OpenRouter) : à faire relire par un natif.\nimport type { NotesPack } from "./notesCopy.ts";\n\nexport const NOTES_COPY_GENERATED: Record<string, NotesPack> = ${JSON.stringify(out, null, 2)};\n`);
console.log(`\n${Object.keys(out).length} langues`);

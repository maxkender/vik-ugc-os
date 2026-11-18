// Textes de la page job par langue : src/i18n/locales/job/<l>.json (chargés à la demande par l'app).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { LandingJob } from "../../src/i18n/landingJob.ts";
const DIR = "src/i18n/locales/job";
export function readJobFiles(): Record<string, LandingJob> {
  return Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(`${DIR}/${f}`, "utf8"))]));
}
export function writeJobFiles(all: Record<string, unknown>) {
  for (const [l, v] of Object.entries(all)) writeFileSync(`${DIR}/${l}.json`, JSON.stringify(v, null, 1));
}

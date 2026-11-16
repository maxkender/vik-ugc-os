import i18n, { type Resource } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en";
import es from "./es";
import fr from "./fr";
import { LOCALES, LOCALE_LABELS } from "./locales";
import { LANDING_JOB } from "./landingJob";

/** Langues proposées : English, Español, Français d'abord, puis le reste trié par nom natif. */
export const LANGS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  ...Object.keys(LOCALES)
    .map((code) => ({ code, label: LOCALE_LABELS[code] ?? code }))
    .sort((a, b) => a.label.localeCompare(b.label, "en")),
];

export const SUPPORTED_LANGS: string[] = LANGS.map((l) => l.code);

const resources: Resource = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
};
for (const [code, dict] of Object.entries(LOCALES)) resources[code] = { translation: dict };
// Titre et sous-titre de la landing au format offre d'emploi (16/11) : une seule source, landingJob.ts (40 langues).
for (const [code, r] of Object.entries(resources)) {
  const job = LANDING_JOB[code];
  const tr = (r as { translation: { landing?: Record<string, unknown> } }).translation;
  if (job && tr.landing) tr.landing = { ...tr.landing, title: job.heroTitle, subtitle: job.heroSubtitle };
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGS,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    returnObjects: true,
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lang",
      caches: ["localStorage"],
    },
  });

/** Langue d'interface pour une langue de pays : elle-même si traduite, sinon l'anglais. */
export function uiLangForCountry(lang: string | null | undefined): string {
  const l = (lang ?? "en").split("-")[0].toLowerCase();
  return SUPPORTED_LANGS.includes(l) ? l : "en";
}

export default i18n;

/** Langue et sens de lecture du document (arabe et hébreu de droite à gauche). */
function syncDocumentLanguage(lng: string) {
  if (typeof document === "undefined") return;
  const base = (lng || "en").split("-")[0];
  document.documentElement.lang = base;
  document.documentElement.dir = ["ar", "he"].includes(base) ? "rtl" : "ltr";
}
i18n.on("languageChanged", syncDocumentLanguage);
syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);

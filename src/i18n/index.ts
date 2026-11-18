import i18n, { type BackendModule, type ResourceKey } from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en";
import { LOCALE_LABELS } from "./locales/labels";
import { LANDING_JOB, type LandingJob } from "./landingJob";

/** Langues proposées : English, Español, Français d'abord, puis le reste trié par nom natif. */
export const LANGS: { code: string; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  ...Object.keys(LOCALE_LABELS)
    .map((code) => ({ code, label: LOCALE_LABELS[code] ?? code }))
    .sort((a, b) => a.label.localeCompare(b.label, "en")),
];

export const SUPPORTED_LANGS: string[] = LANGS.map((l) => l.code);

/*
 * Chargement à la demande (18/11, performance de la landing) : seul l'anglais (langue de repli) est dans le bundle
 * principal ; chaque autre langue (interface, espace créateur, textes de la page job) est un petit fichier chargé
 * seulement si le visiteur en a besoin. L'app attend la langue initiale avant le premier rendu (pas de flash anglais).
 */
const LOCALE_FILES = import.meta.glob<{ default: Record<string, unknown> }>(["./locales/*.ts", "!./locales/index.ts", "!./locales/types.ts", "!./locales/labels.ts"]);
const SPACE_FILES = import.meta.glob<{ default: Record<string, unknown> }>(["./locales/space/*.ts", "!./locales/space/index.ts", "!./locales/space/types.ts"]);
const JOB_FILES = import.meta.glob<{ default: LandingJob }>("./locales/job/*.json");

/** Dictionnaire complet d'une langue : interface + espace créateur + textes de la page job (titre au format offre d'emploi). */
function compose(base: Record<string, any>, job: LandingJob | undefined, space?: Record<string, unknown>) {
  const out: Record<string, any> = { ...base, ...(space ?? {}) };
  if (job) {
    out.job = job;
    if (out.landing) out.landing = { ...out.landing, title: job.heroTitle, subtitle: job.heroSubtitle };
  }
  return out;
}

async function loadLanguage(lng: string): Promise<Record<string, unknown>> {
  const l = lng.split("-")[0];
  const base = l === "fr" ? (await import("./fr")).default : l === "es" ? (await import("./es")).default
    : LOCALE_FILES[`./locales/${l}.ts`] ? (await LOCALE_FILES[`./locales/${l}.ts`]()).default : {};
  const space = SPACE_FILES[`./locales/space/${l}.ts`] ? (await SPACE_FILES[`./locales/space/${l}.ts`]()).default : undefined;
  const job = LANDING_JOB[l] ?? (JOB_FILES[`./locales/job/${l}.json`] ? (await JOB_FILES[`./locales/job/${l}.json`]()).default : undefined);
  return compose(base as Record<string, any>, job, space);
}

const lazyBackend: BackendModule = {
  type: "backend",
  init() { /* rien */ },
  read(language, _namespace, callback) {
    loadLanguage(language).then((d) => callback(null, d as ResourceKey), (e) => callback(e as Error, null));
  },
};

/** Résolu quand la langue initiale est chargée : main.tsx attend cette promesse avant le premier rendu. */
export const i18nReady = i18n
  .use(LanguageDetector)
  .use(lazyBackend)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: compose(en as Record<string, any>, LANDING_JOB.en) } },
    partialBundledLanguages: true,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGS,
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: { escapeValue: false },
    returnObjects: true,
    react: { useSuspense: false, bindI18n: "languageChanged loaded" },
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

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en";
import es from "./es";
import fr from "./fr";
import { LOCALES, LOCALE_LABELS } from "./locales";

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

const resources: Record<string, { translation: unknown }> = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
};
for (const [code, dict] of Object.entries(LOCALES)) resources[code] = { translation: dict };

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

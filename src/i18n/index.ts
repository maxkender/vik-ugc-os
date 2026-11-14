import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./en";
import es from "./es";
import fr from "./fr";

export const LANGS = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
];

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es }, fr: { translation: fr } },
  fallbackLng: "en",
  supportedLngs: ["en", "es", "fr"],
  nonExplicitSupportedLngs: true,
  interpolation: { escapeValue: false },
  returnObjects: true,
  detection: { order: ["querystring", "localStorage", "navigator"], lookupQuerystring: "lang", caches: ["localStorage"] },
});

/** Langue d'interface d'un pays : es pour les pays hispanophones, fr pour les francophones, sinon en. */
export function uiLangForCountry(lang: string | null | undefined): string {
  const l = (lang ?? "en").split("-")[0];
  return ["en", "es", "fr"].includes(l) ? l : "en";
}

export default i18n;

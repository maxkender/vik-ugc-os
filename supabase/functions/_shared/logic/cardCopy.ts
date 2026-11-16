/**
 * Style de créa « carte offre d'emploi » (modèle de la pub Serbie de Max, 16/11) : fond jaune Vik (#FFBB43),
 * carte blanche avec avatar « V » + « Vik Studios · emploi », titre « on cherche des personnes pour publier sur TikTok
 * en [pays] [drapeau] », 2 lignes simples, « postule ici 👇 », pied « Emploi · [pays] ». AUCUN montant (le plus sûr
 * côté politique Meta). Texte de pub (primary text) avec des ✅, CTA APPLY_NOW.
 * Le job (confirmé par Max le 16/11) : le créateur tourne SES PROPRES vidéos UGC de qualité (face cam, réaction, tuto…)
 * pour promouvoir une app, 2 par jour sur TikTok / Instagram, avec régularité, à partir d'un brief quotidien.
 * Traductions hors ES / EN / FR générées puis à faire relire par un natif. {{country}} = nom du pays dans la langue.
 */
import type { Hook } from "./creativeCopy.ts";
import { CARD_COPY_GENERATED } from "./cardCopy.generated.ts";
import { CARD_PRIMARY_FIRST, CARD_TITLES, IN_COUNTRY } from "./inCountry.generated.ts";

export interface CardPack {
  label: string;      // « empleo »
  title: string;      // « buscamos personas para publicar en TikTok en {{country}} »
  brief: string;      // « te enviamos el brief cada día, tú publicas 2 videos al día desde tu celular. »
  students: string;   // « ideal para estudiantes. pago cada semana. 18+. »
  nofollow: string;   // « no necesitas seguidores. pago cada semana. 18+. »
  flexible: string;   // « horario flexible. pago cada semana. 18+. »
  cta: string;        // « postúlate aquí 👇 »
  footer: string;     // « Empleo · {{country}} »
  primary: string[];  // texte de pub, lignes avec ✅
}

export const CARD_COPY: Record<string, CardPack> = {
  es: {
    label: "empleo", title: "buscamos personas para publicar en TikTok en {{country}}",
    brief: "grabas tus propios videos UGC de calidad para promocionar una app en TikTok e Instagram, 2 al día desde tu celular.",
    students: "ideal para estudiantes. pago cada semana. 18+.", nofollow: "no necesitas seguidores. pago cada semana. 18+.",
    flexible: "horario flexible. pago cada semana. 18+.", cta: "postúlate aquí 👇", footer: "Empleo · {{country}}",
    primary: ["Buscamos creadores/as de contenido en {{country}} 📱", "✅ Grabas tus propios videos UGC de calidad para promocionar una app", "✅ 2 videos al día en TikTok e Instagram, con constancia", "✅ Te enviamos un brief y un video de referencia cada día", "✅ No necesitas seguidores · pago semanal · 18+", "Postúlate en 3 minutos 👇"],
  },
  en: {
    label: "job", title: "we're looking for people to post on TikTok in {{country}}",
    brief: "you film your own quality UGC videos to promote an app on TikTok and Instagram, 2 a day from your phone.",
    students: "ideal for students. paid every week. 18+.", nofollow: "no followers needed. paid every week. 18+.",
    flexible: "flexible hours. paid every week. 18+.", cta: "apply here 👇", footer: "Job · {{country}}",
    primary: ["We're hiring content creators in {{country}} 📱", "✅ You film your own quality UGC videos to promote an app", "✅ 2 videos a day on TikTok and Instagram, consistently", "✅ We send you a brief and a reference video every day", "✅ No followers needed · paid weekly · 18+", "Apply in 3 minutes 👇"],
  },
  fr: {
    label: "emploi", title: "on cherche des personnes pour publier sur TikTok en {{country}}",
    brief: "tu tournes tes propres vidéos UGC de qualité pour promouvoir une app sur TikTok et Instagram, 2 par jour depuis ton téléphone.",
    students: "idéal pour les étudiant·e·s. payé chaque semaine. 18+.", nofollow: "pas besoin d'abonnés. payé chaque semaine. 18+.",
    flexible: "horaires flexibles. payé chaque semaine. 18+.", cta: "postule ici 👇", footer: "Emploi · {{country}}",
    primary: ["On recrute des créateur·rice·s de contenu en {{country}} 📱", "✅ Tu tournes tes propres vidéos UGC de qualité pour promouvoir une app", "✅ 2 vidéos par jour sur TikTok et Instagram, avec régularité", "✅ On t'envoie un brief et une vidéo de référence chaque jour", "✅ Pas besoin d'abonnés · paiement chaque semaine · 18+", "Postule en 3 minutes 👇"],
  },
  ...CARD_COPY_GENERATED,
};

/** Drapeau emoji d'un code pays ISO (MX → 🇲🇽). */
export function flagEmoji(code: string): string {
  return code.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));
}

export function countryName(code: string, lang: string): string {
  try { return new Intl.DisplayNames([lang], { type: "region" }).of(code.toUpperCase()) ?? code; } catch { return code; }
}

/** Textes de la carte pour une langue, une accroche et un pays. */
export function cardCopy(lang: string | null | undefined, hook: Hook, country: string) {
  const l = (lang ?? "en").split("-")[0];
  const known = CARD_COPY[l] ? l : "en";
  const p = CARD_COPY[known];
  const name = countryName(country, known);
  const fill = (s: string) => s.replace(/\{\{country\}\}/g, name);
  // « en [pays] » décliné (au Mexique, у Србији, no Brasil…) quand on le connaît, sinon le titre d'origine.
  const inC = IN_COUNTRY[known]?.[country.toUpperCase()];
  const title = inC && CARD_TITLES[known] ? CARD_TITLES[known].replace("{{in_country}}", inC) : fill(p.title);
  const first = inC && CARD_PRIMARY_FIRST[known] ? CARD_PRIMARY_FIRST[known].replace("{{in_country}}", inC) : inC && CARD_TITLES[known] ? `${title} 📱` : fill(p.primary[0]);
  return {
    lang: known,
    label: p.label,
    title: `${title} ${flagEmoji(country)}`,
    lines: [p.brief, hook === "student" ? p.students : hook === "nofollow" ? p.nofollow : p.flexible],
    cta: p.cta,
    footer: fill(p.footer),
    primary: [first, ...p.primary.slice(1).map(fill)].join("\n"),
  };
}

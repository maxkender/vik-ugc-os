/**
 * Style de créa « Notes iPhone » (décision de Max, 16/11) : fond blanc, en-tête « < Notes » + « ⋯ » orange iOS,
 * date grise centrée, titre gras, sous-titre, 4 lignes avec flèches orange, appel « postule via le lien ↓ ».
 * Aucun montant, pas de faux témoignage à la 1re personne. EN / FR / ES à la main, autres langues générées
 * (scripts/translate-notes-copy.mts) et à faire relire.
 */
import { NOTES_COPY_GENERATED } from "./notesCopy.generated.ts";

export interface NotesPack {
  app: string;        // nom de l'app Notes dans la langue (« Notas », « Notizen »…)
  title: string;      // « job étudiant dispo en ce moment : »
  subtitle: string;   // « créateur·rice de contenu UGC pour une app mobile »
  lines: string[];    // 4 lignes
  cta: string;        // « postule via le lien ↓ »
}

export const NOTES_COPY: Record<string, NotesPack> = {
  en: { app: "Notes", title: "student job available right now:", subtitle: "UGC content creator for a mobile app",
    lines: ["1 video a day with your phone", "we send you a brief + an example video", "no followers needed", "paid every week"], cta: "apply via the link ↓" },
  fr: { app: "Notes", title: "job étudiant dispo en ce moment :", subtitle: "créateur·rice de contenu UGC pour une app mobile",
    lines: ["1 vidéo par jour avec ton téléphone", "on t'envoie un brief + une vidéo exemple", "pas besoin d'avoir des abonnés", "payé chaque semaine"], cta: "postule via le lien ↓" },
  es: { app: "Notas", title: "trabajo para estudiantes disponible ahora:", subtitle: "creador/a de contenido UGC para una app móvil",
    lines: ["1 video al día con tu celular", "te enviamos un brief + un video de ejemplo", "no necesitas tener seguidores", "pago cada semana"], cta: "postúlate en el link ↓" },
  ...NOTES_COPY_GENERATED,
};

/** Textes Notes d'une langue (repli anglais) + date du jour au format local (« 16 nov. 2026 à 10:42 »). */
export function notesCopy(lang: string | null | undefined, now = new Date()) {
  const l = (lang ?? "en").split("-")[0];
  const known = NOTES_COPY[l] ? l : "en";
  let date = "";
  try {
    date = new Intl.DateTimeFormat(lang ?? known, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(now);
  } catch { date = now.toISOString().slice(0, 10); }
  return { lang: known, ...NOTES_COPY[known], date };
}

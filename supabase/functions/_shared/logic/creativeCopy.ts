/**
 * Constantes communes aux créas de recrutement. Les anciens textes v2 (« Gagne X par vidéo », « Jusqu'à ~X/mois »)
 * ont été supprimés le 16/11 : format offre d'emploi uniquement (cardCopy, notesCopy, jobCopy), sans montant mensuel.
 * Hooks = la 2e ligne de la carte : student (« idéal pour les étudiant·e·s »), nofollow (« pas besoin d'abonnés »),
 * earn (« horaires flexibles », nom historique gardé pour les données existantes).
 */
import { CARD_COPY } from "./cardCopy.ts";

export type Hook = "student" | "earn" | "nofollow";

export const HOOKS: Array<{ value: Hook; label: string }> = [
  { value: "student", label: "Idéal pour les étudiant·e·s" },
  { value: "nofollow", label: "Pas besoin d'abonnés" },
  { value: "earn", label: "Horaires flexibles" },
];

/** Langues couvertes par les créas (une par pays ouvert). */
export const CREATIVE_LANGS = Object.keys(CARD_COPY);

export const RTL_LANGS = new Set(["ar", "he"]);

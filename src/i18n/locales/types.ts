import type { Dict } from "../en";

/** Espaces publics traduits dans toutes les langues des pays (landing « job », candidature, signature). */
export type PublicDict = Pick<Dict, "common" | "landing" | "apply" | "sign">;

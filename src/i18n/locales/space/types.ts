import type { Dict } from "../../en";

/** Espace créateur traduit (compte, connexion, briefs, paiements). */
export type SpaceDict = Pick<Dict, "account" | "login" | "creator">;

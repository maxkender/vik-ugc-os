/**
 * Candidature sans vidéo (17/11, Max) : 3 jours pour ajouter la vidéo de présentation.
 * Relances à J+1 (« plus que 2 jours ») et J+2 (« dernier jour »), expiration à J+3.
 */
export const VIDEO_DAYS = 3;
const H = 3_600_000;

export type VideoStep = "remind_1" | "remind_2" | "expire" | null;

export function videoStep(pendingSince: string | Date, reminders: number, now = new Date()): VideoStep {
  const age = now.getTime() - new Date(pendingSince).getTime();
  if (age >= VIDEO_DAYS * 24 * H) return "expire";
  if (age >= 48 * H && reminders < 2) return "remind_2";
  if (age >= 24 * H && reminders < 1) return "remind_1";
  return null;
}

export function videoDueAt(from = new Date()): Date {
  return new Date(from.getTime() + VIDEO_DAYS * 24 * H);
}

/** Jours restants affichés (arrondi au-dessus, minimum 0). */
export function videoDaysLeft(dueAt: string | Date, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(dueAt).getTime() - now.getTime()) / (24 * H)));
}

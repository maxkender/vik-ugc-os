/**
 * Relances (mêmes règles que sophia-os, _shared/ruul.ts).
 *
 * Signature : J+1, J+3, J+6 après l'envoi du contrat ; J+7 sans signature : expiré.
 * Ruul : invitation dès « Ajouté sur Ruul », relance J+1, relance J+3 ;
 * J+5 sans « It's done » → à traiter à la main (problème).
 */
const DAY = 86_400_000;

export type SignatureStep = 1 | 3 | 6 | "expire" | null;

export function signatureStep(sentAt: string, reminders: number, now = new Date()): SignatureStep {
  const days = (now.getTime() - new Date(sentAt).getTime()) / DAY;
  if (days >= 7) return "expire";
  if (reminders <= 0 && days >= 1) return 1;
  if (reminders === 1 && days >= 3) return 3;
  if (reminders === 2 && days >= 6) return 6;
  return null;
}

export type RuulStep = "invite" | "reminder1" | "reminder3" | "problem" | null;

export interface RuulState {
  status: string;              // none | email_given | added | done | stopped
  added_at: string | null;
  reminders: number;
}

export function ruulStep(s: RuulState, now = new Date()): RuulStep {
  if (s.status !== "added" || !s.added_at) return null;
  const age = now.getTime() - new Date(s.added_at).getTime();
  if (s.reminders <= 0) return "invite";
  if (s.reminders === 1 && age >= DAY) return "reminder1";
  if (s.reminders === 2 && age >= 3 * DAY) return "reminder3";
  if (s.reminders === 3 && age >= 5 * DAY) return "problem";
  return null;
}

/** Mesures de vues : J+2 et J+7 après publication (le RPM se calcule sur J+7). */
export type ViewsCheckpoint = "d2" | "d7" | null;

export function viewsCheckpoint(
  a: { posted_at: string | null; views_d2_at: string | null; views_d7_at: string | null },
  now = new Date(),
): ViewsCheckpoint {
  if (!a.posted_at) return null;
  // Jours calendaires UTC (même règle que la paie et l'affichage « J+7 le … ») : le relevé du matin
  // (06:40 UTC) prend les vidéos dont le J+7 tombe aujourd'hui, pas le lendemain.
  const day = (d: Date | string) => Date.parse(new Date(d).toISOString().slice(0, 10));
  const age = (day(now) - day(a.posted_at)) / DAY;
  if (age >= 7 && !a.views_d7_at) return "d7";
  if (age >= 2 && age < 7 && !a.views_d2_at) return "d2";
  return null;
}

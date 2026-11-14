/**
 * Garde-fou email. Décide, pour un email de l'outbox, s'il part et à qui.
 *   - mode test (défaut) : tout est redirigé vers l'email admin de test ;
 *   - mode test sans email de test : rien ne part (reste dans l'outbox, « held ») ;
 *   - pas d'expéditeur Brevo configuré : rien ne part ;
 *   - mode réel : part au vrai destinataire.
 */
export interface EmailSettings {
  test_mode: boolean;
  test_recipient: string;
  sender_email: string;
  sender_name?: string;
}
export type EmailRoute =
  | { send: true; to: string; redirected: boolean; subjectPrefix: string }
  | { send: false; reason: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function routeEmail(to: string, s: EmailSettings): EmailRoute {
  if (!s.sender_email || !EMAIL_RE.test(s.sender_email)) return { send: false, reason: "no_sender" };
  if (s.test_mode !== false) {
    if (!s.test_recipient || !EMAIL_RE.test(s.test_recipient)) return { send: false, reason: "test_mode_no_recipient" };
    return { send: true, to: s.test_recipient, redirected: true, subjectPrefix: `[TEST → ${to}] ` };
  }
  if (!EMAIL_RE.test(to)) return { send: false, reason: "invalid_recipient" };
  return { send: true, to, redirected: false, subjectPrefix: "" };
}

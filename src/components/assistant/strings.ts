// Libellés de l'assistant posteurs (gardés ici : le dossier i18n appartient à un autre chantier).
export type AssistantUiLang = "en" | "fr" | "es";

export interface AssistantStrings {
  open: string; title: string; subtitle: string; close: string; placeholder: string; send: string; typing: string;
  team: string; you: string; escalated: string; notConfigured: string; disabled: string;
  remaining: (n: number) => string; hello: (name?: string | null) => string; chips: string[]; error: string;
}

const STRINGS: Record<AssistantUiLang, AssistantStrings> = {
  en: {
    open: "Ask the assistant",
    title: "Vik assistant",
    subtitle: "Briefs, views, pay: ask me anything",
    close: "Close",
    placeholder: "Write your question…",
    send: "Send",
    typing: "The assistant is typing",
    team: "Vik team",
    you: "You",
    escalated: "Forwarded to the team",
    notConfigured: "The assistant isn't configured yet. You can still write: the team will read your message.",
    disabled: "The assistant is turned off for now.",
    remaining: (n: number) => `${n} message${n === 1 ? "" : "s"} left today`,
    hello: (name?: string | null) => `Hi${name ? ` ${name}` : ""}! I can help with your briefs, submitting videos, views and payments.`,
    chips: ["When do I get paid?", "How do I submit my video?", "Why was my video rejected?"],
    error: "Couldn't send. Try again.",
  },
  fr: {
    open: "Poser une question à l'assistant",
    title: "Assistant Vik",
    subtitle: "Briefs, vues, paiements : demande-moi",
    close: "Fermer",
    placeholder: "Écris ta question…",
    send: "Envoyer",
    typing: "L'assistant écrit",
    team: "Équipe Vik",
    you: "Toi",
    escalated: "Transmis à l'équipe",
    notConfigured: "L'assistant n'est pas encore configuré. Tu peux quand même écrire : l'équipe lira ton message.",
    disabled: "L'assistant est désactivé pour le moment.",
    remaining: (n: number) => `${n} message${n > 1 ? "s" : ""} restant${n > 1 ? "s" : ""} aujourd'hui`,
    hello: (name?: string | null) => `Salut${name ? ` ${name}` : ""} ! Je peux t'aider pour tes briefs, l'envoi de tes vidéos, tes vues et tes paiements.`,
    chips: ["Quand suis-je payé ?", "Comment soumettre ma vidéo ?", "Pourquoi ma vidéo est refusée ?"],
    error: "Envoi impossible. Réessaie.",
  },
  es: {
    open: "Pregunta al asistente",
    title: "Asistente Vik",
    subtitle: "Briefs, vistas, pagos: pregúntame",
    close: "Cerrar",
    placeholder: "Escribe tu pregunta…",
    send: "Enviar",
    typing: "El asistente está escribiendo",
    team: "Equipo Vik",
    you: "Tú",
    escalated: "Enviado al equipo",
    notConfigured: "El asistente aún no está configurado. Puedes escribir igualmente: el equipo leerá tu mensaje.",
    disabled: "El asistente está desactivado por ahora.",
    remaining: (n: number) => `Te quedan ${n} mensaje${n === 1 ? "" : "s"} hoy`,
    hello: (name?: string | null) => `¡Hola${name ? ` ${name}` : ""}! Te ayudo con tus briefs, el envío de vídeos, las vistas y los pagos.`,
    chips: ["¿Cuándo me pagan?", "¿Cómo envío mi vídeo?", "¿Por qué rechazaron mi vídeo?"],
    error: "No se pudo enviar. Inténtalo de nuevo.",
  },
};

export function assistantStrings(lang: string | null | undefined): AssistantStrings {
  const code = (lang ?? "").toLowerCase().slice(0, 2);
  return code === "fr" || code === "es" ? STRINGS[code] : STRINGS.en;
}

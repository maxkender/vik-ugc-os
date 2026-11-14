/**
 * Détection de langue très légère (mots-outils), en secours quand la
 * plateforme ne la donne pas. Renvoie null si le texte est trop court ou ambigu.
 */
const STOP: Record<string, string[]> = {
  en: ["the", "and", "you", "this", "that", "with", "for", "your", "is", "are", "my", "how", "what", "when", "app", "study"],
  fr: ["le", "la", "les", "et", "tu", "est", "pour", "des", "une", "avec", "pas", "que", "mon", "ton", "réviser", "cours"],
  es: ["el", "la", "los", "las", "y", "que", "para", "con", "una", "por", "es", "mi", "tu", "estudiar", "como"],
  de: ["der", "die", "das", "und", "ist", "du", "nicht", "mit", "für", "ich", "ein", "eine", "lernen", "wie"],
  pt: ["o", "os", "as", "e", "que", "para", "com", "uma", "não", "você", "estudar", "meu", "do", "da"],
  it: ["il", "lo", "gli", "e", "che", "per", "con", "una", "non", "sono", "studiare", "come", "di", "del"],
};

export function detectLanguage(text: string | null | undefined): string | null {
  if (!text) return null;
  const words = text.toLowerCase().replace(/#[\p{L}\p{N}_]+/gu, " ").match(/\p{L}+/gu) ?? [];
  if (words.length < 3) return null;
  let best: string | null = null;
  let bestScore = 0;
  let second = 0;
  for (const [lang, stop] of Object.entries(STOP)) {
    const set = new Set(stop);
    const s = words.filter((w) => set.has(w)).length;
    if (s > bestScore) {
      second = bestScore;
      bestScore = s;
      best = lang;
    } else if (s > second) second = s;
  }
  return bestScore >= 2 && bestScore > second ? best : null;
}

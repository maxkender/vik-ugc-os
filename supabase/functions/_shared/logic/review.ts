/** Retours aux créateurs : libellés (EN / FR / ES ; repli EN), texte d'email, statistiques. */
export type Verdict = "validated" | "changes_requested" | "rejected";
export const REVIEW_CHECKS = ["hook", "pacing", "sound", "onscreen_text", "duration", "quality", "instructions"] as const;
export type ReviewCheck = (typeof REVIEW_CHECKS)[number];

type L = "en" | "fr" | "es";
const VERDICT: Record<L, Record<Verdict, string>> = {
  en: { validated: "validated ✅", changes_requested: "to fix ✏️", rejected: "rejected" },
  fr: { validated: "validée ✅", changes_requested: "à corriger ✏️", rejected: "refusée" },
  es: { validated: "validado ✅", changes_requested: "por corregir ✏️", rejected: "rechazado" },
};
export const CHECK_LABELS: Record<L, Record<ReviewCheck, string>> = {
  en: { hook: "Hook", pacing: "Pacing", sound: "Sound", onscreen_text: "On-screen text", duration: "Length", quality: "Image quality", instructions: "Brief instructions" },
  fr: { hook: "Hook", pacing: "Rythme", sound: "Son", onscreen_text: "Texte à l'écran", duration: "Durée", quality: "Qualité d'image", instructions: "Consignes du brief" },
  es: { hook: "Hook", pacing: "Ritmo", sound: "Sonido", onscreen_text: "Texto en pantalla", duration: "Duración", quality: "Calidad de imagen", instructions: "Instrucciones del brief" },
};
const POINTS: Record<L, string> = { en: "Points to work on", fr: "Points à revoir", es: "Puntos a mejorar" };
const FIX: Record<L, string> = {
  en: ', then post the corrected video and tap "I fixed it" with the new link',
  fr: ", puis publie la vidéo corrigée et appuie sur « J'ai corrigé » avec le nouveau lien",
  es: ", luego publica el video corregido y toca «Ya lo corregí» con el nuevo enlace",
};
const lang = (l: string | null | undefined): L => {
  const x = (l ?? "en").slice(0, 2);
  return x === "fr" || x === "es" ? x : "en";
};

export function verdictLabel(v: Verdict, l?: string | null) { return VERDICT[lang(l)][v]; }
export function checkLabel(c: string, l?: string | null) { return (CHECK_LABELS[lang(l)] as Record<string, string>)[c] ?? c; }

/** Variables de l'email « post_feedback ». */
export function feedbackEmailVars(p: {
  firstName: string; briefTitle: string; verdict: Verdict; comment?: string | null; checks?: string[]; timestamps?: { t: string; note?: string }[]; language?: string | null;
}) {
  const l = lang(p.language);
  const items = [
    ...(p.checks ?? []).map((c) => `• ${checkLabel(c, l)}`),
    ...(p.timestamps ?? []).filter((t) => t.t).map((t) => `• ${t.t}${t.note ? ` : ${t.note}` : ""}`),
  ];
  return {
    first_name: p.firstName, brief_title: p.briefTitle, verdict: verdictLabel(p.verdict, l),
    comment: (p.comment ?? "").trim(),
    points: items.length ? `${POINTS[l]} :\n${items.join("\n")}` : "",
    fix_hint: p.verdict === "changes_requested" ? FIX[l] : "",
  };
}

/** « 0:04 », « 1:20 », « 12 » → secondes (null si invalide). */
export function parseTimestamp(t: string): number | null {
  const m = /^\s*(?:(\d{1,2}):)?(\d{1,2})\s*$/.exec(t);
  if (!m) return null;
  const s = Number(m[2]) + Number(m[1] ?? 0) * 60;
  return m[1] && Number(m[2]) > 59 ? null : s;
}

export interface ReviewRow { poster_id: string; verdict: Verdict; checks: string[] }
/** Par posteur : nombre de retours, taux de validation, points les plus fréquents. Global : points les plus fréquents. */
export function reviewStats(rows: ReviewRow[]) {
  const by = new Map<string, { total: number; validated: number; changes: number; rejected: number; issues: Map<string, number> }>();
  const global = new Map<string, number>();
  for (const r of rows) {
    const s = by.get(r.poster_id) ?? { total: 0, validated: 0, changes: 0, rejected: 0, issues: new Map() };
    s.total++;
    if (r.verdict === "validated") s.validated++; else if (r.verdict === "changes_requested") s.changes++; else s.rejected++;
    for (const c of r.checks ?? []) { s.issues.set(c, (s.issues.get(c) ?? 0) + 1); global.set(c, (global.get(c) ?? 0) + 1); }
    by.set(r.poster_id, s);
  }
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([check, n]) => ({ check, n }));
  return {
    posters: [...by.entries()].map(([poster_id, s]) => ({
      poster_id, total: s.total, validated: s.validated, changes: s.changes, rejected: s.rejected,
      validation_rate: s.total ? Math.round((100 * s.validated) / s.total) : 0, top_issues: top(s.issues).slice(0, 3),
    })).sort((a, b) => b.total - a.total),
    top_issues: top(global),
  };
}

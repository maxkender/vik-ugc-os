/**
 * Score de performance d'une vidéo (0–100).
 *
 * Organique : on cherche « ce qui perce », pas « ce qui est gros ».
 *   - percée : vues rapportées aux abonnés de l'auteur (un compte de 2 k
 *     abonnés qui fait 500 k vues pèse plus qu'un compte de 5 M qui en fait 1 M) ;
 *   - vélocité : vues par jour depuis la publication (amortie) ;
 *   - engagement : (likes + 2·commentaires + 3·partages) / vues.
 * Pubs (Ad Library) : la longévité de diffusion (une pub qui tourne longtemps
 * est une pub rentable), avec un bonus si elle tourne encore.
 */
export interface ScoreInput {
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  followers?: number | null;
  publishedAt?: string | Date | null;
  isAd?: boolean;
  adDays?: number | null;
  adActive?: boolean | null;
}

const DAY = 86_400_000;
const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const round1 = (x: number) => Math.round(x * 10) / 10;

export function ageDays(publishedAt: string | Date | null | undefined, now = new Date()): number | null {
  if (!publishedAt) return null;
  const t = new Date(publishedAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, (now.getTime() - t) / DAY);
}

export function adScore(adDays: number | null | undefined, active: boolean | null | undefined): number {
  const d = Math.max(0, adDays ?? 0);
  return round1(clamp(25 * Math.log2(1 + d / 7) + (active ? 10 : 0)));
}

export function organicScore(i: ScoreInput, now = new Date()): number {
  const views = Math.max(0, i.views ?? 0);
  if (views === 0) return 0;
  const followers = Math.max(500, i.followers ?? 0);
  const age = Math.max(1, ageDays(i.publishedAt ?? null, now) ?? 30);
  // percée : 0 (vues = abonnés/1) … 2 (vues = 100× abonnés) → 0..40
  const breakout = clamp((Math.log10(1 + views / followers) / 2) * 40, 0, 40);
  // vélocité : vues/jour amorties, 1 M/jour ≈ plafond → 0..40
  const velocity = clamp((Math.log10(1 + views / Math.pow(age, 0.7)) / 6) * 40, 0, 40);
  const eng = ((i.likes ?? 0) + 2 * (i.comments ?? 0) + 3 * (i.shares ?? 0)) / views;
  const engagement = clamp((eng / 0.2) * 20, 0, 20);
  return round1(clamp(breakout + velocity + engagement));
}

/**
 * Score de tri. Une pub n'a pas de vues publiques : elle ne doit pas passer devant les vidéos
 * qui ont des métriques (retour du 15/11). Son score est 0 (« n/a » à l'écran) ; sa longévité
 * reste visible via ad_days et `adScore` (vue « Pubs gagnantes »).
 */
export function performanceScore(i: ScoreInput, now = new Date()): number {
  return i.isAd ? 0 : organicScore(i, now);
}

/**
 * Répartition automatique des briefs sur la file du jour.
 *
 * Chaque posteur actif a un quota quotidien (2 par défaut). Un brief adressé
 * à un pool demande `remaining` exécutions. On sert les briefs du plus ancien
 * au plus récent ; pour chacun on choisit les posteurs compatibles (pays
 * cibles, langue) qui ont encore de la place aujourd'hui et ne l'ont pas déjà
 * reçu, en privilégiant les moins chargés. Déterministe (tests).
 */
export interface DispatchPoster {
  id: string;
  country: string | null;
  language: string | null;
  daily_quota: number;
  assigned_today: number;
  total_assigned: number;
}
export interface DispatchBrief {
  id: string;
  created_at: string;
  member_ids: string[];          // posteurs du pool (vide = tous les actifs)
  target_countries: string[];
  language: string | null;
  remaining: number;
  already_assigned: string[];
}
export interface NewAssignment {
  brief_id: string;
  poster_id: string;
  due_date: string;
}

export function compatible(p: DispatchPoster, b: DispatchBrief): boolean {
  if (b.member_ids.length > 0 && !b.member_ids.includes(p.id)) return false;
  if (b.target_countries.length > 0 && (!p.country || !b.target_countries.includes(p.country))) return false;
  if (b.language && p.language && b.language.split("-")[0] !== p.language.split("-")[0]) return false;
  if (b.already_assigned.includes(p.id)) return false;
  return true;
}

export function dispatchBriefs(posters: DispatchPoster[], briefs: DispatchBrief[], dueDate: string): NewAssignment[] {
  const load = new Map(posters.map((p) => [p.id, { today: p.assigned_today, total: p.total_assigned }]));
  const out: NewAssignment[] = [];
  const ordered = [...briefs].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  for (const b of ordered) {
    let need = Math.max(0, b.remaining);
    if (need === 0) continue;
    const candidates = posters
      .filter((p) => compatible(p, b) && load.get(p.id)!.today < p.daily_quota)
      .sort((x, y) => {
        const lx = load.get(x.id)!, ly = load.get(y.id)!;
        return lx.today - ly.today || lx.total - ly.total || x.id.localeCompare(y.id);
      });
    for (const p of candidates) {
      if (need === 0) break;
      out.push({ brief_id: b.id, poster_id: p.id, due_date: dueDate });
      const l = load.get(p.id)!;
      l.today++;
      l.total++;
      need--;
    }
  }
  return out;
}

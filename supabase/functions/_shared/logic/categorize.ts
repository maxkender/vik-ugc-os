/**
 * Auto-catégorisation des vidéos. Heuristique sur légende + hashtags au
 * départ ; l'interface `Classifier` permet de brancher un classifieur IA
 * plus tard (même signature, asynchrone).
 */
export interface CategoryDef {
  id: string;
  slug: string;
  keywords: string[];
}
export interface ClassifiableVideo {
  caption?: string | null;
  hashtags?: string[] | null;
  duration_s?: number | null;
  is_ad?: boolean;
  raw_type?: string | null;   // ex. « Sidecar » / « slideshow » quand la plateforme le dit
}
export interface Classification {
  category_id: string | null;
  confidence: number;          // 0..1
  matched: string[];
}
export interface Classifier {
  name: string;
  classify(v: ClassifiableVideo, categories: CategoryDef[]): Promise<Classification>;
}

export function normalizeText(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function heuristicClassify(v: ClassifiableVideo, categories: CategoryDef[]): Classification {
  const tags = (v.hashtags ?? []).map((h) => normalizeText(h.replace(/^#/, "")));
  const text = normalizeText(`${v.caption ?? ""} ${tags.map((t) => `#${t}`).join(" ")}`);
  let best: Classification = { category_id: null, confidence: 0, matched: [] };
  for (const c of categories) {
    const matched: string[] = [];
    let score = 0;
    for (const kw of c.keywords) {
      const k = normalizeText(kw.replace(/^#/, ""));
      if (!k) continue;
      const compact = k.replace(/[\s-]+/g, "");
      if (tags.includes(compact) || tags.includes(k)) {
        score += 2;
        matched.push(kw);
      } else if (new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(text)) {
        score += 1;
        matched.push(kw);
      }
    }
    if (c.slug === "slideshow" && v.raw_type && /sidecar|slideshow|image|carousel/i.test(v.raw_type)) {
      score += 3;
      matched.push(`type:${v.raw_type}`);
    }
    const confidence = Math.min(1, score / 4);
    if (score > 0 && confidence > best.confidence) best = { category_id: c.id, confidence, matched };
  }
  return best;
}

export const heuristicClassifier: Classifier = {
  name: "heuristic-v1",
  classify: async (v, cats) => heuristicClassify(v, cats),
};

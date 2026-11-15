/**
 * Attribution d'une vidéo à un concurrent.
 *   - official : l'auteur est un compte officiel du concurrent ;
 *   - ad       : pub de la Ad Library dont la page correspond à la marque ;
 *   - ugc      : un créateur tiers mentionne la marque (@mention, #hashtag ou mot dans la légende) ;
 *   - other    : rien de reconnu (la vidéo reste dans la bibliothèque, sans concurrent).
 * Les termes courts ou ambigus (ex. « diane ») ne comptent que sous une forme composée ou en @/# ;
 * c'est à `brand_terms` d'être précis (éditable dans Réglages → Concurrents).
 */
export interface CompetitorTerms {
  id: string;
  name: string;
  brand_terms: string[];
  official_handles: string[];
}
export interface AttributableVideo {
  author_handle: string | null;
  caption: string | null;
  hashtags: string[];
  mentions?: string[];
  is_ad: boolean;
  ad_page_name?: string | null;
}
export interface Attribution {
  competitor_id: string | null;
  origin: "official" | "ugc" | "ad" | "other";
  matched: string | null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const compact = (s: string) => norm(s).replace(/[\s._\-@#]+/g, "");

export function attributeVideo(v: AttributableVideo, competitors: CompetitorTerms[], hint: string | null = null): Attribution {
  const author = v.author_handle ? norm(v.author_handle) : "";
  // 1. compte officiel
  for (const c of competitors) {
    if (c.official_handles.some((h) => norm(h) === author)) return { competitor_id: c.id, origin: "official", matched: author };
  }
  const tags = new Set((v.hashtags ?? []).map(compact));
  const mentions = new Set((v.mentions ?? []).map(compact));
  const text = ` ${norm(v.caption ?? "")} `;
  const page = v.ad_page_name ? compact(v.ad_page_name) : "";
  for (const c of competitors) {
    const terms = [...c.brand_terms, ...c.official_handles];
    for (const t of terms) {
      const ct = compact(t);
      if (!ct || ct.length < 4) continue;
      // 2. pub : page de la marque
      if (v.is_ad && page && (page === ct || page.startsWith(ct))) return { competitor_id: c.id, origin: "ad", matched: t };
      // 3. UGC : mention, hashtag ou terme dans la légende
      if (mentions.has(ct) || [...mentions].some((m) => m.startsWith(ct))) return { competitor_id: c.id, origin: v.is_ad ? "ad" : "ugc", matched: `@${t}` };
      if (tags.has(ct)) return { competitor_id: c.id, origin: v.is_ad ? "ad" : "ugc", matched: `#${t}` };
      const phrase = norm(t);
      if (phrase.length >= 5 && new RegExp(`[^a-z0-9]${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z0-9]`).test(text)) {
        return { competitor_id: c.id, origin: v.is_ad ? "ad" : "ugc", matched: t };
      }
    }
  }
  // 4. indice de la source (ex. run lancé sur la page FB ou le hashtag d'un concurrent)
  if (hint) return { competitor_id: hint, origin: v.is_ad ? "ad" : "ugc", matched: "source" };
  return { competitor_id: null, origin: v.is_ad ? "ad" : "other", matched: null };
}

/** Métriques dérivées affichées et triables partout. */
export function derivedMetrics(v: { views: number | null; likes: number | null; comments: number | null; shares: number | null; author_followers: number | null; published_at: string | null }, now = new Date()) {
  const views = v.views ?? null;
  const engagement = views && views > 0 ? Math.round((((v.likes ?? 0) + 2 * (v.comments ?? 0) + 3 * (v.shares ?? 0)) / views) * 10000) / 10000 : null;
  const outlier = views !== null ? Math.round((views / Math.max(v.author_followers ?? 0, 500)) * 100) / 100 : null;
  const days = v.published_at ? Math.max(1, (now.getTime() - new Date(v.published_at).getTime()) / 86_400_000) : null;
  const velocity = views !== null && days ? Math.round((views / days) * 10) / 10 : null;
  return { engagement, outlier, velocity };
}

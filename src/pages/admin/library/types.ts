export interface Video {
  id: string;
  platform: "tiktok" | "instagram" | "facebook_ads";
  external_id: string;
  url: string | null;
  author_handle: string | null;
  author_name: string | null;
  author_followers: number | null;
  caption: string | null;
  language: string | null;
  country: string | null;
  duration_s: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  published_at: string | null;
  hashtags: string[];
  sound_name: string | null;
  thumbnail_src: string | null;
  thumbnail_path: string | null;
  video_src: string | null;
  video_path: string | null;
  app_id: string | null;
  competitor_id: string | null;
  category_id: string | null;
  category_auto: boolean;
  score: number;
  is_ad: boolean;
  ad_started_at: string | null;
  ad_ended_at: string | null;
  ad_active: boolean | null;
  ad_days: number | null;
  ad_page_name: string | null;
  first_seen_at: string;
  origin: "official" | "ugc" | "ad" | "other" | null;
  engagement: number | null;
  outlier: number | null;
  velocity: number | null;
  mentions: string[];
}

export const ORIGIN_LABEL: Record<string, string> = { official: "Officiel", ugc: "UGC", ad: "Pub", other: "Autre" };

export type Sort = "score" | "views" | "likes" | "shares" | "engagement" | "outlier" | "velocity" | "date" | "recent" | "ad_days";
export const SORT_LABEL: Record<Sort, string> = {
  score: "Score", views: "Vues", likes: "Likes", shares: "Partages", engagement: "Engagement",
  outlier: "Outlier (vues/abonnés)", velocity: "Vélocité (vues/jour)", date: "Date de publication", recent: "Ajout récent", ad_days: "Durée de diffusion (pubs)",
};

/** Valeur de curseur (keyset) pour un tri décroissant ; null est traité comme -1 côté SQL. */
export function cursorValue(v: Video, sort: Sort): number {
  const n = (x: number | null | undefined) => (x === null || x === undefined ? -1 : Number(x));
  switch (sort) {
    case "views": return n(v.views);
    case "likes": return n(v.likes);
    case "shares": return n(v.shares);
    case "engagement": return n(v.engagement);
    case "outlier": return n(v.outlier);
    case "velocity": return n(v.velocity);
    case "date": return v.published_at ? new Date(v.published_at).getTime() / 1000 : -1;
    case "recent": return new Date(v.first_seen_at).getTime() / 1000;
    case "ad_days": return n(v.ad_days);
    default: return Number(v.score);
  }
}

export const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${(Number(x) * 100).toFixed(1)} %`);
export const times = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `×${Number(x) >= 100 ? Math.round(Number(x)) : Number(x).toFixed(1)}`);

export const PLATFORM_LABEL: Record<Video["platform"], string> = { tiktok: "TikTok", instagram: "Instagram", facebook_ads: "Meta Ads" };

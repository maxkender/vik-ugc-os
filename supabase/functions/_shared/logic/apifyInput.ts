/**
 * Entrées des acteurs Apify, avec plafonds de coût. Un run ne dépasse jamais
 * `hardCap` résultats ; `maxTotalChargeUsd` borne la facture (min. Apify 0,50 $).
 */
export type SourcePlatform = "tiktok" | "instagram" | "facebook_ads";
export type SourceKind = "account" | "hashtag" | "keyword" | "page";

export interface SourceSpec {
  platform: SourcePlatform;
  kind: SourceKind;
  value: string;
  max_results: number;
  countries?: string[];
}

/** Coût unitaire observé (USD / résultat, 14/11/2026). */
export const UNIT_COST_USD: Record<SourcePlatform | "views", number> = {
  tiktok: 0.0037,
  instagram: 0.0027,
  facebook_ads: 0.0058,
  views: 0.0037,
};

export function capResults(requested: number, hardCap: number): number {
  return Math.max(1, Math.min(Math.floor(requested || 1), Math.max(1, hardCap)));
}

export function estimateCostUsd(platform: SourcePlatform | "views", n: number): number {
  return Math.round(UNIT_COST_USD[platform] * n * 10000) / 10000 + 0.001;
}

/** Plafond de facture d'un run : 3× le coût estimé, au moins 0,50 $ (minimum Apify). */
export function maxChargeUsd(platform: SourcePlatform | "views", n: number): number {
  return Math.max(0.5, Math.ceil(estimateCostUsd(platform, n) * 3 * 100) / 100);
}

const clean = (v: string) => v.trim().replace(/^[@#]/, "");

export function buildActorInput(s: SourceSpec, hardCap: number): Record<string, unknown> {
  const n = capResults(s.max_results, hardCap);
  const v = clean(s.value);
  if (s.platform === "tiktok") {
    const base = { resultsPerPage: n, shouldDownloadVideos: false, shouldDownloadCovers: false, shouldDownloadSubtitles: false, shouldDownloadSlideshowImages: false };
    if (s.kind === "account") return { ...base, profiles: [v], profileScrapeSections: ["videos"], profileSorting: "latest" };
    if (s.kind === "hashtag") return { ...base, hashtags: [v] };
    return { ...base, searchQueries: [s.value.trim()], searchSection: "/video" };
  }
  if (s.platform === "instagram") {
    if (s.kind === "account") return { directUrls: [`https://www.instagram.com/${v}/`], resultsType: "posts", resultsLimit: n, addParentData: false };
    if (s.kind === "hashtag") return { directUrls: [`https://www.instagram.com/explore/tags/${encodeURIComponent(v)}/`], resultsType: "posts", resultsLimit: n };
    return { search: s.value.trim(), searchType: "hashtag", searchLimit: 1, resultsType: "posts", resultsLimit: n };
  }
  // Facebook Ad Library : recherche par nom de page / mot-clé, pubs vidéo, toutes dates.
  const country = s.countries && s.countries.length === 1 ? s.countries[0] : "ALL";
  const url = /^\d+$/.test(v)
    ? `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${country}&media_type=video&view_all_page_id=${v}`
    : `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${country}&media_type=video&q=${encodeURIComponent(s.value.trim())}&search_type=keyword_unordered`;
  return { startUrls: [{ url }], resultsLimit: n };
}

/** Entrée de relevé de vues pour une liste d'URL de vidéos postées. */
export function buildViewsInput(urls: string[]): { tiktok: Record<string, unknown> | null; instagram: Record<string, unknown> | null } {
  const tt = urls.filter((u) => /tiktok\.com/i.test(u));
  const ig = urls.filter((u) => /instagram\.com/i.test(u));
  return {
    tiktok: tt.length ? { postURLs: tt, resultsPerPage: tt.length, shouldDownloadVideos: false, shouldDownloadCovers: false } : null,
    instagram: ig.length ? { directUrls: ig, resultsType: "posts", resultsLimit: ig.length } : null,
  };
}

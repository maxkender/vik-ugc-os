/**
 * Normalisation des items Apify vers une ligne `videos`.
 * Acteurs : clockworks~tiktok-scraper, apify~instagram-scraper,
 * apify~facebook-ads-scraper (Ad Library). Testé sur de vrais items (14/11).
 */
import { detectLanguage } from "./language.ts";

export interface VideoRow {
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
  video_src: string | null;
  is_ad: boolean;
  ad_started_at: string | null;
  ad_ended_at: string | null;
  ad_active: boolean | null;
  ad_days: number | null;
  ad_page_name: string | null;
  ad_countries: string[] | null;
  raw_type: string | null;
  mentions: string[];
}

type Any = Record<string, any>;
const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const iso = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export function hashtagsFromText(text: string | null | undefined): string[] {
  if (!text) return [];
  const out = new Set<string>();
  for (const m of text.matchAll(/#([\p{L}\p{N}_]+)/gu)) out.add(m[1].toLowerCase());
  return [...out];
}

/** @mentions : champs de la plateforme + @… dans la légende, en minuscules sans @. */
export function mentionsOf(a: unknown, b: unknown, text: string | null): string[] {
  const out = new Set<string>();
  for (const list of [a, b]) {
    if (!Array.isArray(list)) continue;
    for (const m of list) {
      const h = typeof m === "string" ? m : (m?.userUniqueId ?? m?.username ?? m?.nickName ?? m?.name ?? "");
      if (h) out.add(String(h).replace(/^@/, "").toLowerCase());
    }
  }
  for (const m of (text ?? "").matchAll(/@([A-Za-z0-9._]{2,30})/g)) out.add(m[1].toLowerCase().replace(/\.$/, ""));
  return [...out];
}

export function normalizeTikTok(x: Any): VideoRow | null {
  const id = str(x.id) ?? str(String(x.id ?? ""));
  if (!id) return null;
  const caption = str(x.text);
  const tags = Array.isArray(x.hashtags)
    ? x.hashtags.map((h: Any) => String(h?.name ?? h ?? "").toLowerCase()).filter(Boolean)
    : hashtagsFromText(caption);
  const stickers = Array.isArray(x.effectStickers) ? x.effectStickers.map((s: Any) => s?.name).filter(Boolean) : [];
  return {
    platform: "tiktok",
    external_id: id,
    url: str(x.webVideoUrl) ?? (x.authorMeta?.name ? `https://www.tiktok.com/@${x.authorMeta.name}/video/${id}` : null),
    author_handle: str(x.authorMeta?.name),
    author_name: str(x.authorMeta?.nickName),
    author_followers: num(x.authorMeta?.fans),
    caption,
    language: str(x.textLanguage) && x.textLanguage !== "un" ? x.textLanguage : detectLanguage(caption),
    country: str(x.locationCreated) ?? null,
    duration_s: num(x.videoMeta?.duration),
    views: num(x.playCount),
    likes: num(x.diggCount),
    comments: num(x.commentCount),
    shares: num(x.shareCount),
    published_at: str(x.createTimeISO) ?? iso(x.createTime),
    hashtags: [...new Set([...tags, ...stickers.map((s: string) => s.toLowerCase().replace(/\s+/g, ""))])],
    sound_name: str(x.musicMeta?.musicName),
    thumbnail_src: str(x.videoMeta?.coverUrl) ?? str(x.videoMeta?.originalCoverUrl),
    video_src: str(x.videoMeta?.downloadAddr) ?? str(x.mediaUrls?.[0]),
    is_ad: false, // x.isAd = contenu marqué pub sur TikTok ; on garde l'info dans raw
    ad_started_at: null, ad_ended_at: null, ad_active: null, ad_days: null, ad_page_name: null, ad_countries: null,
    raw_type: x.isSlideshow ? "slideshow" : null,
    mentions: mentionsOf(x.mentions, x.detailedMentions, caption),
  };
}

export function normalizeInstagram(x: Any): VideoRow | null {
  const id = str(x.id) ?? str(x.shortCode);
  if (!id) return null;
  if (x.type && x.type !== "Video" && x.productType !== "clips") return null; // reels/vidéos seulement
  const caption = str(x.caption);
  const music = typeof x.musicInfo === "object" && x.musicInfo ? x.musicInfo : null;
  return {
    platform: "instagram",
    external_id: id,
    url: str(x.url) ?? (x.shortCode ? `https://www.instagram.com/reel/${x.shortCode}/` : null),
    author_handle: str(x.ownerUsername),
    author_name: str(x.ownerFullName),
    author_followers: num(x.ownerFollowersCount ?? x.followersCount),
    caption,
    language: detectLanguage(caption),
    country: null,
    duration_s: num(x.videoDuration),
    views: num(x.videoPlayCount ?? x.videoViewCount),
    likes: num(x.likesCount) !== null && x.likesCount >= 0 ? num(x.likesCount) : null,
    comments: num(x.commentsCount),
    shares: num(x.sharesCount),
    published_at: iso(x.timestamp),
    hashtags: Array.isArray(x.hashtags) && x.hashtags.length ? x.hashtags.map((h: string) => h.toLowerCase()) : hashtagsFromText(caption),
    sound_name: music ? str(music.song_name) : null,
    thumbnail_src: str(x.displayUrl),
    video_src: str(x.videoUrl),
    is_ad: false,
    ad_started_at: null, ad_ended_at: null, ad_active: null, ad_days: null, ad_page_name: null, ad_countries: null,
    raw_type: str(x.productType) ?? str(x.type),
    mentions: mentionsOf(x.mentions, x.taggedUsers, caption),
  };
}

const DAY = 86_400_000;

/** Jours de diffusion d'une pub : du début à la fin (ou à maintenant si elle tourne encore). */
export function adRunDays(start: string | null, end: string | null, active: boolean | null, now = new Date()): number | null {
  if (!start) return null;
  const s = new Date(start).getTime();
  const e = active || !end ? now.getTime() : new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / DAY) + 1);
}

/** Item apify~facebook-ads-scraper (format « Ad Library »). Seules les pubs vidéo sont gardées. */
export function normalizeFacebookAd(x: Any, now = new Date()): VideoRow | null {
  const id = str(String(x.adArchiveID ?? x.adArchiveId ?? x.ad_archive_id ?? x.id ?? ""));
  if (!id) return null;
  const snap: Any = x.snapshot ?? {};
  const cards: Any[] = Array.isArray(snap.cards) ? snap.cards : [];
  const vids: Any[] = Array.isArray(snap.videos) ? snap.videos : [];
  const video = vids[0] ?? cards.find((c) => c.videoHdUrl || c.videoSdUrl) ?? null;
  if (!video) return null;
  const notTemplate = (t: unknown) => { const v = str(t); return v && !v.includes("{{") ? v : null; };
  const body = notTemplate(snap.body?.text) ?? notTemplate(cards[0]?.body) ?? notTemplate(snap.title) ?? null;
  const start = iso(x.startDateFormatted ?? x.startDate ?? x.start_date);
  const end = iso(x.endDateFormatted ?? x.endDate ?? x.end_date);
  const active = typeof x.isActive === "boolean" ? x.isActive : typeof x.is_active === "boolean" ? x.is_active : null;
  const pageName = str(x.pageName) ?? str(snap.pageName) ?? str(x.page_name);
  return {
    platform: "facebook_ads",
    external_id: id,
    url: `https://www.facebook.com/ads/library/?id=${id}`,
    author_handle: str(snap.pageProfileUri)?.replace(/^https?:\/\/(www\.)?facebook\.com\//, "").replace(/\/$/, "") ?? pageName,
    author_name: pageName,
    author_followers: num(snap.pageLikeCount),
    caption: body,
    language: detectLanguage(body),
    country: null,
    duration_s: null,
    views: null,
    likes: null, comments: null, shares: null,
    published_at: start,
    hashtags: hashtagsFromText(body),
    sound_name: null,
    // Miniature : aperçu de la vidéo, sinon image de la carte ou du snapshot (première frame fournie par l'Ad Library).
    thumbnail_src: str(video.videoPreviewImageUrl) ?? str(cards.find((c) => c.videoPreviewImageUrl)?.videoPreviewImageUrl)
      ?? str(snap.images?.[0]?.resizedImageUrl) ?? str(snap.images?.[0]?.originalImageUrl)
      ?? str(cards[0]?.resizedImageUrl) ?? str(cards[0]?.originalImageUrl),
    video_src: str(video.videoHdUrl) ?? str(video.videoSdUrl),
    is_ad: true,
    ad_started_at: start,
    ad_ended_at: end,
    ad_active: active,
    ad_days: adRunDays(start, end, active, now),
    ad_page_name: pageName,
    ad_countries: Array.isArray(x.targetedOrReachedCountries) ? x.targetedOrReachedCountries : Array.isArray(x.reachedCountries) ? x.reachedCountries : null,
    raw_type: str(snap.displayFormat),
    mentions: mentionsOf(null, null, body),
  };
}

export function normalizeItem(platform: VideoRow["platform"], x: Any, now = new Date()): VideoRow | null {
  if (platform === "tiktok") return normalizeTikTok(x);
  if (platform === "instagram") return normalizeInstagram(x);
  return normalizeFacebookAd(x, now);
}

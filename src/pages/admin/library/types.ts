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
}

export const PLATFORM_LABEL: Record<Video["platform"], string> = { tiktok: "TikTok", instagram: "Instagram", facebook_ads: "Meta Ads" };

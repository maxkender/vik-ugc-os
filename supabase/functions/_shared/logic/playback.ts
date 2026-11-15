/**
 * Comment lire une vidéo de la bibliothèque, par ordre de préférence :
 *   1. MP4 archivé dans Storage ;
 *   2. MP4 du CDN (fbcdn / cdninstagram) tant que son lien signé n'a pas expiré (paramètre `oe`) ;
 *   3. lecteur officiel en iframe (TikTok player v1, Instagram /embed) ;
 *   4. lien « Ouvrir sur … » (dernier recours ; Facebook interdit l'iframe de l'Ad Library).
 * Le lecteur essaie la source suivante si un MP4 échoue ; l'iframe et le lien sont terminaux.
 */
export interface PlayableVideo {
  platform: "tiktok" | "instagram" | "facebook_ads" | string;
  external_id?: string | null;
  url?: string | null;
  video_path?: string | null;
  video_src?: string | null;
}

export type PlaySource =
  | { kind: "stored"; path: string }
  | { kind: "mp4"; url: string }
  | { kind: "iframe"; url: string; provider: "tiktok" | "instagram" }
  | { kind: "link"; url: string; label: string };

/** Expiration d'un lien CDN Meta (`oe` = timestamp hexadécimal). null si inconnue. */
export function cdnExpiry(url: string): number | null {
  const m = /[?&]oe=([0-9a-fA-F]{6,10})(?:&|$)/.exec(url);
  return m ? parseInt(m[1], 16) * 1000 : null;
}

/** Un lien CDN encore lisible : expiration connue et à plus de 5 min. Les liens TikTok (sans `oe`) sont considérés morts. */
export function cdnAlive(url: string | null | undefined, now = Date.now()): boolean {
  if (!url) return false;
  const exp = cdnExpiry(url);
  return exp !== null && exp - now > 5 * 60_000;
}

export function tiktokId(v: PlayableVideo): string | null {
  if (v.external_id && /^\d{15,22}$/.test(v.external_id)) return v.external_id;
  const m = /\/(?:video|photo)\/(\d{15,22})/.exec(v.url ?? "");
  return m ? m[1] : null;
}

export function instagramCode(url: string | null | undefined): string | null {
  const m = /instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,})/.exec(url ?? "");
  return m ? m[1] : null;
}

const LINK_LABEL: Record<string, string> = { tiktok: "Ouvrir sur TikTok", instagram: "Ouvrir sur Instagram", facebook_ads: "Ouvrir dans l'Ad Library" };

export function playSources(v: PlayableVideo, now = Date.now()): PlaySource[] {
  const out: PlaySource[] = [];
  if (v.video_path) out.push({ kind: "stored", path: v.video_path });
  if (cdnAlive(v.video_src, now)) out.push({ kind: "mp4", url: v.video_src! });
  if (v.platform === "tiktok") {
    const id = tiktokId(v);
    if (id) out.push({ kind: "iframe", provider: "tiktok", url: `https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=1&rel=0&description=0&music_info=0` });
  } else if (v.platform === "instagram") {
    const code = instagramCode(v.url);
    if (code) out.push({ kind: "iframe", provider: "instagram", url: `https://www.instagram.com/p/${code}/embed/` });
  }
  const link = v.url ?? (v.platform === "facebook_ads" && v.external_id ? `https://www.facebook.com/ads/library/?id=${v.external_id}` : null);
  if (link) out.push({ kind: "link", url: link, label: LINK_LABEL[v.platform] ?? "Ouvrir l'original" });
  return out;
}

/** Aperçu muet au survol : seulement un MP4 (archivé ou CDN vivant). */
export function hoverSource(v: PlayableVideo, now = Date.now()): PlaySource | null {
  return playSources(v, now).find((s) => s.kind === "stored" || s.kind === "mp4") ?? null;
}

/** Profil du créateur sur la plateforme. */
export function authorUrl(v: { platform: string; author_handle?: string | null; url?: string | null }): string | null {
  const h = (v.author_handle ?? "").replace(/^@/, "");
  if (!h || /^\d+$/.test(h)) return null;
  if (v.platform === "tiktok") return `https://www.tiktok.com/@${h}`;
  if (v.platform === "instagram") return `https://www.instagram.com/${h}/`;
  return null;
}

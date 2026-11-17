/**
 * Vidéo de présentation (« yap ») : fichier ou lien (17/11, candidats perdus sur iPhone).
 * iOS envoie souvent un type MIME vide ou video/quicktime (HEVC) : on contrôle par extension, puis par type.
 */
export const YAP_MAX_BYTES = 200 * 1024 * 1024;
const EXT_MIME: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", qt: "video/quicktime", hevc: "video/quicktime", m4v: "video/x-m4v", webm: "video/webm" };
/** Extension stockée (acceptée par l'API) pour une extension de fichier. */
const STORED_EXT: Record<string, string> = { mp4: "mp4", mov: "mov", qt: "mov", hevc: "mov", m4v: "m4v", webm: "webm" };

export function yapFileCheck(name: string, type: string, size: number): { ok: true; ext: string; contentType: string } | { ok: false; reason: "type" | "size" } {
  const ext = (name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const t = (type || "").toLowerCase();
  const byExt = STORED_EXT[ext];
  const byType = t === "video/quicktime" || t === "video/hevc" || t === "video/x-quicktime" ? "mov" : t === "video/mp4" ? "mp4" : t === "video/x-m4v" ? "m4v" : t === "video/webm" ? "webm" : t.startsWith("video/") ? "mp4" : null;
  const stored = byExt ?? byType;
  if (!stored) return { ok: false, reason: "type" };
  if (size > YAP_MAX_BYTES) return { ok: false, reason: "size" };
  return { ok: true, ext: stored, contentType: EXT_MIME[stored] ?? "video/mp4" };
}

export type YapProvider = "youtube" | "instagram" | "tiktok" | "drive" | "dropbox" | "wetransfer" | "icloud";
const HOSTS: [RegExp, YapProvider][] = [
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "youtube"], [/(^|\.)instagram\.com$/, "instagram"], [/(^|\.)tiktok\.com$/, "tiktok"],
  [/^drive\.google\.com$/, "drive"], [/(^|\.)dropbox\.com$/, "dropbox"], [/(^|\.)wetransfer\.com$|^we\.tl$/, "wetransfer"], [/(^|\.)icloud\.com$/, "icloud"],
];

/** Lien de secours : https, hébergeur connu. */
export function yapLinkProvider(raw: string): YapProvider | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return null;
    return HOSTS.find(([re]) => re.test(u.hostname.toLowerCase()))?.[1] ?? null;
  } catch { return null; }
}

/** URL de lecture intégrée (iframe) quand l'hébergeur le permet, sinon null (bouton « Ouvrir la vidéo »). */
export function yapEmbedUrl(raw: string): string | null {
  const p = yapLinkProvider(raw);
  if (!p) return null;
  const u = new URL(raw.trim());
  if (p === "youtube") {
    const id = u.hostname.endsWith("youtu.be") ? u.pathname.slice(1).split("/")[0] : u.searchParams.get("v") ?? (/\/(shorts|embed|live)\/([\w-]{6,})/.exec(u.pathname)?.[2] ?? null);
    return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (p === "instagram") {
    const m = /\/(p|reel|reels|tv)\/([\w-]+)/.exec(u.pathname);
    return m ? `https://www.instagram.com/${m[1] === "reels" ? "reel" : m[1]}/${m[2]}/embed` : null;
  }
  if (p === "tiktok") {
    const m = /\/video\/(\d{15,22})/.exec(u.pathname);
    return m ? `https://www.tiktok.com/player/v1/${m[1]}` : null;
  }
  if (p === "drive") {
    const m = /\/file\/d\/([\w-]+)/.exec(u.pathname) ?? (u.searchParams.get("id") ? [null, u.searchParams.get("id")] as any : null);
    return m ? `https://drive.google.com/file/d/${m[1]}/preview` : null;
  }
  return null; // Dropbox, WeTransfer, iCloud : ouvrir dans un nouvel onglet
}

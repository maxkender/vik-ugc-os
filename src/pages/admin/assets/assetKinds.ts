import { publicUrl } from "@/lib/supabase";

export type AssetKind = "logo" | "screenshot" | "demo_video" | "sound" | "font" | "other";
export const KIND_LABEL: Record<AssetKind, string> = {
  logo: "Logos", screenshot: "Captures d'écran", demo_video: "Vidéos démo", sound: "Sons", font: "Polices", other: "Autres",
};
export const KINDS = Object.keys(KIND_LABEL) as AssetKind[];

export interface Asset { id: string; app_id: string | null; kind: AssetKind; name: string; path: string; mime: string | null; size_bytes: number | null; created_at: string }

/** Type deviné à l'upload (modifiable avant d'envoyer). */
export function guessKind(file: { name: string; type: string }): AssetKind {
  const n = file.name.toLowerCase();
  if (/logo|icon|brand/.test(n) && file.type.startsWith("image/")) return "logo";
  if (file.type.startsWith("image/")) return "screenshot";
  if (file.type.startsWith("video/")) return "demo_video";
  if (file.type.startsWith("audio/")) return "sound";
  if (/\.(ttf|otf|woff2?)$/.test(n) || file.type.startsWith("font/")) return "font";
  return "other";
}

export const assetUrl = (a: Pick<Asset, "path">) => publicUrl("brief-assets", a.path) ?? "";
export const fmtSize = (b: number | null) => (b == null ? "" : b > 1e6 ? `${(b / 1e6).toFixed(1)} Mo` : `${Math.max(1, Math.round(b / 1e3))} Ko`);

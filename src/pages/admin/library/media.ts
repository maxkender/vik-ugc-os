import { supabase, publicUrl } from "@/lib/supabase";
import type { Video } from "./types";

export function thumbOf(v: Pick<Video, "thumbnail_path" | "thumbnail_src">): string | null {
  return publicUrl("thumbnails", v.thumbnail_path) ?? v.thumbnail_src;
}

const cache = new Map<string, { url: string; exp: number }>();
/** URL lisible de la vidéo : MP4 archivé (URL signée) sinon l'URL du CDN (peut avoir expiré). */
export async function playableUrl(v: Pick<Video, "id" | "video_path" | "video_src">): Promise<string | null> {
  if (v.video_path) {
    const hit = cache.get(v.id);
    if (hit && hit.exp > Date.now()) return hit.url;
    const { data } = await supabase.storage.from("reference-videos").createSignedUrl(v.video_path, 3600);
    if (data?.signedUrl) {
      cache.set(v.id, { url: data.signedUrl, exp: Date.now() + 3000_000 });
      return data.signedUrl;
    }
  }
  return v.video_src;
}

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Play } from "lucide-react";
import { publicUrl, supabase } from "@/lib/supabase";
import { playSources, type PlayableVideo, type PlaySource } from "@shared/playback.ts";
import { cn } from "@/lib/utils";

export interface SurfaceVideo extends PlayableVideo {
  id: string;
  thumbnail_path?: string | null;
  thumbnail_src?: string | null;
}

const signed = new Map<string, { url: string; exp: number }>();
/** URL signée (1 h) d'un MP4 archivé dans Storage, mise en cache 50 min. */
export async function signedVideoUrl(path: string): Promise<string | null> {
  const hit = signed.get(path);
  if (hit && hit.exp > Date.now()) return hit.url;
  const { data } = await supabase.storage.from("reference-videos").createSignedUrl(path, 3600);
  if (!data?.signedUrl) return null;
  signed.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60_000 });
  return data.signedUrl;
}

export const thumbUrl = (v: SurfaceVideo) => publicUrl("thumbnails", v.thumbnail_path ?? null) ?? v.thumbnail_src ?? null;

/**
 * Lit une vidéo dans un cadre 9:16 : MP4 archivé → MP4 CDN vivant → lecteur officiel (iframe) → lien.
 * Un MP4 qui échoue passe à la source suivante.
 */
export function VideoSurface({ v, className, autoPlay = true, muted = false }: { v: SurfaceVideo; className?: string; autoPlay?: boolean; muted?: boolean }) {
  const sources = useMemo(() => playSources(v), [v.id, v.video_path, v.video_src, v.url, v.external_id, v.platform]);
  const [i, setI] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { setI(0); }, [v.id]);
  const src: PlaySource | undefined = sources[i];
  useEffect(() => {
    let live = true;
    setUrl(null);
    if (src?.kind === "stored") signedVideoUrl(src.path).then((u) => live && (u ? setUrl(u) : setI((x) => x + 1)));
    else if (src?.kind === "mp4" || src?.kind === "iframe") setUrl(src.url);
    return () => { live = false; };
  }, [src?.kind, (src as any)?.url, (src as any)?.path]);
  const thumb = thumbUrl(v);
  const next = () => setI((x) => x + 1);

  return (
    <div className={cn("relative aspect-[9/16] overflow-hidden rounded-xl bg-black", className)} data-source={src?.kind ?? "none"}>
      {(src?.kind === "stored" || src?.kind === "mp4") && url && (
        <video key={url} src={url} poster={thumb ?? undefined} controls autoPlay={autoPlay} muted={muted} loop playsInline className="h-full w-full object-contain" onError={next} />
      )}
      {src?.kind === "iframe" && url && (
        <iframe key={url} src={url} title="Lecteur vidéo" className={cn("h-full w-full border-0", src.provider === "instagram" && "bg-white")}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      )}
      {(!src || src.kind === "link") && (
        <div className="relative h-full w-full">
          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover opacity-70" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
            : <div className="flex h-full items-center justify-center text-white/50"><Play className="h-10 w-10" /></div>}
          {src?.kind === "link" && (
            <a href={src.url} target="_blank" rel="noreferrer" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35 text-white transition-colors hover:bg-black/45">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg"><Play className="ml-0.5 h-6 w-6 fill-[#0b1530] text-[#0b1530]" /></span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-medium text-[#0b1530]"><ExternalLink className="h-3.5 w-3.5" />{src.label}</span>
            </a>
          )}
        </div>
      )}
      {(src?.kind === "stored" || src?.kind === "mp4" || src?.kind === "iframe") && !url && <div className="absolute inset-0 animate-pulse bg-white/5" />}
    </div>
  );
}

import { memo, useRef, useState } from "react";
import { Eye, Heart, Megaphone, Play } from "lucide-react";
import { cn, compact, flag } from "@/lib/utils";
import type { Video } from "./types";
import { playableUrl, thumbOf } from "./media";

function PlatformDot({ p }: { p: Video["platform"] }) {
  const label = p === "tiktok" ? "TT" : p === "instagram" ? "IG" : "Ads";
  return <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">{label}</span>;
}

export const VideoCard = memo(function VideoCard({ v, fav, onOpen, onFav, categoryName }: {
  v: Video; fav: boolean; onOpen: () => void; onFav: () => void; categoryName?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | null>(null);
  const thumb = thumbOf(v);
  const enter = () => {
    if (failed) return;
    timer.current = window.setTimeout(async () => setSrc(await playableUrl(v)), 250);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    setSrc(null);
  };
  const scoreTone = v.score >= 75 ? "bg-success" : v.score >= 50 ? "bg-accent" : "bg-black/60";
  return (
    <div className="group cursor-pointer" onClick={onOpen} onMouseEnter={enter} onMouseLeave={leave}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-muted">
        {thumb ? <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
          : <div className="flex h-full items-center justify-center text-muted-foreground"><Play className="h-8 w-8" /></div>}
        {src && <video src={src} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" onError={() => { setFailed(true); setSrc(null); }} />}
        <div className="absolute left-2 top-2 flex gap-1"><PlatformDot p={v.platform} />{v.video_path && <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">MP4</span>}</div>
        <span className={cn("absolute right-2 top-2 rounded px-1.5 py-0.5 text-[11px] font-semibold text-white", scoreTone)} title="Score de performance">{Math.round(v.score)}</span>
        <button onClick={(e) => { e.stopPropagation(); onFav(); }} className="absolute bottom-2 right-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 data-[fav=true]:opacity-100" data-fav={fav} aria-label="Favori">
          <Heart className={cn("h-4 w-4", fav && "fill-red-500 text-red-500")} />
        </button>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 text-xs text-white">
          {v.is_ad ? (
            <span className="flex items-center gap-1"><Megaphone className="h-3 w-3" /> {v.ad_days ?? "?"} j {v.ad_active ? "· active" : ""}</span>
          ) : (
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {compact(v.views)}</span>
          )}
        </div>
      </div>
      <div className="mt-1.5 space-y-0.5 px-0.5">
        <p className="truncate text-xs font-medium">@{v.author_handle ?? v.ad_page_name ?? "?"} <span className="text-muted-foreground">{flag(v.country)} {v.language ?? ""}</span></p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{v.caption || "—"}</p>
        {categoryName && <p className="text-[11px] text-accent">{categoryName}</p>}
      </div>
    </div>
  );
});

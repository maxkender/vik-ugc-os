import { memo, useRef, useState } from "react";
import { Eye, Heart, Instagram, Megaphone, Music2, Zap } from "lucide-react";
import { MetricPill } from "@/components/ui";
import { cn, compact, flag } from "@/lib/utils";
import { ORIGIN_LABEL, PLATFORM_LABEL, pct, type Video } from "./types";
import { playableUrl, thumbOf } from "./media";

export function PlatformIcon({ p, className }: { p: Video["platform"]; className?: string }) {
  const I = p === "tiktok" ? Music2 : p === "instagram" ? Instagram : Megaphone;
  return <I className={className} />;
}

/** Fond de remplacement quand la miniature manque (dégradé doux teinté par plateforme). */
export function ThumbPlaceholder({ v, size = "lg" }: { v: Pick<Video, "platform" | "author_handle" | "ad_page_name">; size?: "lg" | "sm" }) {
  const bg = v.platform === "tiktok" ? "from-[#eef3ff] via-[#f3edff] to-[#e8f7ff]" : v.platform === "instagram" ? "from-[#f3edff] via-[#ffeded] to-[#fff6e5]" : "from-[#fff6e5] via-[#eef3ff] to-[#f3edff]";
  return (
    <div className={cn("absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br", bg)}>
      <span className={cn("flex items-center justify-center rounded-full bg-white/80 text-[#5b6478] shadow-xs", size === "lg" ? "h-11 w-11" : "h-6 w-6")}>
        <PlatformIcon p={v.platform} className={size === "lg" ? "h-5 w-5" : "h-3 w-3"} />
      </span>
      {size === "lg" && <span className="max-w-[80%] truncate text-[11px] font-medium text-[#5b6478]">@{v.author_handle ?? v.ad_page_name ?? "?"}</span>}
    </div>
  );
}

const ORIGIN_TONE: Record<string, string> = {
  ugc: "bg-white/90 text-[#0040d6]", official: "bg-white/90 text-[#7a32ef]", ad: "bg-white/90 text-[#8a5a00]", other: "bg-white/90 text-[#5b6478]",
};

export const VideoCard = memo(function VideoCard({ v, fav, onOpen, onFav, categoryName, competitorName }: {
  v: Video; fav: boolean; onOpen: () => void; onFav: () => void; categoryName?: string; competitorName?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [imgOk, setImgOk] = useState(true);
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
  const scoreTone = v.score >= 80 ? "bg-[#12a150] text-white" : v.score >= 60 ? "bg-accent text-white" : "bg-white/90 text-foreground";
  return (
    <div className="group cursor-pointer" onClick={onOpen} onMouseEnter={enter} onMouseLeave={leave}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted shadow-xs ring-1 ring-border transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_-10px_rgba(16,24,40,0.25)]">
        {(!thumb || !imgOk) && <ThumbPlaceholder v={v} />}
        {thumb && imgOk && <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" onError={() => setImgOk(false)} />}
        {src && <video src={src} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" onError={() => { setFailed(true); setSrc(null); }} />}

        <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-1">
          <div className="flex flex-wrap gap-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-foreground shadow-xs" title={PLATFORM_LABEL[v.platform]}><PlatformIcon p={v.platform} className="h-3.5 w-3.5" /></span>
            {v.is_ad
              ? <span className="tabular inline-flex h-6 items-center gap-1 rounded-full bg-[#fff6e5] px-2 text-[11px] font-bold text-[#8a5a00] shadow-xs" title="Durée de diffusion">{v.ad_days ?? "?"} j de diffusion</span>
              : v.origin && v.origin !== "other" && <span className={cn("inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold shadow-xs", ORIGIN_TONE[v.origin])}>{ORIGIN_LABEL[v.origin]}</span>}
          </div>
          <span className={cn("tabular inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold shadow-xs", scoreTone)} title="Score de performance">{Math.round(v.score)}</span>
        </div>

        <button onClick={(e) => { e.stopPropagation(); onFav(); }} data-fav={fav} aria-label="Favori"
          className="absolute right-2.5 top-11 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 shadow-xs transition-opacity group-hover:opacity-100 data-[fav=true]:opacity-100">
          <Heart className={cn("h-3.5 w-3.5", fav && "fill-[#fe504f] text-[#fe504f]")} />
        </button>

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/65 via-black/25 to-transparent p-2.5 pt-12">
          {v.is_ad ? (
            <>
              <MetricPill tone="dark" icon={<Megaphone />}>{v.ad_started_at ? `Depuis le ${new Date(v.ad_started_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : "Pub Meta"}</MetricPill>
              {v.ad_active ? <MetricPill tone="dark"><span className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-[#3ddc84]" />Active</MetricPill> : <MetricPill tone="dark">Arrêtée</MetricPill>}
            </>
          ) : (
            <>
              <MetricPill tone="dark" icon={<Eye />}>{compact(v.views)}</MetricPill>
              {v.engagement !== null && v.engagement !== undefined && <MetricPill tone="dark" icon={<Heart />}>{pct(v.engagement)}</MetricPill>}
              {v.outlier !== null && v.outlier !== undefined && Number(v.outlier) >= 10 && <MetricPill tone="dark" icon={<Zap />}>×{Math.round(Number(v.outlier))}</MetricPill>}
            </>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex items-start gap-2 px-0.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint-violet text-[10px] font-semibold uppercase text-[#7a32ef]">
          {(v.author_handle ?? v.ad_page_name ?? "?").replace(/^@/, "").charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">@{v.author_handle ?? v.ad_page_name ?? "?"}</p>
          <p className="truncate text-xs text-subtle-foreground">
            {competitorName ?? "Hors concurrents"}{categoryName ? ` · ${categoryName}` : ""}{v.country ? ` · ${flag(v.country)}` : v.language ? ` · ${v.language}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
});


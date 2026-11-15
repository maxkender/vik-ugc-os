import { useEffect } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Eye, Heart, Info, Layers, Megaphone, MessageCircle, Repeat2, Send, Users, X, Zap } from "lucide-react";
import { Button } from "@/components/ui";
import { VideoSurface } from "@/components/video/VideoSurface";
import { authorUrl } from "@shared/playback.ts";
import { compact, dateFr, flag } from "@/lib/utils";
import { PlatformIcon, displayName } from "./VideoCard";
import { PLATFORM_LABEL, pct, times, type Video } from "./types";

/**
 * Lecteur plein écran 9:16 pour toute liste de vidéos (bibliothèque, concurrents, pubs, briefs).
 * ← → : vidéo précédente / suivante dans la liste affichée ; Échap : fermer.
 */
export function VideoPlayer({ list, index, onIndex, fav, onFav, onAssign, assignLabel = "Assigner en brief", onDetails, competitorName }: {
  list: Video[]; index: number | null; onIndex: (i: number | null) => void;
  fav?: (v: Video) => boolean; onFav?: (v: Video) => void; onAssign?: (v: Video) => void; assignLabel?: string;
  onDetails?: (v: Video) => void; competitorName?: (id: string | null) => string | undefined;
}) {
  const open = index !== null && index >= 0 && index < list.length;
  const v = open ? list[index!] : null;
  const go = (d: number) => open && onIndex(Math.min(list.length - 1, Math.max(0, index! + d)));
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape") onIndex(null);
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = prev; };
  }, [open, index, list.length]);
  if (!v) return null;
  const author = authorUrl(v);
  const comp = competitorName?.(v.competitor_id);
  const isFav = fav?.(v) ?? false;
  const metrics: [React.ReactNode, string, string][] = v.is_ad
    ? [[<Megaphone />, "Diffusion", `${v.ad_days ?? "?"} j`], [<Eye />, "Début", v.ad_started_at ? dateFr(v.ad_started_at) : "—"], [<Layers />, "Variantes", String(v.ad_variants ?? 1)]]
    : [[<Eye />, "Vues", compact(v.views)], [<Heart />, "Likes", compact(v.likes)], [<Zap />, "Outlier", times(v.outlier)],
       [<Heart />, "Engagement", pct(v.engagement)], [<MessageCircle />, "Commentaires", compact(v.comments)], [<Repeat2 />, "Partages", compact(v.shares)]];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#070d1f]/85 backdrop-blur-md" onMouseDown={(e) => e.target === e.currentTarget && onIndex(null)} role="dialog" aria-label="Lecteur vidéo" data-testid="video-player">
      <button onClick={() => onIndex(null)} aria-label="Fermer" className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
      <span className="tabular absolute left-5 top-5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80">{index! + 1} / {list.length}</span>

      <div className="flex max-h-full w-full items-center justify-center gap-3 overflow-y-auto p-4 sm:gap-6 sm:p-8 max-md:flex-col max-md:justify-start" onMouseDown={(e) => e.target === e.currentTarget && onIndex(null)}>
        <NavButton dir="prev" disabled={index === 0} onClick={() => go(-1)} />
        <VideoSurface key={v.id} v={v} className="w-[min(100%,calc(82vh*9/16))] shrink-0 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.6)] max-md:w-[min(100%,calc(62vh*9/16))]" />

        <aside className="w-full max-w-sm shrink-0 rounded-2xl border border-white/40 bg-white/95 p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-violet text-sm font-semibold uppercase text-[#7a32ef]">{displayName(v).charAt(0)}</span>
            <div className="min-w-0">
              {author ? <a href={author} target="_blank" rel="noreferrer" className="block truncate font-semibold text-foreground hover:text-accent hover:underline">@{displayName(v)}</a>
                : <p className="truncate font-semibold text-foreground">{v.is_ad ? displayName(v) : `@${displayName(v)}`}</p>}
              <p className="flex items-center gap-1 truncate text-xs text-subtle-foreground">
                <PlatformIcon p={v.platform} className="h-3 w-3" /> {PLATFORM_LABEL[v.platform]}
                {v.author_followers ? <> · <Users className="h-3 w-3" /> {compact(v.author_followers)}</> : null}
                {comp ? ` · ${comp}` : ""}{v.country ? ` · ${flag(v.country)}` : ""}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {metrics.map(([icon, label, value]) => (
              <div key={label} className="rounded-xl bg-[#f6f7fa] px-2.5 py-2">
                <p className="flex items-center gap-1 text-[11px] text-subtle-foreground [&_svg]:h-3 [&_svg]:w-3">{icon}{label}</p>
                <p className="tabular mt-0.5 truncate text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>

          {v.caption && <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">{v.caption}</p>}
          {!v.is_ad && v.published_at && <p className="mt-2 text-xs text-subtle-foreground">Publiée le {dateFr(v.published_at)}</p>}

          <div className="mt-5 grid gap-2">
            {onAssign && <Button onClick={() => onAssign(v)}><Send className="h-4 w-4" /> {assignLabel}</Button>}
            <div className="grid grid-cols-2 gap-2">
              {onFav && <Button variant="secondary" onClick={() => onFav(v)}><Heart className={isFav ? "h-4 w-4 fill-[#fe504f] text-[#fe504f]" : "h-4 w-4"} /> {isFav ? "Favori ✓" : "Favori"}</Button>}
              {v.url && <a href={v.url} target="_blank" rel="noreferrer" className={onFav ? "" : "col-span-2"}><Button variant="secondary" className="w-full"><ExternalLink className="h-4 w-4" /> Original</Button></a>}
            </div>
            {onDetails && <Button variant="ghost" onClick={() => onDetails(v)}><Info className="h-4 w-4" /> Détails, format, collections</Button>}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
            <Button variant="ghost" disabled={index === 0} onClick={() => go(-1)}><ChevronLeft className="h-4 w-4" /> Précédente</Button>
            <Button variant="ghost" disabled={index === list.length - 1} onClick={() => go(1)}>Suivante <ChevronRight className="h-4 w-4" /></Button>
          </div>
          <p className="mt-4 hidden text-center text-[11px] text-subtle-foreground md:block">← → pour naviguer · Échap pour fermer</p>
        </aside>
        <NavButton dir="next" disabled={index === list.length - 1} onClick={() => go(1)} />
      </div>
    </div>
  );
}

function NavButton({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  const I = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir === "prev" ? "Vidéo précédente" : "Vidéo suivante"}
      className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-25 md:flex"><I className="h-6 w-6" /></button>
  );
}

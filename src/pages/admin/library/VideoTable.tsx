import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn, compact, flag } from "@/lib/utils";
import { thumbOf } from "./media";
import { PlatformIcon } from "./VideoCard";
import { ORIGIN_LABEL, PLATFORM_LABEL, pct, times, type Sort, type Video } from "./types";

type Col = { key: string; label: string; sort?: Sort; num?: boolean; className?: string; cell: (v: Video) => React.ReactNode };

const ORIGIN_TONE: Record<string, "accent" | "violet" | "warning" | "default"> = { ugc: "accent", official: "violet", ad: "warning", other: "default" };

function Thumb({ v }: { v: Video }) {
  const t = thumbOf(v);
  const [ok, setOk] = useState(true);
  return (
    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-[#eef3ff] to-[#f3edff] ring-1 ring-border">
      {t && ok ? <img src={t} loading="lazy" className="h-full w-full object-cover" onError={() => setOk(false)} />
        : <span className="absolute inset-0 flex items-center justify-center text-[#5b6478]"><PlatformIcon p={v.platform} className="h-3.5 w-3.5" /></span>}
    </div>
  );
}

export function VideoTable({ rows, sort, asc, onSort, onOpen, competitorName, categoryName, adsOnly, footer }: {
  rows: Video[]; sort: Sort; asc: boolean; onSort: (s: Sort) => void; onOpen: (v: Video) => void;
  competitorName: (id: string | null) => string; categoryName: (id: string | null) => string | undefined; adsOnly?: boolean; footer?: React.ReactNode;
}) {
  const cols: Col[] = [
    { key: "video", label: "Vidéo", className: "min-w-[220px]", cell: (v) => (
      <div className="flex items-center gap-3">
        <Thumb v={v} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span title={PLATFORM_LABEL[v.platform]} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f1f3f7] text-muted-foreground"><PlatformIcon p={v.platform} className="h-3 w-3" /></span>
            <p className="max-w-[160px] truncate font-medium text-foreground">@{v.author_handle ?? v.ad_page_name ?? "?"}</p>
          </div>
          <p className="mt-0.5 max-w-[190px] truncate text-xs text-subtle-foreground">{v.caption || "—"}</p>
        </div>
      </div>
    ) },
    { key: "comp", label: "Concurrent", cell: (v) => (
      <div className="flex flex-col items-start gap-1">
        {v.competitor_id ? <span className="whitespace-nowrap text-foreground">{competitorName(v.competitor_id)}</span> : <span className="whitespace-nowrap text-subtle-foreground">Hors concurrents</span>}
        {v.origin && <Badge tone={ORIGIN_TONE[v.origin]}>{ORIGIN_LABEL[v.origin]}</Badge>}
      </div>
    ) },
    { key: "format", label: "Format · langue", cell: (v) => (
      <div className="whitespace-nowrap">
        <p className="text-foreground">{categoryName(v.category_id) ?? <span className="text-subtle-foreground">Non classé</span>}</p>
        {(v.country || v.language) && <p className="text-xs text-subtle-foreground">{v.country ? `${flag(v.country)} ` : ""}{v.language ?? ""}</p>}
      </div>
    ) },
    ...(!adsOnly ? [
      { key: "views", label: "Vues", sort: "views", num: true, cell: (v: Video) => v.views === null ? <span className="text-subtle-foreground">—</span> : <span className="font-medium text-foreground">{compact(v.views)}</span> },
      { key: "eng", label: "Eng.", sort: "engagement", num: true, cell: (v: Video) => pct(v.engagement) },
      { key: "outlier", label: "Outlier", sort: "outlier", num: true, cell: (v: Video) => <span className={cn(Number(v.outlier) >= 10 && "font-medium text-[#c42a2d]")}>{times(v.outlier)}</span> },
      { key: "velocity", label: "Vues/j", sort: "velocity", num: true, cell: (v: Video) => compact(v.velocity) },
    ] as Col[] : []),
    { key: "score", label: "Score", sort: "score", num: true, cell: (v) => <ScorePill score={v.score} /> },
    { key: "date", label: "Publiée", sort: "date", num: true, cell: (v) => <span className="whitespace-nowrap text-muted-foreground">{(() => { const d = v.is_ad ? v.ad_started_at : v.published_at; return d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" }) : "—"; })()}</span> },
    ...(adsOnly || rows.some((r) => r.is_ad) ? [{ key: "ad", label: "Diffusion", sort: "ad_days", num: true, cell: (v: Video) => (v.is_ad ? <span className="whitespace-nowrap"><span className="font-medium text-foreground">{v.ad_days ?? "?"} j</span>{v.ad_active && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#12a150] align-middle" title="Active" />}</span> : <span className="text-subtle-foreground">—</span>) } as Col] : []),
  ];
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-xs">
      <div className="max-h-[72vh] overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-white">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className={cn("whitespace-nowrap border-b px-3 py-3 first:pl-4 last:pr-4 text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground", c.num ? "text-right" : "text-left", c.className)}>
                  {c.sort ? (
                    <button onClick={() => onSort(c.sort!)} className={cn("group inline-flex items-center gap-1 uppercase tracking-[0.06em] hover:text-foreground", sort === c.sort && "text-foreground")}>
                      {c.label}
                      {sort === c.sort ? (asc ? <ArrowUp className="h-3 w-3 text-accent" /> : <ArrowDown className="h-3 w-3 text-accent" />) : <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-60" />}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="cursor-pointer transition-colors hover:bg-muted" onClick={() => onOpen(v)}>
                {cols.map((c) => <td key={c.key} className={cn("h-[68px] border-b border-separator px-3 align-middle first:pl-4 last:pr-4", c.num && "tabular text-right text-muted-foreground", c.className)}>{c.cell(v)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-separator bg-white px-4 py-3">{footer}</div>}
    </div>
  );
}

export function ScorePill({ score }: { score: number }) {
  const s = Math.round(score);
  const tone = s >= 80 ? "bg-tint-green text-[#0b7a3c]" : s >= 60 ? "bg-tint-blue text-[#0040d6]" : s >= 40 ? "bg-tint-yellow text-[#8a5a00]" : "bg-[#f1f3f7] text-muted-foreground";
  return <span className={cn("tabular inline-flex min-w-9 justify-center rounded-full px-2 py-0.5 text-xs font-semibold", tone)}>{s}</span>;
}

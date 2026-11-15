import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn, compact, dateFr, flag } from "@/lib/utils";
import { thumbOf } from "./media";
import { ORIGIN_LABEL, PLATFORM_LABEL, pct, times, type Sort, type Video } from "./types";

type Col = { key: string; label: string; sort?: Sort; num?: boolean; cell: (v: Video) => React.ReactNode };

export function VideoTable({ rows, sort, asc, onSort, onOpen, competitorName, categoryName, adsOnly }: {
  rows: Video[]; sort: Sort; asc: boolean; onSort: (s: Sort) => void; onOpen: (v: Video) => void;
  competitorName: (id: string | null) => string; categoryName: (id: string | null) => string | undefined; adsOnly?: boolean;
}) {
  const cols: Col[] = [
    { key: "thumb", label: "", cell: (v) => {
      const t = thumbOf(v);
      return t ? <img src={t} loading="lazy" className="h-14 w-8 rounded object-cover" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} /> : <div className="h-14 w-8 rounded bg-muted" />;
    } },
    { key: "comp", label: "Concurrent", cell: (v) => <div><p className="font-medium">{competitorName(v.competitor_id)}</p>{v.origin && <Badge tone={v.origin === "ugc" ? "accent" : v.origin === "ad" ? "warning" : "outline"}>{ORIGIN_LABEL[v.origin]}</Badge>}</div> },
    { key: "platform", label: "Plateforme", cell: (v) => <span className="text-xs">{PLATFORM_LABEL[v.platform]}</span> },
    { key: "author", label: "Créateur", cell: (v) => <div className="max-w-44"><p className="truncate">@{v.author_handle ?? v.ad_page_name ?? "?"}</p><p className="text-xs text-muted-foreground">{compact(v.author_followers)} abonnés</p></div> },
    { key: "lang", label: "Langue / pays", cell: (v) => <span className="whitespace-nowrap text-xs">{v.language ?? "—"} {v.country ? `${flag(v.country)} ${v.country}` : ""}</span> },
    { key: "format", label: "Format", cell: (v) => <span className="text-xs">{categoryName(v.category_id) ?? "—"}</span> },
    ...(!adsOnly ? [
      { key: "views", label: "Vues", sort: "views", num: true, cell: (v: Video) => compact(v.views) },
      { key: "likes", label: "Likes", sort: "likes", num: true, cell: (v: Video) => compact(v.likes) },
      { key: "shares", label: "Partages", sort: "shares", num: true, cell: (v: Video) => compact(v.shares) },
      { key: "eng", label: "Engagement", sort: "engagement", num: true, cell: (v: Video) => pct(v.engagement) },
      { key: "outlier", label: "Outlier", sort: "outlier", num: true, cell: (v: Video) => times(v.outlier) },
      { key: "velocity", label: "Vues / jour", sort: "velocity", num: true, cell: (v: Video) => compact(v.velocity) },
    ] as Col[] : []),
    { key: "score", label: "Score", sort: "score", num: true, cell: (v) => <span className="font-semibold">{Math.round(v.score)}</span> },
    { key: "date", label: "Publiée", sort: "date", num: true, cell: (v) => <span className="whitespace-nowrap text-xs">{dateFr(v.is_ad ? v.ad_started_at : v.published_at)}</span> },
    { key: "ad", label: "Diffusion", sort: "ad_days", num: true, cell: (v) => (v.is_ad ? <span className="whitespace-nowrap text-xs">{v.ad_days ?? "?"} j{v.ad_active ? " · active" : ""}</span> : "—") },
  ];
  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            {cols.map((c) => (
              <th key={c.key} className={cn("border-b px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground", c.num ? "text-right" : "text-left")}>
                {c.sort ? (
                  <button onClick={() => onSort(c.sort!)} className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", sort === c.sort && "text-foreground")}>
                    {c.label}{sort === c.sort && (asc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onOpen(v)}>
              {cols.map((c) => <td key={c.key} className={cn("border-b px-3 py-2 align-middle", c.num && "text-right tabular-nums")}>{c.cell(v)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

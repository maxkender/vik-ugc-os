import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDown, ExternalLink, Info } from "lucide-react";
import { Badge, Button, Card, Empty, PageHeader, Spinner, Stat, Table, Td, Th } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useCategories, useCompetitors } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { cn, compact } from "@/lib/utils";
import { VideoCard } from "./library/VideoCard";
import { VideoDrawer } from "./library/VideoDrawer";
import { AssignBriefDialog } from "./library/AssignBriefDialog";
import { times, type Video } from "./library/types";

interface Stat_ {
  competitor_id: string; name: string; videos: number; organic: number; ugc: number; ads: number; total_views: number;
  avg_views: number | null; median_outlier: number | null; best_score: number | null; active_ads: number; longest_ad_days: number | null; creators: number;
}
type Key = "total_views" | "videos" | "ugc" | "active_ads" | "longest_ad_days" | "creators" | "median_outlier" | "avg_views";
const COLS: { key: Key; label: string; fmt: (s: Stat_) => string }[] = [
  { key: "total_views", label: "Vues totales", fmt: (s) => compact(Number(s.total_views)) },
  { key: "videos", label: "Vidéos", fmt: (s) => compact(Number(s.videos)) },
  { key: "avg_views", label: "Vues moy.", fmt: (s) => compact(s.avg_views === null ? null : Number(s.avg_views)) },
  { key: "ugc", label: "UGC", fmt: (s) => compact(Number(s.ugc)) },
  { key: "creators", label: "Créateurs UGC", fmt: (s) => compact(Number(s.creators)) },
  { key: "active_ads", label: "Pubs actives", fmt: (s) => `${s.active_ads} / ${s.ads}` },
  { key: "longest_ad_days", label: "Pub la + longue", fmt: (s) => (s.longest_ad_days ? `${s.longest_ad_days} j` : "—") },
  { key: "median_outlier", label: "Outlier médian", fmt: (s) => times(s.median_outlier) },
];

export default function Competitors() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("c");
  const [sortKey, setSortKey] = useState<Key>("total_views");
  const { data: comps } = useCompetitors();
  const { data: stats, isLoading } = useQuery({ queryKey: ["competitor_stats"], queryFn: async () => ((await supabase.rpc("competitor_stats")).data ?? []) as Stat_[] });
  const rows = useMemo(() => [...(stats ?? [])].sort((a, b) => Number(b[sortKey] ?? -1) - Number(a[sortKey] ?? -1)), [stats, sortKey]);
  const compOf = (id: string) => (comps ?? []).find((c: any) => c.id === id);

  return (
    <div>
      <PageHeader title="Concurrents" description="Classement des concurrents par performance de leurs vidéos (organique officiel, UGC qui cite la marque, pubs). Clique sur un concurrent pour voir ses meilleures vidéos, ses créateurs UGC et ses formats."
        actions={<Link to="/admin/settings/competitors"><Button variant="outline">Gérer les concurrents</Button></Link>} />
      <p className="mb-6 flex items-start gap-2 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span><b>Officiel</b> = posté par un compte du concurrent. <b>UGC</b> = posté par un autre créateur qui cite la marque (@mention, #hashtag ou nom dans la légende). <b>Pub</b> = Meta Ad Library. Les termes de marque et comptes officiels se règlent dans Réglages → Concurrents.</span>
      </p>
      {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : !rows.length ? (
        <Empty title="Aucun concurrent">Ajoute des concurrents dans Réglages → Concurrents, puis lance un backfill dans Agents de collecte.</Empty>
      ) : (
        <Table>
          <thead><tr>
            <Th>#</Th><Th>Concurrent</Th>
            {COLS.map((c) => (
              <Th key={c.key} className="text-right">
                <button onClick={() => setSortKey(c.key)} className={cn("inline-flex items-center gap-1 uppercase hover:text-foreground", sortKey === c.key && "text-foreground")}>
                  {c.label}{sortKey === c.key && <ArrowDown className="h-3 w-3" />}
                </button>
              </Th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((s, i) => {
              const c = compOf(s.competitor_id);
              return (
                <tr key={s.competitor_id} onClick={() => setParams({ c: s.competitor_id }, { replace: true })}
                  className={cn("cursor-pointer hover:bg-muted/50", selected === s.competitor_id && "bg-accent/5")}>
                  <Td className="text-muted-foreground">{i + 1}</Td>
                  <Td><span className="font-medium">{s.name}</span>{c?.discovered && <Badge tone="accent" className="ml-2">à valider</Badge>}{c && !c.active && <Badge className="ml-2">inactif</Badge>}</Td>
                  {COLS.map((col) => <Td key={col.key} className="text-right tabular-nums">{col.fmt(s)}</Td>)}
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {selected && stats && <CompetitorDetail stat={stats.find((s) => s.competitor_id === selected) ?? null} />}
    </div>
  );
}

function CompetitorDetail({ stat }: { stat: Stat_ | null }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: cats } = useCategories();
  const [open, setOpen] = useState<Video | null>(null);
  const [assign, setAssign] = useState<Video | null>(null);
  const id = stat?.competitor_id;
  const top = useQuery({
    queryKey: ["competitor", "top", id],
    enabled: !!id,
    queryFn: async () => ((await supabase.rpc("explore_videos", { p_competitor: id, p_sort: "score", p_limit: 12 })).data ?? []) as Video[],
  });
  const creators = useQuery({ queryKey: ["competitor", "creators", id], enabled: !!id, queryFn: async () => (await supabase.rpc("competitor_creators", { p_competitor: id, p_limit: 15 })).data ?? [] });
  const formats = useQuery({ queryKey: ["competitor", "formats", id], enabled: !!id, queryFn: async () => (await supabase.rpc("competitor_formats", { p_competitor: id })).data ?? [] });
  const { data: favs } = useQuery({
    queryKey: ["favorites", profile?.id],
    queryFn: async () => new Set(((await supabase.from("favorites").select("video_id").eq("user_id", profile!.id)).data ?? []).map((f) => f.video_id)),
    enabled: !!profile,
  });
  const toggleFav = async (v: Video) => {
    if (!profile) return;
    if (favs?.has(v.id)) await supabase.from("favorites").delete().eq("user_id", profile.id).eq("video_id", v.id);
    else {
      await supabase.from("favorites").insert({ user_id: profile.id, video_id: v.id });
      if (!v.video_path) callFn("collect", { action: "store_video", video_id: v.id }).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: ["favorites"] });
  };
  if (!stat) return null;
  const profileUrl = (handle: string, platform: string) => platform === "instagram" ? `https://www.instagram.com/${handle}/` : `https://www.tiktok.com/@${handle}`;
  const maxFormat = Math.max(1, ...((formats.data ?? []) as any[]).map((f) => Number(f.avg_views ?? 0)));

  return (
    <div className="mt-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-semibold">{stat.name}</h2>
        <div className="flex gap-2">
          <Link to={`/admin/library?competitor=${stat.competitor_id}&sort=views&view=table`}><Button variant="outline">Toutes ses vidéos (tableau) →</Button></Link>
          <Link to={`/admin/library?competitor=${stat.competitor_id}&sort=views`}><Button variant="outline">En grille →</Button></Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Vues totales" value={compact(Number(stat.total_views))} hint={`${stat.videos} vidéos · ${stat.organic} organiques`} />
        <Stat label="UGC" value={compact(Number(stat.ugc))} hint={`${stat.creators} créateurs`} />
        <Stat label="Pubs" value={`${stat.active_ads} actives / ${stat.ads}`} hint={stat.longest_ad_days ? `la plus longue : ${stat.longest_ad_days} j` : "—"} />
        <Stat label="Outlier médian" value={times(stat.median_outlier)} hint="vues ÷ abonnés" />
      </div>

      <section>
        <h3 className="mb-3 font-semibold">Top vidéos (score)</h3>
        {top.isLoading ? <Spinner /> : !top.data?.length ? <Empty title="Aucune vidéo pour ce concurrent">Lance un backfill ou ajoute ses comptes officiels / termes de marque dans Réglages → Concurrents.</Empty> : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {top.data.map((v) => <VideoCard key={v.id} v={v} fav={!!favs?.has(v.id)} onOpen={() => setOpen(v)} onFav={() => toggleFav(v)} categoryName={(cats ?? []).find((c: any) => c.id === v.category_id)?.name} />)}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="mb-3 font-semibold">Meilleurs créateurs UGC</h3>
          {!(creators.data as any[])?.length ? <Empty title="Aucun créateur UGC repéré">Les créateurs apparaissent quand leurs vidéos citent la marque. Lance « Découvrir des créateurs UGC » dans Agents de collecte.</Empty> : (
            <Table>
              <thead><tr><Th>Créateur</Th><Th className="text-right">Vidéos</Th><Th className="text-right">Vues</Th><Th className="text-right">Meilleure</Th><Th className="text-right">Outlier moy.</Th><Th /></tr></thead>
              <tbody>
                {(creators.data as any[]).map((c) => (
                  <tr key={`${c.platform}-${c.author_handle}`}>
                    <Td><Link className="font-medium hover:underline" to={`/admin/library?author=${encodeURIComponent(c.author_handle)}&sort=views&view=table`}>@{c.author_handle}</Link><p className="text-xs text-muted-foreground">{c.platform} · {compact(c.followers)} abonnés</p></Td>
                    <Td className="text-right tabular-nums">{c.videos}</Td>
                    <Td className="text-right tabular-nums">{compact(Number(c.total_views))}</Td>
                    <Td className="text-right tabular-nums">{compact(c.best_views)}</Td>
                    <Td className="text-right tabular-nums">{times(c.avg_outlier)}</Td>
                    <Td><a href={profileUrl(c.author_handle, c.platform)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Profil"><ExternalLink className="h-3.5 w-3.5" /></a></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>
        <section>
          <h3 className="mb-3 font-semibold">Formats qui marchent</h3>
          {!(formats.data as any[])?.length ? <Empty title="Pas encore de formats">Les vidéos organiques sont classées automatiquement par format (catégories).</Empty> : (
            <Card className="space-y-3">
              {(formats.data as any[]).map((f) => (
                <Link key={f.category_id ?? "none"} to={`/admin/library?competitor=${stat.competitor_id}${f.category_id ? `&category=${f.category_id}` : ""}&sort=views`} className="block">
                  <div className="mb-1 flex justify-between text-sm"><span className="font-medium">{f.name}</span><span className="text-muted-foreground">{f.videos} vidéos · {compact(Number(f.avg_views ?? 0))} vues moy. · score {f.avg_score ?? "—"}</span></div>
                  <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-accent" style={{ width: `${(Number(f.avg_views ?? 0) / maxFormat) * 100}%` }} /></div>
                </Link>
              ))}
            </Card>
          )}
        </section>
      </div>

      <VideoDrawer video={open} onClose={() => setOpen(null)} fav={!!(open && favs?.has(open.id))} onFav={() => open && toggleFav(open)} onAssign={() => setAssign(open)} />
      <AssignBriefDialog video={assign} open={!!assign} onClose={() => setAssign(null)} origin={assign?.is_ad ? "ad" : "library"} />
    </div>
  );
}

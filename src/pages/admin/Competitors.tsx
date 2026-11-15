import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowRight, ExternalLink, Eye, Film, Info, Megaphone, Settings2, Users, X, Zap } from "lucide-react";
import { Badge, Button, Card, CardTitle, Empty, KpiCard, PageHeader, Spinner } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useCategories, useCompetitors } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { cn, compact } from "@/lib/utils";
import { PlatformIcon, VideoCard } from "./library/VideoCard";
import { VideoDrawer } from "./library/VideoDrawer";
import { AssignBriefDialog } from "./library/AssignBriefDialog";
import { times, type Video } from "./library/types";

interface Stat_ {
  competitor_id: string; name: string; videos: number; organic: number; ugc: number; ads: number; total_views: number;
  avg_views: number | null; median_outlier: number | null; best_score: number | null; active_ads: number; longest_ad_days: number | null; creators: number;
}
type Key = "total_views" | "videos" | "ugc" | "active_ads" | "longest_ad_days" | "creators" | "median_outlier" | "avg_views";
const COLS: { key: Key; label: string; fmt: (s: Stat_) => React.ReactNode }[] = [
  { key: "videos", label: "Vidéos", fmt: (s) => compact(Number(s.videos)) },
  { key: "avg_views", label: "Vues moy.", fmt: (s) => compact(s.avg_views === null ? null : Number(s.avg_views)) },
  { key: "ugc", label: "UGC", fmt: (s) => compact(Number(s.ugc)) },
  { key: "creators", label: "Créateurs", fmt: (s) => compact(Number(s.creators)) },
  { key: "active_ads", label: "Pubs actives", fmt: (s) => <>{s.active_ads}<span className="text-subtle-foreground"> / {s.ads}</span></> },
  { key: "longest_ad_days", label: "Pub la + longue", fmt: (s) => (s.longest_ad_days ? `${s.longest_ad_days} j` : "—") },
  { key: "median_outlier", label: "Outlier méd.", fmt: (s) => times(s.median_outlier) },
];

/** Couleurs de la palette Vik, une par concurrent (rang). */
const PALETTE = [
  { bar: "#004dff", tile: "bg-tint-blue text-accent" },
  { bar: "#8c43ff", tile: "bg-tint-violet text-[#7a32ef]" },
  { bar: "#1fafff", tile: "bg-tint-cyan text-[#0a95e0]" },
  { bar: "#ffbb43", tile: "bg-tint-yellow text-[#c98a00]" },
  { bar: "#fe504f", tile: "bg-tint-red text-[#e5383b]" },
  { bar: "#12a150", tile: "bg-tint-green text-[#12a150]" },
  { bar: "#5b6478", tile: "bg-[#f1f3f7] text-muted-foreground" },
];

export default function Competitors() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("c");
  const [sortKey, setSortKey] = useState<Key | "total_views">("total_views");
  const { data: comps } = useCompetitors();
  const { data: stats, isLoading } = useQuery({ queryKey: ["competitor_stats"], queryFn: async () => ((await supabase.rpc("competitor_stats")).data ?? []) as Stat_[] });
  const byViews = useMemo(() => [...(stats ?? [])].sort((a, b) => Number(b.total_views) - Number(a.total_views)), [stats]);
  const rows = useMemo(() => [...(stats ?? [])].sort((a, b) => Number(b[sortKey] ?? -1) - Number(a[sortKey] ?? -1)), [stats, sortKey]);
  const colorOf = (id: string) => PALETTE[Math.max(0, byViews.findIndex((s) => s.competitor_id === id)) % PALETTE.length];
  const maxViews = Math.max(1, ...byViews.map((s) => Number(s.total_views)));
  const compOf = (id: string) => (comps ?? []).find((c: any) => c.id === id);
  const sel = selected ? stats?.find((s) => s.competitor_id === selected) ?? null : null;
  // Le détail s'ouvre sous le classement : on le fait défiler à l'écran.
  useEffect(() => {
    if (!sel) return;
    const t = setTimeout(() => document.getElementById("detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    return () => clearTimeout(t);
  }, [sel?.competitor_id]);

  return (
    <div>
      <PageHeader title="Concurrents" description="Qui gagne la bataille de l'attention ? Classement par performance des vidéos collectées : comptes officiels, UGC qui cite la marque et pubs."
        actions={<Link to="/admin/settings/competitors"><Button variant="secondary"><Settings2 className="h-4 w-4" /> Gérer les concurrents</Button></Link>} />

      {isLoading ? <div className="flex justify-center py-24"><Spinner /></div> : !rows.length ? (
        <Empty title="Aucun concurrent" action={<Link to="/admin/settings/competitors"><Button>Ajouter un concurrent</Button></Link>}>
          Ajoute des concurrents dans Réglages → Concurrents, puis lance un backfill dans Agents de collecte.
        </Empty>
      ) : (
        <>
          {/* Podium : les 3 premiers en cartes */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {byViews.slice(0, 3).map((s, i) => {
              const col = PALETTE[i];
              return (
                <button key={s.competitor_id} onClick={() => setParams({ c: s.competitor_id }, { replace: true })}
                  className={cn("group rounded-xl border bg-white p-6 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-card", selected === s.competitor_id && "border-[#cddcff] ring-4 ring-accent/5")}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-base font-semibold", col.tile)}>{s.name.charAt(0)}</span>
                      <div>
                        <p className="text-[15px] font-semibold text-foreground">{s.name}</p>
                        <p className="text-xs text-subtle-foreground">#{i + 1} en vues collectées</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-subtle-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="tabular mt-5 text-[28px] font-semibold leading-none tracking-[-0.02em] text-foreground">{compact(Number(s.total_views))}<span className="ml-1.5 text-sm font-normal text-subtle-foreground">vues</span></p>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span><b className="tabular font-semibold text-foreground">{s.videos}</b> vidéos</span>
                    <span><b className="tabular font-semibold text-foreground">{s.creators}</b> créateurs UGC</span>
                    <span><b className="tabular font-semibold text-foreground">{s.active_ads}</b> pubs actives</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Classement complet */}
          <div className="overflow-hidden rounded-xl border bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-separator px-6 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Classement</h2>
                <p className="text-[13px] text-muted-foreground">Clique sur un concurrent pour voir ses meilleures vidéos, ses créateurs et ses formats.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.06em] text-subtle-foreground">
                    <th className="w-12 border-b px-6 py-3 text-left font-medium">#</th>
                    <th className="border-b px-4 py-3 text-left font-medium">Concurrent</th>
                    <th className="min-w-[200px] border-b px-4 py-3 text-left font-medium">
                      <SortBtn active={sortKey === "total_views"} onClick={() => setSortKey("total_views")}>Vues totales</SortBtn>
                    </th>
                    {COLS.map((c) => (
                      <th key={c.key} className="whitespace-nowrap border-b px-4 py-3 text-right font-medium">
                        <SortBtn active={sortKey === c.key} onClick={() => setSortKey(c.key)}>{c.label}</SortBtn>
                      </th>
                    ))}
                    <th className="w-8 border-b py-3 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s, i) => {
                    const c = compOf(s.competitor_id);
                    const col = colorOf(s.competitor_id);
                    return (
                      <tr key={s.competitor_id} onClick={() => setParams({ c: s.competitor_id }, { replace: true })}
                        className={cn("group cursor-pointer transition-colors hover:bg-muted", selected === s.competitor_id && "bg-accent-soft/60")}>
                        <td className="tabular h-[60px] border-b border-separator px-6 text-subtle-foreground">{i + 1}</td>
                        <td className="border-b border-separator px-4">
                          <div className="flex items-center gap-3">
                            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold", col.tile)}>{s.name.charAt(0)}</span>
                            <span className="font-medium text-foreground">{s.name}</span>
                            {c?.discovered && <Badge tone="accent">à valider</Badge>}
                            {c && !c.active && <Badge>inactif</Badge>}
                          </div>
                        </td>
                        <td className="border-b border-separator px-4">
                          <div className="flex items-center gap-3">
                            <span className="tabular w-14 font-semibold text-foreground">{compact(Number(s.total_views))}</span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f1f3f7]"><div className="h-full rounded-full" style={{ width: `${(Number(s.total_views) / maxViews) * 100}%`, background: col.bar }} /></div>
                          </div>
                        </td>
                        {COLS.map((col2) => <td key={col2.key} className="tabular border-b border-separator px-4 text-right text-muted-foreground">{col2.fmt(s)}</td>)}
                        <td className="border-b border-separator py-0 pr-4 text-subtle-foreground"><ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="flex items-start gap-2 border-t border-separator px-6 py-3.5 text-xs leading-relaxed text-subtle-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span><b className="font-medium text-muted-foreground">Officiel</b> : posté par un compte du concurrent. <b className="font-medium text-muted-foreground">UGC</b> : un autre créateur cite la marque (@mention, #hashtag ou nom). <b className="font-medium text-muted-foreground">Pub</b> : Meta Ad Library. Outlier = vues ÷ abonnés.</span>
            </p>
          </div>
        </>
      )}
      {sel && <CompetitorDetail stat={sel} color={colorOf(sel.competitor_id)} onClose={() => setParams({}, { replace: true })} />}
    </div>
  );
}

function SortBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={cn("inline-flex items-center gap-1 uppercase tracking-[0.06em] hover:text-foreground", active && "text-foreground")}>
      {children}{active && <ArrowDown className="h-3 w-3 text-accent" />}
    </button>
  );
}

function CompetitorDetail({ stat, color, onClose }: { stat: Stat_; color: (typeof PALETTE)[number]; onClose: () => void }) {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: cats } = useCategories();
  const [open, setOpen] = useState<Video | null>(null);
  const [assign, setAssign] = useState<Video | null>(null);
  const id = stat.competitor_id;
  const top = useQuery({ queryKey: ["competitor", "top", id], queryFn: async () => ((await supabase.rpc("explore_videos", { p_competitor: id, p_sort: "score", p_limit: 10 })).data ?? []) as Video[] });
  const creators = useQuery({ queryKey: ["competitor", "creators", id], queryFn: async () => (await supabase.rpc("competitor_creators", { p_competitor: id, p_limit: 10 })).data ?? [] });
  const formats = useQuery({ queryKey: ["competitor", "formats", id], queryFn: async () => (await supabase.rpc("competitor_formats", { p_competitor: id })).data ?? [] });
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
  const profileUrl = (handle: string, platform: string) => platform === "instagram" ? `https://www.instagram.com/${handle}/` : `https://www.tiktok.com/@${handle}`;
  const fmts = (formats.data ?? []) as any[];
  const maxFormat = Math.max(1, ...fmts.map((f) => Number(f.avg_views ?? 0)));
  const crs = (creators.data ?? []) as any[];

  return (
    <div className="mt-12 scroll-mt-6 space-y-6" id="detail">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-lg font-semibold", color.tile)}>{stat.name.charAt(0)}</span>
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.01em] text-foreground">{stat.name}</h2>
            <p className="text-[13px] text-muted-foreground">{stat.videos} vidéos collectées · {stat.organic} organiques · {stat.ads} pubs</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/admin/library?competitor=${id}&sort=views&view=table`}><Button variant="secondary">Toutes ses vidéos</Button></Link>
          <Link to={`/admin/winning-ads?competitor=${id}`}><Button variant="secondary">Ses pubs</Button></Link>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Vues totales" value={compact(Number(stat.total_views))} icon={<Eye />} tint="blue" hint={`${compact(stat.avg_views === null ? null : Number(stat.avg_views))} vues en moyenne`} />
        <KpiCard label="Vidéos UGC" value={compact(Number(stat.ugc))} icon={<Users />} tint="violet" hint={`${stat.creators} créateurs différents`} />
        <KpiCard label="Pubs actives" value={<>{stat.active_ads}<span className="text-base font-medium text-subtle-foreground"> / {stat.ads}</span></>} icon={<Megaphone />} tint="yellow" hint={stat.longest_ad_days ? `La plus longue : ${stat.longest_ad_days} jours` : "Aucune pub collectée"} />
        <KpiCard label="Outlier médian" value={times(stat.median_outlier)} icon={<Zap />} tint="red" hint="Vues ÷ abonnés (organique)" />
      </div>

      <Card>
        <CardTitle title="Meilleures vidéos" description="Triées par score (percée, vitesse, engagement)"
          action={<Link to={`/admin/library?competitor=${id}&sort=score`} className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">Tout voir <ArrowRight className="h-3.5 w-3.5" /></Link>} />
        {top.isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : !top.data?.length ? (
          <Empty title="Aucune vidéo pour ce concurrent" icon={<Film className="h-5 w-5" />}>Lance un backfill ou ajoute ses comptes officiels et termes de marque dans Réglages → Concurrents.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {top.data.map((v) => <VideoCard key={v.id} v={v} fav={!!favs?.has(v.id)} onOpen={() => setOpen(v)} onFav={() => toggleFav(v)} competitorName={stat.name} categoryName={(cats ?? []).find((c: any) => c.id === v.category_id)?.name} />)}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle title="Meilleurs créateurs UGC" description="Créateurs tiers qui citent la marque, par vues cumulées" />
          {!crs.length ? <Empty title="Aucun créateur UGC repéré" icon={<Users className="h-5 w-5" />}>Ils apparaissent quand leurs vidéos citent la marque. Lance « Découvrir des créateurs UGC » dans Agents de collecte.</Empty> : (
            <div className="-mx-2">
              {crs.map((c, i) => (
                <div key={`${c.platform}-${c.author_handle}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted">
                  <span className="tabular w-4 text-xs text-subtle-foreground">{i + 1}</span>
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold uppercase", PALETTE[i % PALETTE.length].tile)}>{c.author_handle.charAt(0)}</span>
                  <div className="min-w-0 flex-1">
                    <Link className="truncate text-[13px] font-medium text-foreground hover:underline" to={`/admin/library?author=${encodeURIComponent(c.author_handle)}&sort=views&view=table`}>@{c.author_handle}</Link>
                    <p className="flex items-center gap-1 text-xs text-subtle-foreground"><PlatformIcon p={c.platform} className="h-3 w-3" />{compact(c.followers)} abonnés · {c.videos} vidéo{c.videos > 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-[13px] font-semibold text-foreground">{compact(Number(c.total_views))}</p>
                    <p className="tabular text-[11px] text-subtle-foreground">outlier {times(c.avg_outlier)}</p>
                  </div>
                  <a href={profileUrl(c.author_handle, c.platform)} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-subtle-foreground hover:bg-white hover:text-foreground" aria-label="Profil"><ExternalLink className="h-3.5 w-3.5" /></a>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <CardTitle title="Formats qui marchent" description="Vues moyennes par format (organique)" />
          {!fmts.length ? <Empty title="Pas encore de formats" icon={<Film className="h-5 w-5" />}>Les vidéos organiques sont classées automatiquement par format.</Empty> : (
            <div className="space-y-4">
              {fmts.map((f, i) => (
                <Link key={f.category_id ?? "none"} to={`/admin/library?competitor=${id}${f.category_id ? `&category=${f.category_id}` : ""}&sort=views`} className="group block">
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="font-medium text-foreground group-hover:text-accent">{f.name}</span>
                    <span className="tabular text-xs text-subtle-foreground">{f.videos} vidéo{f.videos > 1 ? "s" : ""} · <b className="font-semibold text-foreground">{compact(Number(f.avg_views ?? 0))}</b> vues moy.</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#f1f3f7]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (Number(f.avg_views ?? 0) / maxFormat) * 100)}%`, background: PALETTE[i % PALETTE.length].bar }} /></div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <VideoDrawer video={open} onClose={() => setOpen(null)} fav={!!(open && favs?.has(open.id))} onFav={() => open && toggleFav(open)} onAssign={() => setAssign(open)} />
      <AssignBriefDialog video={assign} open={!!assign} onClose={() => setAssign(null)} origin={assign?.is_ad ? "ad" : "library"} />
    </div>
  );
}

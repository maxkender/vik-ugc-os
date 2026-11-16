import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clapperboard, Eye, Film, Flame, Heart, Megaphone, Sparkles, UserPlus, Users, Hourglass, ClipboardCheck } from "lucide-react";
import { Button, Card, CardTitle, Empty, KpiCard, MetricPill, PageHeader, Spinner } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { compact, cn } from "@/lib/utils";
import { VideoDrawer } from "./library/VideoDrawer";
import { VideoPlayer } from "./library/VideoPlayer";
import { hoverSource } from "@shared/playback.ts";
import { signedVideoUrl } from "@/components/video/VideoSurface";
import { AssignBriefDialog } from "./library/AssignBriefDialog";
import { thumbOf } from "./library/media";
import type { Video } from "./library/types";

interface Stats {
  days: string[];
  videos: number[];
  outliers: number[];
  applications: number[];
  posts: number[];
  spend: number[];
  apify: number[];
  by_competitor: { name: string; d: string; n: number }[];
  totals: { videos: number; ugc: number; active_posters: number; posts_today: number; posts_goal: number };
  funnel: { applied: number; accepted: number; signed: number; active: number };
  todo: { to_review: number; blocked: number; to_validate: number };
}

/** Couleurs de la palette Vik pour les séries (concurrents). */
const SERIES = ["#004dff", "#8c43ff", "#1fafff", "#ffbb43", "#fe504f", "#12a150", "#0b1530", "#9aa3b5"];

const sum = (a: number[] = []) => a.reduce((x, y) => x + Number(y || 0), 0);
/** Évolution des 7 derniers jours par rapport aux 7 précédents (%). */
function delta(series: number[] = []): number | null {
  const prev = sum(series.slice(0, 7)), cur = sum(series.slice(7));
  if (prev === 0) return cur > 0 ? 100 : null;
  return ((cur - prev) / prev) * 100;
}
const money = (n: number, cur = "€") => `${n.toLocaleString("fr-FR", { maximumFractionDigits: n < 100 ? 2 : 0 })} ${cur}`;

export default function Dashboard() {
  const { profile } = useAuth();
  const [open, setOpen] = useState<Video | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [assign, setAssign] = useState<Video | null>(null);
  const { data: s, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_stats");
      if (error) throw error;
      return data as Stats;
    },
  });
  const { data: top } = useQuery({
    queryKey: ["dashboard", "top"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
      let { data } = await supabase.rpc("explore_videos", { p_ads: "organic", p_since: since, p_sort: "score", p_limit: 8 });
      if (!data || data.length < 8) ({ data } = await supabase.rpc("explore_videos", { p_ads: "organic", p_sort: "velocity", p_limit: 8 }));
      return (data ?? []) as Video[];
    },
  });
  const { data: ranking } = useQuery({
    queryKey: ["dashboard", "ranking"],
    queryFn: async () => ((await supabase.rpc("competitor_stats")).data ?? []).sort((a: any, b: any) => Number(b.total_views) - Number(a.total_views)).slice(0, 6),
  });
  const { data: comps } = useQuery({ queryKey: ["competitors-names"], queryFn: async () => (await supabase.from("competitors").select("id, name")).data ?? [] });

  const hello = (profile?.full_name ?? "").split(" ")[0];
  const isAdmin = profile?.role === "admin";

  if (isLoading || !s) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div>
      <PageHeader
        breadcrumbs={false}
        title={hello ? `Bonjour ${hello}` : "Tableau de bord"}
        description="Ce qui se passe sur la veille concurrentielle, le recrutement et la production. Tendances sur 7 jours."
        actions={<Link to="/admin/library"><Button variant="secondary"><Film className="h-4 w-4" /> Bibliothèque</Button></Link>}
      />

      {/* KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard label="Vidéos collectées" value={compact(s.totals.videos)} icon={<Film />} tint="blue" series={s.videos} delta={delta(s.videos)}
          hint={`+${compact(sum(s.videos.slice(7)))} cette semaine`} to="/admin/library?sort=recent" />
        <KpiCard label="UGC qui percent" value={sum(s.outliers.slice(7))} icon={<Flame />} tint="red" series={s.outliers} delta={delta(s.outliers)}
          hint="Vues ≥ 10× les abonnés, 7 j" to="/admin/library?sort=outlier&origin=ugc" />
        <KpiCard label="Candidatures" value={sum(s.applications.slice(7))} icon={<UserPlus />} tint="violet" series={s.applications} delta={delta(s.applications)}
          hint={`${s.funnel.applied} au total`} to="/admin/recruitment/candidates" />
        <KpiCard label="Créateurs actifs" value={s.totals.active_posters} icon={<Users />} tint="cyan" series={s.posts} hint="Posteurs actifs" to="/admin/posters" />
        <KpiCard label="Posts aujourd'hui" value={<>{s.totals.posts_today}<span className="text-base font-medium text-subtle-foreground"> / {s.totals.posts_goal}</span></>}
          icon={<Clapperboard />} tint="green" series={s.posts} delta={delta(s.posts)} hint="Objectif : 1 par créateur actif" to="/admin/briefs" />
        <KpiCard label={isAdmin ? "Spend Meta UGC OS (7 j)" : "Coût Apify (7 j)"} value={isAdmin ? money(sum(s.spend.slice(7))) : `${sum(s.apify.slice(7)).toFixed(2)} $`}
          icon={<Megaphone />} tint="yellow" series={isAdmin ? s.spend : s.apify}
          hint={`Apify : ${sum(s.apify.slice(7)).toFixed(2)} $ sur 7 j`} to={isAdmin ? "/admin/recruitment/campaigns" : undefined} />
      </div>

      {/* Graphique + funnel */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle title="Vidéos collectées par jour" description="14 derniers jours, par concurrent"
            action={<Link to="/admin/competitors" className="text-[13px] font-medium text-accent hover:underline">Concurrents</Link>} />
          <StackedBars days={s.days} rows={s.by_competitor} />
        </Card>
        <Card>
          <CardTitle title="Funnel recrutement" description="De la candidature au premier post" />
          <Funnel f={s.funnel} />
        </Card>
      </div>

      {/* Top vidéos + à traiter */}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle title="Top vidéos de la semaine" description="Organique, triées par score (percée, vitesse, engagement)"
            action={<Link to="/admin/library?sort=score&ads=organic" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">Tout voir <ArrowRight className="h-3.5 w-3.5" /></Link>} />
          {top && top.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {top.map((v) => <TopCard key={v.id} v={v} competitor={comps?.find((c: any) => c.id === v.competitor_id)?.name} onOpen={() => setPlaying(top.indexOf(v))} />)}
            </div>
          ) : <Empty title="Pas encore de vidéos" icon={<Film className="h-5 w-5" />}>Lance un agent de collecte pour remplir la bibliothèque.</Empty>}
        </Card>
        <div className="space-y-6">
          <Card>
            <CardTitle title="À traiter" description="Ce qui attend une action" />
            <div className="space-y-2">
              <TodoRow icon={<UserPlus />} tint="bg-tint-violet text-vik-violet" label="Candidats à revoir" n={s.todo.to_review} to="/admin/recruitment/candidates" action="Revoir" />
              <TodoRow icon={<Hourglass />} tint="bg-tint-yellow text-[#c98a00]" label="Créateurs bloqués > 48 h" n={s.todo.blocked} to="/admin/recruitment/onboarding" action="Relancer" />
              <TodoRow icon={<ClipboardCheck />} tint="bg-tint-blue text-accent" label="Posts à valider" n={s.todo.to_validate} to="/admin/briefs" action="Valider" />
            </div>
          </Card>
          <Card>
            <CardTitle title="Classement concurrents" description="Vues totales collectées"
              action={<Link to="/admin/competitors" className="text-[13px] font-medium text-accent hover:underline">Détail</Link>} />
            <Ranking rows={ranking ?? []} />
          </Card>
        </div>
      </div>

      <VideoPlayer list={top ?? []} index={playing} onIndex={setPlaying} onAssign={(v) => { setPlaying(null); setAssign(v); }}
        onDetails={(v) => { setPlaying(null); setOpen(v); }} competitorName={(id) => comps?.find((c: any) => c.id === id)?.name} />
      <VideoDrawer video={open} onClose={() => setOpen(null)} fav={false} onFav={() => {}} onAssign={() => { setAssign(open); }} />
      <AssignBriefDialog video={assign} open={!!assign} onClose={() => setAssign(null)} origin={assign?.is_ad ? "ad" : "library"} />
    </div>
  );
}

function StackedBars({ days, rows }: { days: string[]; rows: Stats["by_competitor"] }) {
  const names = useMemo(() => {
    const tot = new Map<string, number>();
    rows.forEach((r) => tot.set(r.name, (tot.get(r.name) ?? 0) + r.n));
    return [...tot.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 7);
  }, [rows]);
  const grid = days.map((d) => {
    const cells = names.map((n) => rows.filter((r) => r.d === d && r.name === n).reduce((x, r) => x + r.n, 0));
    const other = rows.filter((r) => r.d === d && !names.includes(r.name)).reduce((x, r) => x + r.n, 0);
    return { d, cells: [...cells, other], total: cells.reduce((a, b) => a + b, 0) + other };
  });
  const max = Math.max(1, ...grid.map((g) => g.total));
  const [hover, setHover] = useState<number | null>(null);
  if (!rows.length) return <Empty title="Aucune collecte sur 14 jours" icon={<Sparkles className="h-5 w-5" />}>Active des sources dans « Agents de collecte ».</Empty>;
  return (
    <div>
      <div className="relative flex h-56 items-end gap-2 border-b border-separator pb-px">
        {[0.25, 0.5, 0.75, 1].map((f) => <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-separator" style={{ bottom: `${f * 100}%` }} />)}
        {grid.map((g, i) => (
          <div key={g.d} className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div className="flex flex-col-reverse overflow-hidden rounded-md" style={{ height: `${(g.total / max) * 100}%` }}>
              {g.cells.map((c, j) => c > 0 && <div key={j} style={{ height: `${(c / g.total) * 100}%`, background: SERIES[j] ?? SERIES[7] }} className={cn("min-h-[2px] transition-opacity", hover !== null && hover !== i && "opacity-40")} />)}
            </div>
            {hover === i && g.total > 0 && (
              <div className="absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 rounded-lg border bg-white p-2.5 text-xs shadow-card">
                <p className="mb-1.5 font-semibold">{new Date(g.d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · {g.total}</p>
                {[...names, "Autres"].map((n, j) => g.cells[j] > 0 && (
                  <p key={n} className="flex items-center justify-between gap-2 text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: SERIES[j] ?? SERIES[7] }} />{n}</span><span className="tabular font-medium text-foreground">{g.cells[j]}</span></p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-[11px] text-subtle-foreground">
        {grid.map((g, i) => <span key={g.d} className="flex-1 text-center">{i % 2 === 1 || i === grid.length - 1 ? new Date(g.d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}</span>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {names.map((n, j) => <span key={n} className="flex items-center gap-1.5 text-xs text-muted-foreground"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES[j] }} />{n}</span>)}
      </div>
    </div>
  );
}

function Funnel({ f }: { f: Stats["funnel"] }) {
  const steps = [
    { label: "Candidatures", n: f.applied, color: "#004dff" },
    { label: "Acceptées", n: f.accepted, color: "#4f7dff" },
    { label: "Contrats signés", n: f.signed, color: "#8c43ff" },
    { label: "Actifs (1er post)", n: f.active, color: "#12a150" },
  ];
  const max = Math.max(1, f.applied);
  return (
    <div className="space-y-4">
      {steps.map((st, i) => (
        <div key={st.label}>
          <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
            <span className="text-muted-foreground">{st.label}</span>
            <span className="tabular font-semibold text-foreground">{st.n}{i > 0 && steps[i - 1].n > 0 && <span className="ml-1.5 text-xs font-normal text-subtle-foreground">{Math.round((st.n / steps[i - 1].n) * 100)} %</span>}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#f1f3f7]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (st.n / max) * 100)}%`, background: st.color }} /></div>
        </div>
      ))}
      <Link to="/admin/recruitment/onboarding" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">Suivi de l'onboarding <ArrowRight className="h-3.5 w-3.5" /></Link>
    </div>
  );
}

function TopCard({ v, competitor, onOpen }: { v: Video; competitor?: string; onOpen: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const thumb = thumbOf(v);
  const eng = (v as any).engagement as number | null;
  return (
    <button onClick={onOpen} onMouseEnter={async () => { const h = hoverSource(v); setSrc(!h ? null : h.kind === "stored" ? await signedVideoUrl(h.path) : h.kind === "mp4" ? h.url : null); }} onMouseLeave={() => setSrc(null)} className="group text-left">
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[#f1f3f7] ring-1 ring-border">
        {thumb && <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />}
        {src && <video src={src} autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" onError={() => setSrc(null)} />}
        <div className="absolute left-2 top-2"><MetricPill tone="dark">{Math.round(v.score)}</MetricPill></div>
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 pt-10">
          <MetricPill tone="dark" icon={<Eye />}>{compact(v.views)}</MetricPill>
          {eng !== null && eng !== undefined && <MetricPill tone="dark" icon={<Heart />}>{(eng * 100).toFixed(1)} %</MetricPill>}
        </div>
      </div>
      <p className="mt-2 truncate text-[13px] font-medium text-foreground">@{v.author_handle ?? v.ad_page_name}</p>
      <p className="truncate text-xs text-subtle-foreground">{competitor ?? "Hors concurrents"}</p>
    </button>
  );
}

function TodoRow({ icon, tint, label, n, to, action }: { icon: React.ReactNode; tint: string; label: string; n: number; to: string; action: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-separator px-3 py-2.5">
      <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4", tint)}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="tabular text-xs text-subtle-foreground">{n === 0 ? "Rien en attente" : `${n} en attente`}</p>
      </div>
      {n > 0 ? <Link to={to}><Button size="sm" variant="secondary">{action}</Button></Link> : <CheckCircle2 className="h-4 w-4 text-success" />}
    </div>
  );
}

function Ranking({ rows }: { rows: any[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">Aucun concurrent configuré.</p>;
  const max = Math.max(1, ...rows.map((r) => Number(r.total_views)));
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <Link key={r.competitor_id} to={`/admin/competitors?c=${r.competitor_id}`} className="block">
          <div className="flex items-center justify-between text-[13px]">
            <span className="flex items-center gap-2"><span className="tabular w-4 text-subtle-foreground">{i + 1}</span><span className="font-medium text-foreground">{r.name}</span></span>
            <span className="tabular text-muted-foreground">{compact(Number(r.total_views))}</span>
          </div>
          <div className="ml-6 mt-1 h-1.5 overflow-hidden rounded-full bg-[#f1f3f7]"><div className="h-full rounded-full" style={{ width: `${(Number(r.total_views) / max) * 100}%`, background: SERIES[i % SERIES.length] }} /></div>
        </Link>
      ))}
    </div>
  );
}

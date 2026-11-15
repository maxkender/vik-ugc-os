// Pubs gagnantes : les pubs vidéo des concurrents (Meta Ad Library), triées par longévité, variantes ou récence.
// Une pub qui tourne longtemps, déclinée en plusieurs variantes, est une pub rentable : on la recycle en brief organique.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Archive, CalendarDays, Clock, ExternalLink, Flame, Globe2, Layers, LayoutGrid, Megaphone, Play, Recycle, Rows3, Trophy, Zap,
} from "lucide-react";
import { Badge, Button, Card, Dialog, Empty, IconTile, KpiCard, MetricPill, PageHeader, Spinner, Table, Tabs, Td, Th, useToast, type Tint } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn, flag } from "@/lib/utils";
import { FilterChip, SortMenu } from "./library/FilterChip";
import { ThumbPlaceholder, displayName } from "./library/VideoCard";
import { AssignBriefDialog } from "./library/AssignBriefDialog";
import { playableUrl, thumbOf } from "./library/media";
import type { Video } from "./library/types";

type AdSort = "ad_days" | "variants" | "recent";
const SORTS: { value: AdSort; label: string }[] = [
  { value: "ad_days", label: "Longévité (jours de diffusion)" },
  { value: "variants", label: "Nombre de variantes" },
  { value: "recent", label: "Récence (début de diffusion)" },
];
const PLATFORM_NAME: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", messenger: "Messenger", audience_network: "Audience Network", threads: "Threads", whatsapp: "WhatsApp",
};
const TINTS: Tint[] = ["blue", "violet", "cyan", "yellow", "red", "green"];

const dateFr = (d: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  d ? new Date(d).toLocaleDateString("fr-FR", opts) : "—";
const variantsOf = (v: Video) => Math.max(1, v.ad_variants ?? 1);

export default function WinningAds() {
  const [params, setParams] = useSearchParams();
  const get = (k: string, d = "") => params.get(k) ?? d;
  const set = (k: string, val: string) => {
    const p = new URLSearchParams(params);
    if (val) p.set(k, val); else p.delete(k);
    setParams(p, { replace: true });
  };
  const toast = useToast();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const view = get("view", "cards") as "cards" | "table";
  const sort = get("sort", "ad_days") as AdSort;
  const grouped = get("group", "1") === "1";
  const withUnattached = get("scope") === "all";
  const [open, setOpen] = useState<Video | null>(null);
  const [assign, setAssign] = useState<Video | null>(null);

  const { data: comps } = useQuery({ queryKey: ["competitors-names"], queryFn: async () => (await supabase.from("competitors").select("id, name")).data ?? [] });
  const compName = (id: string | null) => (comps ?? []).find((c: any) => c.id === id)?.name as string | undefined;

  const { data: ads, isLoading } = useQuery({
    queryKey: ["winning-ads", withUnattached],
    queryFn: async () => {
      let q = supabase.from("videos").select("*").eq("is_ad", true).order("ad_days", { ascending: false, nullsFirst: false }).limit(2000);
      if (!withUnattached) q = q.not("competitor_id", "is", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Video[];
    },
  });

  // Filtres côté client : quelques centaines de pubs au plus.
  const minDays = Number(get("minDays", "0"));
  const filtered = useMemo(() => {
    const rows = (ads ?? []).filter((v) =>
      (!get("competitor") || v.competitor_id === get("competitor")) &&
      (get("active") !== "1" || v.ad_active) &&
      (v.ad_days ?? 0) >= minDays &&
      (!get("country") || (v.ad_countries ?? []).includes(get("country"))));
    const key: Record<AdSort, (v: Video) => number> = {
      ad_days: (v) => v.ad_days ?? -1,
      variants: (v) => variantsOf(v) * 10_000 + (v.ad_days ?? 0),
      recent: (v) => (v.ad_started_at ? new Date(v.ad_started_at).getTime() : 0),
    };
    return [...rows].sort((a, b) => key[sort](b) - key[sort](a));
  }, [ads, params]);

  const countries = useMemo(() => {
    const m = new Map<string, number>();
    (ads ?? []).forEach((v) => (v.ad_countries ?? []).forEach((c) => m.set(c, (m.get(c) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [ads]);

  const groups = useMemo(() => {
    const m = new Map<string, Video[]>();
    filtered.forEach((v) => {
      const k = v.competitor_id ?? "none";
      m.set(k, [...(m.get(k) ?? []), v]);
    });
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const kpi = useMemo(() => {
    const all = filtered;
    const longest = all.reduce((x, v) => Math.max(x, v.ad_days ?? 0), 0);
    const active = all.filter((v) => v.ad_active).length;
    const variants = all.length ? all.reduce((x, v) => x + variantsOf(v), 0) / all.length : 0;
    const long = all.filter((v) => (v.ad_days ?? 0) >= 30).length;
    return { total: all.length, active, longest, variants, long };
  }, [filtered]);

  const archive = async (v: Video) => {
    try {
      const r = await callFn("collect", { action: "store_video", video_id: v.id });
      toast(r.pending ? "Téléchargement lancé : le MP4 arrive dans quelques minutes" : "MP4 archivé", "success");
      qc.invalidateQueries({ queryKey: ["winning-ads"] });
    } catch (e) { toast((e as Error).message, "danger"); }
  };

  return (
    <div>
      <PageHeader
        title="Pubs gagnantes"
        description="Les pubs vidéo des concurrents dans la Meta Ad Library. Une pub qui tourne longtemps et qui est déclinée en plusieurs variantes est une pub rentable : recycle-la en brief organique."
        actions={<Tabs value={view} onChange={(v) => set("view", v === "cards" ? "" : v)}
          items={[{ value: "cards", label: <span className="flex items-center gap-1.5"><LayoutGrid className="h-4 w-4" /> Cartes</span> }, { value: "table", label: <span className="flex items-center gap-1.5"><Rows3 className="h-4 w-4" /> Tableau</span> }]} />}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Pubs de concurrents" value={kpi.total} icon={<Megaphone />} tint="blue" hint={`${kpi.long} diffusées depuis 30 jours ou plus`} />
        <KpiCard label="Actives aujourd'hui" value={kpi.active} icon={<Zap />} tint="green" hint={kpi.total ? `${Math.round((kpi.active / kpi.total) * 100)} % des pubs` : "—"} />
        <KpiCard label="Plus longue diffusion" value={`${kpi.longest} j`} icon={<Clock />} tint="yellow" hint="Signal le plus fort de rentabilité" />
        <KpiCard label="Variantes en moyenne" value={kpi.variants.toFixed(1)} icon={<Layers />} tint="violet" hint="Déclinaisons d'une même pub" />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <FilterChip label="Concurrent" icon={<Trophy />} value={get("competitor")} onChange={(v) => set("competitor", v)}
          options={(comps ?? []).map((c: any) => ({ value: c.id, label: c.name }))} />
        <FilterChip label="Durée min." icon={<CalendarDays />} value={get("minDays")} onChange={(v) => set("minDays", v)}
          options={[7, 14, 30, 60, 90].map((d) => ({ value: String(d), label: `${d} jours et plus` }))} />
        <FilterChip label="Pays" icon={<Globe2 />} value={get("country")} onChange={(v) => set("country", v)} searchable
          options={countries.map(([c, n]) => ({ value: c, label: `${flag(c)} ${c}`, hint: `${n}` }))} />
        <ToggleChip active={get("active") === "1"} onClick={() => set("active", get("active") === "1" ? "" : "1")} icon={<Zap />}>Actives seulement</ToggleChip>
        <ToggleChip active={grouped} onClick={() => set("group", grouped ? "0" : "")} icon={<Trophy />}>Grouper par concurrent</ToggleChip>
        <ToggleChip active={withUnattached} onClick={() => set("scope", withUnattached ? "" : "all")} icon={<Layers />}>
          {withUnattached ? "Pubs hors concurrents incluses" : "+ Hors concurrents"}
        </ToggleChip>
        <div className="ml-auto">
          <SortMenu value={sort} options={SORTS} onChange={(v) => set("sort", v === "ad_days" ? "" : v)} />
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-24"><Spinner /></div>
        : filtered.length === 0 ? (
          <Empty title="Aucune pub ne correspond" icon={<Megaphone className="h-5 w-5" />}
            action={<Button variant="secondary" onClick={() => setParams({}, { replace: true })}>Réinitialiser les filtres</Button>}>
            Les pubs sont collectées depuis la Meta Ad Library (Agents de collecte → sources « Meta Ad Library »). Seules les pubs dont la page correspond à un concurrent sont affichées par défaut.
          </Empty>
        ) : grouped ? (
          <div className="space-y-10">
            {groups.map(([cid, rows], gi) => (
              <section key={cid}>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <IconTile tint={TINTS[gi % TINTS.length]} icon={<span className="text-sm font-bold">{(compName(cid) ?? "?").charAt(0)}</span>} />
                  <div>
                    <h2 className="text-[17px] font-semibold text-foreground">{compName(cid) ?? "Hors concurrents"}</h2>
                    <p className="text-xs text-subtle-foreground">
                      {rows.length} pub{rows.length > 1 ? "s" : ""} · {rows.filter((r) => r.ad_active).length} active{rows.filter((r) => r.ad_active).length > 1 ? "s" : ""} · plus longue : {Math.max(...rows.map((r) => r.ad_days ?? 0))} j
                    </p>
                  </div>
                </div>
                {view === "table"
                  ? <AdsTable rows={rows} compName={compName} onOpen={setOpen} onRecycle={setAssign} hideCompetitor />
                  : <AdGrid rows={rows} compName={compName} onOpen={setOpen} onRecycle={setAssign} />}
              </section>
            ))}
          </div>
        ) : view === "table"
          ? <AdsTable rows={filtered} compName={compName} onOpen={setOpen} onRecycle={setAssign} />
          : <AdGrid rows={filtered} compName={compName} onOpen={setOpen} onRecycle={setAssign} />}

      <AdPlayer ad={open} competitor={open ? compName(open.competitor_id) : undefined} onClose={() => setOpen(null)}
        onRecycle={() => { setAssign(open); setOpen(null); }} onArchive={() => open && archive(open)} canArchive={profile?.role !== "controller"} />
      <AssignBriefDialog video={assign} open={!!assign} onClose={() => setAssign(null)} origin="ad" />
    </div>
  );
}

function ToggleChip({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5",
        active ? "border-[#cddcff] bg-accent-soft text-[#0040d6]" : "border-border-strong bg-white text-muted-foreground hover:border-[#d5d9e2] hover:text-foreground")}>
      {icon}{children}
    </button>
  );
}

function Flags({ list, max = 4 }: { list: string[] | null | undefined; max?: number }) {
  if (!list || list.length === 0) return <span className="text-xs text-subtle-foreground" title="L'Ad Library ne publie les pays que pour certaines pubs (UE, politiques)">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[13px]" title={list.join(", ")}>
      {list.slice(0, max).map((c) => <span key={c}>{flag(c)}</span>)}
      {list.length > max && <span className="text-xs font-medium text-subtle-foreground">+{list.length - max}</span>}
    </span>
  );
}

const PLATFORM_SHORT: Record<string, string> = { facebook: "FB", instagram: "IG", messenger: "MSG", audience_network: "AN", threads: "TH", whatsapp: "WA" };
function Platforms({ list, short }: { list: string[] | null | undefined; short?: boolean }) {
  if (!list?.length) return <span className="text-xs text-subtle-foreground">—</span>;
  if (short) return (
    <span className="flex gap-1" title={list.map((p) => PLATFORM_NAME[p] ?? p).join(", ")}>
      {list.map((p) => <span key={p} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{PLATFORM_SHORT[p] ?? p.slice(0, 2).toUpperCase()}</span>)}
    </span>
  );
  return <span className="text-xs text-subtle-foreground">{list.map((p) => PLATFORM_NAME[p] ?? p).join(" · ")}</span>;
}

function StatusPill({ active }: { active: boolean | null }) {
  return active
    ? <Badge tone="success"><span className="inline-block h-1.5 w-1.5 rounded-full bg-success" /> Active</Badge>
    : <Badge>Arrêtée</Badge>;
}

function AdGrid({ rows, compName, onOpen, onRecycle }: { rows: Video[]; compName: (id: string | null) => string | undefined; onOpen: (v: Video) => void; onRecycle: (v: Video) => void }) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {rows.map((v) => <AdCard key={v.id} v={v} competitor={compName(v.competitor_id)} onOpen={() => onOpen(v)} onRecycle={() => onRecycle(v)} />)}
    </div>
  );
}

function AdCard({ v, competitor, onOpen, onRecycle }: { v: Video; competitor?: string; onOpen: () => void; onRecycle: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  const thumb = thumbOf(v);
  const variants = variantsOf(v);
  return (
    <div className="group">
      <button type="button" onClick={onOpen} className="relative block aspect-[9/16] w-full overflow-hidden rounded-xl bg-muted text-left shadow-xs ring-1 ring-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_rgba(16,24,40,0.25)]">
        {(!thumb || !imgOk) && <ThumbPlaceholder v={v} />}
        {thumb && imgOk && <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" onError={() => setImgOk(false)} />}
        <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-1">
          <span className="tabular inline-flex h-6 items-center gap-1 rounded-full bg-[#fff6e5] px-2 text-[11px] font-bold text-[#8a5a00] shadow-xs"><Flame className="h-3 w-3" />{v.ad_days ?? "?"} j</span>
          {v.ad_active
            ? <span className="inline-flex h-6 items-center gap-1 rounded-full bg-white/95 px-2 text-[11px] font-semibold text-[#0b7a3c] shadow-xs"><span className="h-1.5 w-1.5 rounded-full bg-[#12a150]" />Active</span>
            : <span className="inline-flex h-6 items-center rounded-full bg-white/90 px-2 text-[11px] font-medium text-[#5b6478] shadow-xs">Arrêtée</span>}
        </div>
        <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 shadow-card transition-opacity group-hover:opacity-100">
          <Play className="ml-0.5 h-5 w-5 fill-current" />
        </span>
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-black/65 via-black/25 to-transparent p-2.5 pt-12">
          {variants > 1 && <MetricPill tone="dark" icon={<Layers />}>{variants} variantes</MetricPill>}
          <MetricPill tone="dark" icon={<CalendarDays />}>{dateFr(v.ad_started_at, { day: "numeric", month: "short", year: "2-digit" })}</MetricPill>
        </div>
      </button>
      <div className="mt-2.5 px-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[13px] font-semibold text-foreground">{competitor ?? "Hors concurrents"}</p>
          <Flags list={v.ad_countries} max={3} />
        </div>
        <p className="truncate text-xs text-subtle-foreground">{displayName(v)}</p>
        {v.caption && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{v.caption}</p>}
        <button type="button" onClick={onRecycle} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          <Recycle className="h-3.5 w-3.5" /> Recycler en brief organique
        </button>
      </div>
    </div>
  );
}

function AdsTable({ rows, compName, onOpen, onRecycle, hideCompetitor }: { rows: Video[]; compName: (id: string | null) => string | undefined; onOpen: (v: Video) => void; onRecycle: (v: Video) => void; hideCompetitor?: boolean }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Pub</Th>{!hideCompetitor && <Th>Concurrent</Th>}<Th num>Diffusion</Th><Th>Statut</Th><Th num>Variantes</Th><Th>Début</Th><Th>Pays</Th><Th>Plateformes</Th><Th />
        </tr>
      </thead>
      <tbody>
        {rows.map((v) => {
          const thumb = thumbOf(v);
          return (
            <tr key={v.id} className="cursor-pointer" onClick={() => onOpen(v)}>
              <Td>
                <div className="flex min-w-[200px] items-center gap-3">
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border">
                    {thumb ? <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : <ThumbPlaceholder v={v} size="sm" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{displayName(v)}</p>
                    <p className="max-w-[200px] truncate text-xs text-subtle-foreground">{v.caption || "—"}</p>
                  </div>
                </div>
              </Td>
              {!hideCompetitor && <Td className="whitespace-nowrap font-medium">{compName(v.competitor_id) ?? <span className="text-subtle-foreground">Hors concurrents</span>}</Td>}
              <Td num><span className="font-semibold text-foreground">{v.ad_days ?? "—"}</span> <span className="text-xs text-subtle-foreground">j</span></Td>
              <Td><StatusPill active={v.ad_active} /></Td>
              <Td num>{variantsOf(v)}</Td>
              <Td className="whitespace-nowrap text-[13px]">{dateFr(v.ad_started_at, { day: "numeric", month: "short", year: "2-digit" })}</Td>
              <Td><Flags list={v.ad_countries} /></Td>
              <Td className="whitespace-nowrap"><Platforms list={v.ad_platforms} short /></Td>
              <Td>
                <Button size="sm" variant="secondary" title="Recycler en brief organique" aria-label="Recycler en brief organique" onClick={(e) => { e.stopPropagation(); onRecycle(v); }}><Recycle className="h-3.5 w-3.5" /></Button>
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

/** Lecteur : vidéo (MP4 archivé, sinon URL de l'Ad Library) et fiche de la pub. */
function AdPlayer({ ad, competitor, onClose, onRecycle, onArchive, canArchive }: {
  ad: Video | null; competitor?: string; onClose: () => void; onRecycle: () => void; onArchive: () => void; canArchive: boolean;
}) {
  const { data: src, isLoading } = useQuery({ queryKey: ["ad-src", ad?.id, ad?.video_path], queryFn: () => playableUrl(ad!), enabled: !!ad });
  const [failed, setFailed] = useState(false);
  if (!ad) return null;
  const thumb = thumbOf(ad);
  const rows: [string, React.ReactNode][] = [
    ["Concurrent", competitor ?? "Hors concurrents"],
    ["Page", displayName(ad)],
    ["Diffusion", <span className="font-semibold">{ad.ad_days ?? "?"} jours</span>],
    ["Statut", <StatusPill active={ad.ad_active} />],
    ["Début", dateFr(ad.ad_started_at)],
    ["Fin", ad.ad_active ? "En cours" : dateFr(ad.ad_ended_at)],
    ["Variantes", variantsOf(ad)],
    ["Pays ciblés", <Flags list={ad.ad_countries} max={12} />],
    ["Plateformes", <Platforms list={ad.ad_platforms} />],
  ];
  return (
    <Dialog open onClose={() => { setFailed(false); onClose(); }} title={`${competitor ?? "Pub"} · ${ad.ad_days ?? "?"} jours de diffusion`} wide>
      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-black">
          {isLoading ? <div className="flex h-full items-center justify-center"><Spinner className="text-white" /></div>
            : src && !failed ? <video key={src} src={src} poster={thumb ?? undefined} controls autoPlay playsInline className="h-full w-full object-contain" onError={() => setFailed(true)} />
            : (
              <div className="relative h-full w-full">
                {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover opacity-80" /> : <ThumbPlaceholder v={ad} />}
                <div className="absolute inset-x-3 bottom-3 rounded-lg bg-white/95 p-3 text-xs text-muted-foreground shadow-xs">
                  Le lien vidéo de l'Ad Library a expiré. {canArchive ? "Archive le MP4 pour le garder, ou ouvre la pub dans l'Ad Library." : "Ouvre la pub dans l'Ad Library."}
                </div>
              </div>
            )}
        </div>
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button onClick={onRecycle}><Recycle className="h-4 w-4" /> Recycler en brief organique</Button>
            {ad.url && <a href={ad.url} target="_blank" rel="noreferrer"><Button variant="secondary"><ExternalLink className="h-4 w-4" /> Ad Library</Button></a>}
            {canArchive && !ad.video_path && <Button variant="secondary" onClick={onArchive}><Archive className="h-4 w-4" /> Archiver le MP4</Button>}
          </div>
          <Card className="p-0">
            <dl className="divide-y divide-separator">
              {rows.map(([k, val]) => (
                <div key={k} className="grid grid-cols-[130px_1fr] items-center gap-3 px-5 py-3 text-[13px]">
                  <dt className="text-subtle-foreground">{k}</dt>
                  <dd className="min-w-0 text-foreground">{val}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {ad.caption && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Texte de la pub</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{ad.caption}</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

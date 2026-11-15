import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight, Download, FileDown, Film, Globe2, Heart, Languages, LayoutGrid, Layers, Rows3, Search, SlidersHorizontal, Tag, Target, Trophy, X, Hash } from "lucide-react";
import { Button, Dialog, Empty, Field, Input, PageHeader, Select, Spinner, Tabs, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useApps, useCategories, useCompetitors, useCountries } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { PlatformIcon, VideoCard } from "./library/VideoCard";
import { FilterChip, Popover, SortMenu } from "./library/FilterChip";
import { VideoDrawer } from "./library/VideoDrawer";
import { VideoPlayer } from "./library/VideoPlayer";
import { VideoTable } from "./library/VideoTable";
import { AssignBriefDialog } from "./library/AssignBriefDialog";
import { exportCsv } from "./library/csv";
import { cursorValue, SORT_LABEL, type Sort, type Video } from "./library/types";

const PAGE = 48;
const PERIODS: Record<string, number | null> = { all: null, "7": 7, "30": 30, "90": 90, "365": 365 };
const ORGANIC_SORTS: Sort[] = ["relevance", "score", "views", "likes", "shares", "engagement", "outlier", "velocity", "date", "recent"];
const AD_SORTS: Sort[] = ["ad_days", "relevance", "score", "date", "recent"];

export default function Library({ adsOnly = false }: { adsOnly?: boolean }) {
  const [params, setParams] = useSearchParams();
  const get = (k: string, d = "") => params.get(k) ?? d;
  const set = (k: string, val: string, resetPage = true) => {
    const p = new URLSearchParams(params);
    if (val) p.set(k, val); else p.delete(k);
    if (resetPage && k !== "page") p.delete("page");
    setParams(p, { replace: true });
  };
  const { profile } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const { data: apps } = useApps();
  const { data: comps } = useCompetitors(get("app") || null);
  const { data: cats } = useCategories();
  const { data: countries } = useCountries();
  const [q, setQ] = useState(get("q"));
  const [author, setAuthor] = useState(get("author"));
  const [open, setOpen] = useState<Video | null>(null); // fiche détaillée (drawer)
  // Lecteur : la liste affichée (grille, tableau ou groupe) + position, pour ← →.
  const [player, setPlayer] = useState<{ list: Video[]; index: number } | null>(null);
  const play = (list: Video[], v: Video) => setPlayer({ list, index: Math.max(0, list.findIndex((x) => x.id === v.id)) });
  const [assign, setAssign] = useState<Video | null>(null);
  const [adhoc, setAdhoc] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Par défaut : vues ÷ abonnés (ce qui perce), pas le score (retour du 15/11).
  const sort = get("sort", adsOnly ? "ad_days" : "outlier") as Sort;
  const asc = get("dir") === "asc";
  const view = get("view", "grid") as "grid" | "table";
  const grouped = view === "grid" && get("group") === "1";
  const pageSize = Number(get("size", "50"));
  const page = Number(get("page", "1"));

  useEffect(() => { const t = setTimeout(() => q !== get("q") && set("q", q), 350); return () => clearTimeout(t); }, [q]);
  useEffect(() => { const t = setTimeout(() => author !== get("author") && set("author", author.replace(/^@/, "").trim()), 450); return () => clearTimeout(t); }, [author]);
  useEffect(() => { setQ(get("q")); setAuthor(get("author")); }, [params.get("q"), params.get("author")]);

  const { data: collections } = useQuery({ queryKey: ["collections-list"], queryFn: async () => (await supabase.from("collections").select("id, name").order("name")).data ?? [] });
  const { data: favs } = useQuery({
    queryKey: ["favorites", profile?.id],
    queryFn: async () => new Set(((await supabase.from("favorites").select("video_id").eq("user_id", profile!.id)).data ?? []).map((f) => f.video_id)),
    enabled: !!profile,
  });

  // App de référence pour la pertinence (badge, tri) : l'app filtrée, sinon la première app active (Micabo).
  const relApp = useMemo(() => {
    const list = (apps ?? []) as any[];
    const a = list.find((x) => x.id === get("app")) ?? list.find((x) => x.active !== false) ?? null;
    return a ? { id: a.id as string, name: a.name as string } : null;
  }, [apps, params]);
  const catList = useMemo(() => ((cats ?? []) as any[]).map((c) => ({ id: c.id, name: c.name, color: c.color })), [cats]);
  const { data: allTags } = useQuery({
    queryKey: ["video-tags"],
    queryFn: async () => {
      const { data } = await supabase.from("videos").select("tags").neq("tags", "{}").limit(5000);
      const m = new Map<string, number>();
      for (const r of data ?? []) for (const t of (r as any).tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    },
  });

  // Filtres communs à la grille, au tableau, aux groupes et à l'export.
  const filters = useMemo(() => {
    const days = PERIODS[get("period", "all")];
    return {
      p_app: get("app") || null, p_competitor: get("competitor") || null, p_platform: get("platform") || null,
      p_language: get("lang") || null, p_country: get("country") || null,
      p_category: get("category") && get("category") !== "none" ? get("category") : null,
      p_uncategorized: get("category") === "none",
      p_tag: get("tag") || null, p_compat_app: get("compat") || null, p_rel_app: relApp?.id ?? null,
      p_since: days ? new Date(Date.now() - days * 86_400_000).toISOString() : null,
      p_min_views: get("minViews") ? Number(get("minViews")) : null, p_min_score: get("minScore") ? Number(get("minScore")) : null,
      p_favorites: get("fav") === "1", p_ads: adsOnly ? "ads" : get("ads", "all"),
      p_min_ad_days: adsOnly ? Number(get("minDays", "14")) : null,
      p_query: get("q") || null, p_sort: sort, p_collection: get("collection") || null,
      p_origin: get("origin") || null, p_author: get("author") || null,
      // Par défaut, seulement les vidéos rattachées à un concurrent ; la puce « Hors concurrents » les ajoute.
      p_with_competitor: !adsOnly && get("scope", "competitors") === "competitors",
    };
  }, [params, adsOnly, relApp?.id]);
  const countFilters = useMemo(() => {
    const { p_favorites: _f, p_sort: _s, p_collection: _c, p_rel_app: _r, ...rest } = filters;
    return rest;
  }, [filters]);

  // Grille : scroll infini (curseur, tri décroissant).
  const infinite = useInfiniteQuery({
    queryKey: ["explore", "grid", filters],
    enabled: view === "grid" && !grouped,
    initialPageParam: null as null | { v: number; id: string },
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("explore_videos", { ...filters, p_cursor_value: pageParam?.v ?? null, p_cursor_id: pageParam?.id ?? null, p_limit: PAGE });
      if (error) throw error;
      return (data ?? []) as Video[];
    },
    getNextPageParam: (last) => (last.length < PAGE ? undefined : { v: cursorValue(last[last.length - 1], sort, relApp?.id), id: last[last.length - 1].id }),
  });
  const gridVideos = infinite.data?.pages.flat() ?? [];

  // Tableau : pagination par page (offset) + total.
  const table = useQuery({
    queryKey: ["explore", "table", filters, asc, page, pageSize],
    enabled: view === "table",
    queryFn: async () => {
      const { data, error } = await supabase.rpc("explore_videos", { ...filters, p_asc: asc, p_offset: (page - 1) * pageSize, p_limit: pageSize });
      if (error) throw error;
      return (data ?? []) as Video[];
    },
  });
  const total = useQuery({
    queryKey: ["explore", "count", countFilters],
    enabled: view === "table",
    queryFn: async () => Number((await supabase.rpc("explore_count", countFilters)).data ?? 0),
  });
  const pages = Math.max(1, Math.ceil((total.data ?? 0) / pageSize));

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || view !== "grid" || grouped) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && infinite.hasNextPage && !infinite.isFetchingNextPage) infinite.fetchNextPage(); }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [infinite.hasNextPage, infinite.isFetchingNextPage, gridVideos.length, view, grouped]);

  const toggleFav = async (v: Video) => {
    if (!profile) return;
    if (favs?.has(v.id)) await supabase.from("favorites").delete().eq("user_id", profile.id).eq("video_id", v.id);
    else {
      await supabase.from("favorites").insert({ user_id: profile.id, video_id: v.id });
      if (!v.video_path) callFn("collect", { action: "store_video", video_id: v.id }).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: ["favorites"] });
  };
  const catName = (id: string | null) => (cats ?? []).find((c: any) => c.id === id)?.name;
  const compName = (id: string | null) => (comps ?? []).find((c: any) => c.id === id)?.name ?? "—";
  const languages = ["en", "fr", "es", "de", "it", "pt", "nl", "pl", "ro", "cs", "sk", "hu", "el", "bg", "hr", "sl", "sr", "uk", "tr", "ar", "he", "ja", "ko", "sv", "no", "da", "fi", "et", "lv", "lt"];
  const onSortColumn = (s: Sort) => {
    const p = new URLSearchParams(params);
    if (sort === s) p.set("dir", asc ? "desc" : "asc"); else { p.set("sort", s); p.delete("dir"); }
    p.delete("page");
    setParams(p, { replace: true });
  };
  const doExport = async () => {
    setExporting(true);
    try {
      const n = await exportCsv({ ...filters, p_asc: asc }, { competitor: compName, category: (id) => catName(id) ?? "" });
      toast(`${n} ligne(s) exportée(s)`, "success");
    } catch (e) { toast((e as Error).message, "danger"); } finally { setExporting(false); }
  };
  const anyFilter = [...params.keys()].some((k) => !["sort", "dir", "view", "group", "size", "page"].includes(k));

  const LANG_NAMES: Record<string, string> = { en: "Anglais", fr: "Français", es: "Espagnol", de: "Allemand", it: "Italien", pt: "Portugais", nl: "Néerlandais", pl: "Polonais", ro: "Roumain", cs: "Tchèque", sk: "Slovaque", hu: "Hongrois", el: "Grec", bg: "Bulgare", hr: "Croate", sl: "Slovène", sr: "Serbe", uk: "Ukrainien", tr: "Turc", ar: "Arabe", he: "Hébreu", ja: "Japonais", ko: "Coréen", sv: "Suédois", no: "Norvégien", da: "Danois", fi: "Finnois", et: "Estonien", lv: "Letton", lt: "Lituanien" };
  const moreActive = ["minViews", "minScore", "collection", "app", "ads"].filter((k) => get(k)).length + (adsOnly && get("minDays") ? 1 : 0);
  const resetAll = () => { setQ(""); setAuthor(""); const p = new URLSearchParams(); ["view", "sort"].forEach((k) => params.get(k) && p.set(k, params.get(k)!)); setParams(p, { replace: true }); };
  const setSort = (v: Sort) => { const p = new URLSearchParams(params); p.set("sort", v); p.delete("dir"); p.delete("page"); setParams(p, { replace: true }); };
  const shown = view === "table" ? (total.data ?? 0) : gridVideos.length;

  return (
    <div>
      <PageHeader
        title={adsOnly ? "Pubs gagnantes" : "Bibliothèque"}
        description={adsOnly
          ? "Les pubs vidéo des concurrents qui tournent depuis longtemps : une pub qui dure est une pub rentable. Recycle-les en brief organique."
          : "Toutes les vidéos de référence : comptes officiels, UGC qui cite une marque et pubs Meta. ▶ lit la vidéo dans la carte, un clic ailleurs l'agrandit avec le détail."}
        actions={<>
          {!adsOnly && <AiBudget />}
          <Tabs value={view} onChange={(v) => set("view", v === "grid" ? "" : v, false)}
            items={[{ value: "grid", label: <span className="inline-flex items-center gap-1.5"><LayoutGrid className="h-4 w-4" /> Grille</span> }, { value: "table", label: <span className="inline-flex items-center gap-1.5"><Rows3 className="h-4 w-4" /> Tableau</span> }]} />
          <Button variant="secondary" onClick={doExport} loading={exporting}><FileDown className="h-4 w-4" /> Export CSV</Button>
          {profile?.role === "admin" && !adsOnly && <Button onClick={() => setAdhoc(true)}><Download className="h-4 w-4" /> Collecter</Button>}
        </>}
      />

      {/* Barre de recherche + filtres en puces */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
            <input className="h-10 w-full rounded-xl border border-border-strong bg-white pl-10 pr-9 text-sm outline-none transition placeholder:text-subtle-foreground hover:border-[#d5d9e2] focus:border-accent focus:ring-4 focus:ring-accent/10"
              placeholder="Rechercher une légende, un #hashtag, un @créateur…" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-subtle-foreground hover:bg-muted" aria-label="Effacer"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <div className="relative w-48">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-subtle-foreground">@</span>
            <input className="h-10 w-full rounded-xl border border-border-strong bg-white pl-8 pr-3 text-sm outline-none transition placeholder:text-subtle-foreground hover:border-[#d5d9e2] focus:border-accent focus:ring-4 focus:ring-accent/10"
              placeholder="créateur" value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip label="Concurrent" icon={<Trophy />} value={get("competitor")} onChange={(v) => set("competitor", v)}
            options={(comps ?? []).map((c: any) => ({ value: c.id, label: c.name }))} />
          {!adsOnly && <FilterChip label="Plateforme" icon={<Film />} value={get("platform")} onChange={(v) => set("platform", v)}
            options={(["tiktok", "instagram", "facebook_ads"] as const).map((p) => ({ value: p, label: p === "facebook_ads" ? "Meta Ads" : p === "tiktok" ? "TikTok" : "Instagram", icon: <PlatformIcon p={p} /> }))} />}
          {!adsOnly && <FilterChip label="Origine" icon={<Layers />} value={get("origin")} onChange={(v) => set("origin", v)}
            options={[{ value: "ugc", label: "UGC", hint: "créateurs qui citent la marque" }, { value: "official", label: "Officiel", hint: "comptes des marques" }, { value: "ad", label: "Pub" }, { value: "other", label: "Autre" }]} />}
          <FilterChip label="Langue" icon={<Languages />} value={get("lang")} onChange={(v) => set("lang", v)}
            options={languages.map((l) => ({ value: l, label: LANG_NAMES[l] ?? l, hint: l }))} />
          <FilterChip label="Pays" icon={<Globe2 />} value={get("country")} onChange={(v) => set("country", v)}
            options={(countries ?? []).map((c: any) => ({ value: c.code, label: `${c.name}`, hint: c.code }))} />
          <FilterChip label="Format" icon={<Tag />} value={get("category")} onChange={(v) => set("category", v)}
            options={[...(cats ?? []).map((c: any) => ({ value: c.id, label: c.name })), { value: "none", label: "Non classé", hint: "à corriger" }]} />
          <FilterChip label="Compatible" icon={<Target />} value={get("compat")} onChange={(v) => set("compat", v)}
            options={(apps ?? []).map((a: any) => ({ value: a.id, label: `Compatible ${a.name}`, hint: "score IA ou correction" }))} />
          {(allTags?.length ?? 0) > 0 && <FilterChip label="Tag" icon={<Hash />} value={get("tag")} onChange={(v) => set("tag", v)}
            options={(allTags ?? []).map(([t, n]) => ({ value: t, label: `#${t}`, hint: String(n) }))} />}
          <FilterChip label="Période" icon={<Calendar />} value={get("period")} onChange={(v) => set("period", v)}
            options={[{ value: "7", label: "7 derniers jours" }, { value: "30", label: "30 derniers jours" }, { value: "90", label: "90 derniers jours" }, { value: "365", label: "12 derniers mois" }]} />
          <button type="button" onClick={() => set("fav", get("fav") === "1" ? "" : "1")}
            className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5",
              get("fav") === "1" ? "border-[#ffd1d1] bg-tint-red text-[#c42a2d]" : "border-border-strong bg-white text-muted-foreground hover:border-[#d5d9e2] hover:text-foreground")}>
            <Heart className={cn(get("fav") === "1" && "fill-current")} /> Favoris
          </button>
          {!adsOnly && (
            <button type="button" onClick={() => set("scope", get("scope", "competitors") === "competitors" ? "all" : "")}
              title="Par défaut, seules les vidéos rattachées à un concurrent sont affichées"
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors [&_svg]:h-3.5 [&_svg]:w-3.5",
                get("scope", "competitors") === "all" ? "border-[#cddcff] bg-accent-soft text-[#0040d6]" : "border-border-strong bg-white text-muted-foreground hover:border-[#d5d9e2] hover:text-foreground")}>
              <Layers /> {get("scope", "competitors") === "all" ? "Hors concurrents inclus" : "+ Hors concurrents"}
            </button>
          )}
          <Popover width={300} trigger={(open, toggle) => (
            <button type="button" onClick={toggle} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] transition-colors",
              moreActive ? "border-[#cddcff] bg-accent-soft text-[#0040d6]" : open ? "border-[#d5d9e2] text-foreground" : "border-border-strong bg-white text-muted-foreground hover:text-foreground")}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Plus de filtres{moreActive ? ` · ${moreActive}` : ""}
            </button>
          )}>
            {() => (
              <div className="space-y-3 p-2">
                {!adsOnly && <Field label="Vues minimum"><Input type="number" placeholder="ex. 100 000" value={get("minViews")} onChange={(e) => set("minViews", e.target.value)} /></Field>}
                <Field label="Score minimum (0–100)"><Input type="number" placeholder="ex. 60" value={get("minScore")} onChange={(e) => set("minScore", e.target.value)} /></Field>
                {adsOnly && <Field label="Diffusée depuis au moins (jours)"><Input type="number" value={get("minDays", "14")} onChange={(e) => set("minDays", e.target.value)} /></Field>}
                {!adsOnly && <Field label="Type"><Select value={get("ads", "all")} onChange={(e) => set("ads", e.target.value === "all" ? "" : e.target.value)}><option value="all">Organique + pubs</option><option value="organic">Organique seulement</option><option value="ads">Pubs seulement</option></Select></Field>}
                <Field label="Collection"><Select value={get("collection")} onChange={(e) => set("collection", e.target.value)}><option value="">Toutes</option>{(collections ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
                <Field label="App"><Select value={get("app")} onChange={(e) => set("app", e.target.value)}><option value="">Toutes les apps</option>{(apps ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
              </div>
            )}
          </Popover>
          {anyFilter && <button className="ml-1 text-[13px] font-medium text-accent hover:underline" onClick={resetAll}>Tout effacer</button>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-separator pt-4">
          <p className="text-[13px] text-subtle-foreground">
            {view === "table"
              ? <><span className="tabular font-medium text-foreground">{new Intl.NumberFormat("fr").format(total.data ?? 0)}{(total.data ?? 0) >= 100000 ? "+" : ""}</span> {adsOnly ? "pubs" : "vidéos"}</>
              : grouped ? "Regroupées par concurrent · 12 meilleures par groupe" : <><span className="tabular font-medium text-foreground">{shown}</span> {adsOnly ? "pubs affichées" : "vidéos affichées"}{infinite.hasNextPage ? " · défile pour en charger plus" : ""}</>}
          </p>
          <div className="flex items-center gap-1">
            {view === "grid" && !adsOnly && (
              <button type="button" onClick={() => set("group", grouped ? "" : "1", false)}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px]", grouped ? "bg-accent-soft font-medium text-[#0040d6]" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <Trophy className="h-3.5 w-3.5" /> Grouper par concurrent
              </button>
            )}
            <SortMenu value={sort} onChange={setSort} options={(adsOnly ? AD_SORTS : ORGANIC_SORTS).map((x) => ({ value: x, label: x === "relevance" ? `Pertinence ${relApp?.name ?? "app"}` : SORT_LABEL[x] }))}
              asc={view === "table" ? asc : undefined} onToggleDir={view === "table" ? () => set("dir", asc ? "" : "asc") : undefined} />
          </div>
        </div>
      </div>

      {view === "table" ? (
        table.isLoading ? <div className="flex justify-center py-24"><Spinner /></div>
          : table.error ? <Empty title="Erreur de chargement">{(table.error as Error).message}</Empty>
          : (table.data ?? []).length === 0 ? <EmptyLibrary adsOnly={adsOnly} filtered={anyFilter} onReset={resetAll} />
          : (
            <VideoTable rows={table.data!} sort={sort} asc={asc} onSort={onSortColumn} onOpen={(v) => play(table.data!, v)} competitorName={compName} categoryName={catName} adsOnly={adsOnly}
              footer={<>
                <span className="tabular text-[13px] text-muted-foreground">
                  {new Intl.NumberFormat("fr").format((page - 1) * pageSize + 1)}–{new Intl.NumberFormat("fr").format(Math.min(page * pageSize, total.data ?? 0))} sur {new Intl.NumberFormat("fr").format(total.data ?? 0)}
                </span>
                <div className="flex items-center gap-2">
                  <select className="h-8 rounded-lg border border-border-strong bg-white px-2 text-[13px] text-muted-foreground outline-none" value={String(pageSize)} onChange={(e) => set("size", e.target.value)}>
                    {[50, 100, 200].map((n) => <option key={n} value={n}>{n} par page</option>)}
                  </select>
                  <span className="tabular px-1 text-[13px] text-muted-foreground">Page {page} / {pages}</span>
                  <Button size="icon" variant="secondary" className="h-8 w-8" disabled={page <= 1} onClick={() => set("page", String(page - 1), false)} aria-label="Page précédente"><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8" disabled={page >= pages} onClick={() => set("page", String(page + 1), false)} aria-label="Page suivante"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </>} />
          )
      ) : grouped ? (
        <div className="space-y-12">
          {[...(comps ?? []), { id: null, name: "Hors concurrents" }].map((c: any) => (
            <GroupSection key={c.id ?? "none"} competitor={c} filters={filters} favs={favs} onOpen={play} onFav={toggleFav} catName={catName} cats={catList} relApp={relApp} />
          ))}
        </div>
      ) : infinite.isLoading ? <div className="flex justify-center py-24"><Spinner /></div>
        : infinite.error ? <Empty title="Erreur de chargement">{(infinite.error as Error).message}</Empty>
        : gridVideos.length === 0 ? <EmptyLibrary adsOnly={adsOnly} filtered={anyFilter} onReset={resetAll} />
        : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {gridVideos.map((v) => <VideoCard key={v.id} v={v} fav={!!favs?.has(v.id)} onOpen={() => play(gridVideos, v)} onFav={() => toggleFav(v)} categoryName={catName(v.category_id)} competitorName={v.competitor_id ? compName(v.competitor_id) : undefined} cats={catList} relApp={relApp} />)}
          </div>
        )}
      {view === "grid" && !grouped && <div ref={sentinel} className="flex justify-center py-10">{infinite.isFetchingNextPage && <Spinner />}</div>}

      <VideoPlayer list={player?.list ?? []} index={player?.index ?? null} onIndex={(i) => setPlayer((p) => (i === null || !p ? null : { ...p, index: i }))}
        fav={(v) => !!favs?.has(v.id)} onFav={toggleFav} onAssign={(v) => { setPlayer(null); setAssign(v); }} onDetails={(v) => { setPlayer(null); setOpen(v); }}
        competitorName={(id) => (id ? compName(id) : undefined)} apps={(apps ?? []) as any[]} cats={catList} />
      <VideoDrawer video={open} onClose={() => setOpen(null)} fav={!!(open && favs?.has(open.id))} onFav={() => open && toggleFav(open)} onAssign={() => setAssign(open)} />
      <AssignBriefDialog video={assign} open={!!assign} onClose={() => setAssign(null)} origin={assign?.is_ad ? "ad" : "library"} />
      <AdhocDialog open={adhoc} onClose={() => setAdhoc(false)} onDone={() => toast("Run lancé : les vidéos arrivent dans quelques minutes (Agents de collecte)", "success")} />
    </div>
  );
}

function EmptyLibrary({ adsOnly, filtered, onReset }: { adsOnly: boolean; filtered: boolean; onReset: () => void }) {
  if (filtered) return <Empty title="Aucun résultat pour ces filtres" icon={<Search className="h-5 w-5" />} action={<Button variant="secondary" onClick={onReset}>Effacer les filtres</Button>}>Élargis la période ou retire un filtre.</Empty>;
  return (
    <Empty title={adsOnly ? "Aucune pub qui tourne depuis assez longtemps" : "La bibliothèque est vide"} icon={<Film className="h-5 w-5" />}>
      {adsOnly
        ? "Baisse la durée minimale de diffusion, ou lance un agent « Meta Ad Library » dans Agents de collecte."
        : <>Lance un agent ou un backfill dans <Link to="/admin/agents" className="underline">Agents de collecte</Link>, ou utilise « Collecter à la demande ».</>}
    </Empty>
  );
}

function GroupSection({ competitor, filters, favs, onOpen, onFav, catName, cats, relApp }: {
  cats?: { id: string; name: string }[]; relApp?: { id: string; name: string } | null;
  competitor: { id: string | null; name: string }; filters: Record<string, unknown>; favs?: Set<string>;
  onOpen: (list: Video[], v: Video) => void; onFav: (v: Video) => void; catName: (id: string | null) => string | undefined;
}) {
  const [, setParams] = useSearchParams();
  const { data, isLoading } = useQuery({
    queryKey: ["explore", "group", competitor.id, filters],
    queryFn: async () => {
      if (competitor.id === null) {
        // « Sans concurrent » : on prend plus large puis on filtre côté client.
        const { data } = await supabase.rpc("explore_videos", { ...filters, p_competitor: null, p_limit: 120 });
        return ((data ?? []) as Video[]).filter((v) => !v.competitor_id).slice(0, 12);
      }
      const { data } = await supabase.rpc("explore_videos", { ...filters, p_competitor: competitor.id, p_limit: 12 });
      return (data ?? []) as Video[];
    },
  });
  if (isLoading) return null;
  if (!data?.length) return null;
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-tint-blue text-sm font-semibold text-accent">{competitor.name.charAt(0)}</span>
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{competitor.name}</h2>
            <p className="text-xs text-subtle-foreground">{data.length} meilleures vidéos</p>
          </div>
        </div>
        {competitor.id && <button className="text-[13px] font-medium text-accent hover:underline" onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.delete("group"); n.set("competitor", competitor.id!); return n; }, { replace: true })}>Tout voir →</button>}
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {data.map((v) => <VideoCard key={v.id} v={v} fav={!!favs?.has(v.id)} onOpen={() => onOpen(data, v)} onFav={() => onFav(v)} categoryName={catName(v.category_id)} competitorName={competitor.id ? competitor.name : undefined} cats={cats} relApp={relApp} />)}
      </div>
    </section>
  );
}

function AdhocDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { data: apps } = useApps();
  const { data: comps } = useCompetitors();
  const [platform, setPlatform] = useState("tiktok");
  const [kind, setKind] = useState("keyword");
  const [value, setValue] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [max, setMax] = useState(30);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await callFn("collect", { action: "run_adhoc", platform, kind, value, max_results: max, app_id: apps?.[0]?.id ?? null, competitor_id: competitor || null });
      onDone();
      onClose();
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(false); }
  };
  const unit = platform === "tiktok" ? 0.0037 : platform === "instagram" ? 0.0027 : 0.0058;
  return (
    <Dialog open={open} onClose={onClose} title="Collecter à la demande" footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={go} loading={busy} disabled={!value.trim()}>Lancer</Button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plateforme"><Select value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook_ads">Meta Ad Library</option></Select></Field>
          <Field label="Type"><Select value={kind} onChange={(e) => setKind(e.target.value)}><option value="keyword">Mot-clé</option><option value="hashtag">Hashtag</option><option value="account">Compte</option>{platform === "facebook_ads" && <option value="page">Page (id ou nom)</option>}</Select></Field>
        </div>
        <Field label="Valeur" hint="ex. « app pour réviser », #studytok, @knowunity.fr, 102545774445089"><Input value={value} onChange={(e) => setValue(e.target.value)} autoFocus /></Field>
        <Field label="Concurrent (optionnel)" hint="Rattache les vidéos sans marque reconnue à ce concurrent."><Select value={competitor} onChange={(e) => setCompetitor(e.target.value)}><option value="">— détection automatique —</option>{(comps ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Nombre max. de vidéos" hint={`Coût estimé ≈ ${(unit * max).toFixed(2)} $ (plafonds dans Réglages → Intégrations)`}><Input type="number" min={1} max={200} value={max} onChange={(e) => setMax(Number(e.target.value))} /></Field>
      </div>
    </Dialog>
  );
}

/** Budget IA (classement des vidéos par fal) : dépense du mois / plafond, vidéos en attente. */
function AiBudget() {
  const { data } = useQuery({
    queryKey: ["ai-budget"],
    queryFn: async () => {
      const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
      const [usage, cfg, pending] = await Promise.all([
        supabase.from("ai_usage").select("cost_usd").gte("created_at", start.toISOString()),
        supabase.from("settings").select("value").eq("key", "ai").maybeSingle(),
        supabase.from("videos").select("id", { count: "exact", head: true }).is("ai_scored_at", null),
      ]);
      const spent = (usage.data ?? []).reduce((a, r: any) => a + Number(r.cost_usd), 0);
      return { spent, cap: Number((cfg.data?.value as any)?.monthly_cap_usd ?? 5), pending: pending.count ?? 0 };
    },
    staleTime: 60_000,
  });
  if (!data) return null;
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-border-strong bg-white px-3 py-1.5 text-[12px] text-muted-foreground md:inline-flex"
      title="Catégorie et pertinence par app calculées par l'IA (fal, Gemini flash). Plafond mensuel : settings.ai.monthly_cap_usd.">
      <Target className="h-3.5 w-3.5 text-accent" /> IA : <span className="tabular font-medium text-foreground">{data.spent.toFixed(2)} $</span> / {data.cap} $ ce mois{data.pending ? ` · ${data.pending} en attente` : ""}
    </span>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Download, FileDown, LayoutGrid, Rows3, Search, SlidersHorizontal } from "lucide-react";
import { Button, Dialog, Empty, Field, Input, PageHeader, Select, Spinner, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useApps, useCategories, useCompetitors, useCountries } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { VideoCard } from "./library/VideoCard";
import { VideoDrawer } from "./library/VideoDrawer";
import { VideoTable } from "./library/VideoTable";
import { AssignBriefDialog } from "./library/AssignBriefDialog";
import { exportCsv } from "./library/csv";
import { cursorValue, SORT_LABEL, type Sort, type Video } from "./library/types";

const PAGE = 48;
const PERIODS: Record<string, number | null> = { all: null, "7": 7, "30": 30, "90": 90, "365": 365 };
const ORGANIC_SORTS: Sort[] = ["score", "views", "likes", "shares", "engagement", "outlier", "velocity", "date", "recent"];
const AD_SORTS: Sort[] = ["ad_days", "score", "date", "recent"];

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
  const [open, setOpen] = useState<Video | null>(null);
  const [assign, setAssign] = useState<Video | null>(null);
  const [adhoc, setAdhoc] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sort = get("sort", adsOnly ? "ad_days" : "score") as Sort;
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

  // Filtres communs à la grille, au tableau, aux groupes et à l'export.
  const filters = useMemo(() => {
    const days = PERIODS[get("period", "all")];
    return {
      p_app: get("app") || null, p_competitor: get("competitor") || null, p_platform: get("platform") || null,
      p_language: get("lang") || null, p_country: get("country") || null, p_category: get("category") || null,
      p_since: days ? new Date(Date.now() - days * 86_400_000).toISOString() : null,
      p_min_views: get("minViews") ? Number(get("minViews")) : null, p_min_score: get("minScore") ? Number(get("minScore")) : null,
      p_favorites: get("fav") === "1", p_ads: adsOnly ? "ads" : get("ads", "all"),
      p_min_ad_days: adsOnly ? Number(get("minDays", "14")) : null,
      p_query: get("q") || null, p_sort: sort, p_collection: get("collection") || null,
      p_origin: get("origin") || null, p_author: get("author") || null,
    };
  }, [params, adsOnly]);
  const countFilters = useMemo(() => {
    const { p_favorites: _f, p_sort: _s, p_collection: _c, ...rest } = filters;
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
    getNextPageParam: (last) => (last.length < PAGE ? undefined : { v: cursorValue(last[last.length - 1], sort), id: last[last.length - 1].id }),
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

  return (
    <div>
      <PageHeader
        title={adsOnly ? "Pubs gagnantes" : "Bibliothèque"}
        description={adsOnly
          ? "Pubs vidéo des concurrents qui tournent depuis longtemps (une pub qui dure est une pub rentable). Recycle-les en brief organique."
          : "Vidéos et pubs collectées par les agents : comptes officiels, UGC qui cite la marque et Ad Library. Survole une carte pour la lire, clique pour le détail."}
        actions={<>
          <div className="inline-flex rounded-md border p-0.5">
            <button onClick={() => set("view", "", false)} className={cn("flex items-center gap-1.5 rounded px-2.5 py-1 text-sm", view === "grid" ? "bg-muted font-medium" : "text-muted-foreground")}><LayoutGrid className="h-4 w-4" /> Grille</button>
            <button onClick={() => set("view", "table", false)} className={cn("flex items-center gap-1.5 rounded px-2.5 py-1 text-sm", view === "table" ? "bg-muted font-medium" : "text-muted-foreground")}><Rows3 className="h-4 w-4" /> Tableau</button>
          </div>
          <Button variant="outline" onClick={doExport} loading={exporting}><FileDown className="h-4 w-4" /> Export CSV</Button>
          {profile?.role === "admin" && !adsOnly && <Button variant="outline" onClick={() => setAdhoc(true)}><Download className="h-4 w-4" /> Collecter à la demande</Button>}
        </>}
      />

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher légende, #hashtag, @auteur…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select className="w-56" value={sort} onChange={(e) => { const p = new URLSearchParams(params); p.set("sort", e.target.value); p.delete("dir"); p.delete("page"); setParams(p, { replace: true }); }}>
            {(adsOnly ? AD_SORTS : ORGANIC_SORTS).map((s) => <option key={s} value={s}>Trier : {SORT_LABEL[s]}</option>)}
          </Select>
          {view === "grid" && !adsOnly && (
            <label className="flex items-center gap-2 rounded-md border px-3 text-sm"><input type="checkbox" checked={grouped} onChange={(e) => set("group", e.target.checked ? "1" : "", false)} /> Grouper par concurrent</label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select className="h-8 w-36 text-xs" value={get("app")} onChange={(e) => set("app", e.target.value)}><option value="">Toutes les apps</option>{(apps ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          <Select className="h-8 w-40 text-xs" value={get("competitor")} onChange={(e) => set("competitor", e.target.value)}><option value="">Tous les concurrents</option>{(comps ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          {!adsOnly && <Select className="h-8 w-32 text-xs" value={get("origin")} onChange={(e) => set("origin", e.target.value)}><option value="">Toutes origines</option><option value="official">Officiel</option><option value="ugc">UGC</option><option value="ad">Pub</option><option value="other">Autre</option></Select>}
          {!adsOnly && <Select className="h-8 w-32 text-xs" value={get("platform")} onChange={(e) => set("platform", e.target.value)}><option value="">Plateformes</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook_ads">Meta Ads</option></Select>}
          <Input className="h-8 w-36 text-xs" placeholder="@créateur" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <Select className="h-8 w-28 text-xs" value={get("lang")} onChange={(e) => set("lang", e.target.value)}><option value="">Langues</option>{languages.map((l) => <option key={l} value={l}>{l}</option>)}</Select>
          <Select className="h-8 w-32 text-xs" value={get("country")} onChange={(e) => set("country", e.target.value)}><option value="">Pays</option>{(countries ?? []).map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select>
          <Select className="h-8 w-36 text-xs" value={get("category")} onChange={(e) => set("category", e.target.value)}><option value="">Formats</option>{(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select className="h-8 w-32 text-xs" value={get("period", "all")} onChange={(e) => set("period", e.target.value === "all" ? "" : e.target.value)}>
            <option value="all">Toute période</option><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option><option value="365">1 an</option>
          </Select>
          {!adsOnly && <Input className="h-8 w-28 text-xs" type="number" placeholder="Vues min." value={get("minViews")} onChange={(e) => set("minViews", e.target.value)} />}
          <Input className="h-8 w-24 text-xs" type="number" placeholder="Score min." value={get("minScore")} onChange={(e) => set("minScore", e.target.value)} />
          {adsOnly && <Input className="h-8 w-36 text-xs" type="number" placeholder="Diffusion ≥ jours" value={get("minDays", "14")} onChange={(e) => set("minDays", e.target.value)} />}
          {!adsOnly && <Select className="h-8 w-36 text-xs" value={get("ads", "all")} onChange={(e) => set("ads", e.target.value === "all" ? "" : e.target.value)}><option value="all">Organique + pubs</option><option value="organic">Organique</option><option value="ads">Pubs</option></Select>}
          <Select className="h-8 w-36 text-xs" value={get("collection")} onChange={(e) => set("collection", e.target.value)}><option value="">Collections</option>{(collections ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={get("fav") === "1"} onChange={(e) => set("fav", e.target.checked ? "1" : "")} /> Favoris</label>
          {anyFilter && <button className="text-xs text-muted-foreground underline" onClick={() => { setQ(""); setAuthor(""); const p = new URLSearchParams(); ["view", "sort"].forEach((k) => params.get(k) && p.set(k, params.get(k)!)); setParams(p, { replace: true }); }}>Réinitialiser les filtres</button>}
        </div>
      </div>

      {view === "table" ? (
        table.isLoading ? <div className="flex justify-center py-20"><Spinner /></div>
          : table.error ? <Empty title="Erreur de chargement">{(table.error as Error).message}</Empty>
          : (table.data ?? []).length === 0 ? <EmptyLibrary adsOnly={adsOnly} filtered={anyFilter} />
          : (
            <>
              <VideoTable rows={table.data!} sort={sort} asc={asc} onSort={onSortColumn} onOpen={setOpen} competitorName={compName} categoryName={catName} adsOnly={adsOnly} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{new Intl.NumberFormat("fr").format(total.data ?? 0)}{(total.data ?? 0) >= 100000 ? "+" : ""} résultat(s) · page {page} / {pages}</span>
                <div className="flex items-center gap-2">
                  <Select className="h-8 w-28 text-xs" value={String(pageSize)} onChange={(e) => set("size", e.target.value)}>
                    {[50, 100, 200].map((n) => <option key={n} value={n}>{n} / page</option>)}
                  </Select>
                  <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => set("page", String(page - 1), false)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => set("page", String(page + 1), false)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )
      ) : grouped ? (
        <div className="space-y-10">
          {[...(comps ?? []), { id: null, name: "Sans concurrent" }].map((c: any) => (
            <GroupSection key={c.id ?? "none"} competitor={c} filters={filters} favs={favs} onOpen={setOpen} onFav={toggleFav} catName={catName} />
          ))}
        </div>
      ) : infinite.isLoading ? <div className="flex justify-center py-20"><Spinner /></div>
        : infinite.error ? <Empty title="Erreur de chargement">{(infinite.error as Error).message}</Empty>
        : gridVideos.length === 0 ? <EmptyLibrary adsOnly={adsOnly} filtered={anyFilter} />
        : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {gridVideos.map((v) => <VideoCard key={v.id} v={v} fav={!!favs?.has(v.id)} onOpen={() => setOpen(v)} onFav={() => toggleFav(v)} categoryName={catName(v.category_id)} />)}
          </div>
        )}
      {view === "grid" && !grouped && <div ref={sentinel} className="flex justify-center py-8">{infinite.isFetchingNextPage && <Spinner />}</div>}

      <VideoDrawer video={open} onClose={() => setOpen(null)} fav={!!(open && favs?.has(open.id))} onFav={() => open && toggleFav(open)} onAssign={() => setAssign(open)} />
      <AssignBriefDialog video={assign} open={!!assign} onClose={() => setAssign(null)} origin={assign?.is_ad ? "ad" : "library"} />
      <AdhocDialog open={adhoc} onClose={() => setAdhoc(false)} onDone={() => toast("Run lancé : les vidéos arrivent dans quelques minutes (Agents de collecte)", "success")} />
    </div>
  );
}

function EmptyLibrary({ adsOnly, filtered }: { adsOnly: boolean; filtered: boolean }) {
  if (filtered) return <Empty title="Aucun résultat pour ces filtres">Élargis la période, retire un filtre ou clique sur « Réinitialiser les filtres ».</Empty>;
  return (
    <Empty title={adsOnly ? "Aucune pub qui tourne depuis assez longtemps" : "La bibliothèque est vide"}>
      {adsOnly
        ? "Baisse la durée minimale de diffusion, ou lance un agent « Meta Ad Library » dans Agents de collecte."
        : <>Lance un agent ou un backfill dans <Link to="/admin/agents" className="underline">Agents de collecte</Link>, ou utilise « Collecter à la demande ».</>}
    </Empty>
  );
}

function GroupSection({ competitor, filters, favs, onOpen, onFav, catName }: {
  competitor: { id: string | null; name: string }; filters: Record<string, unknown>; favs?: Set<string>;
  onOpen: (v: Video) => void; onFav: (v: Video) => void; catName: (id: string | null) => string | undefined;
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
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{competitor.name}</h2>
        {competitor.id && <button className="text-sm text-accent hover:underline" onClick={() => setParams((p) => { const n = new URLSearchParams(p); n.delete("group"); n.set("competitor", competitor.id!); return n; }, { replace: true })}>Voir tout →</button>}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {data.map((v) => <VideoCard key={v.id} v={v} fav={!!favs?.has(v.id)} onOpen={() => onOpen(v)} onFav={() => onFav(v)} categoryName={catName(v.category_id)} />)}
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

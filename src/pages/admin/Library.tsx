import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { Button, Dialog, Empty, Field, Input, PageHeader, Select, Spinner, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useApps, useCategories, useCompetitors, useCountries } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { VideoCard } from "./library/VideoCard";
import { VideoDrawer } from "./library/VideoDrawer";
import { AssignBriefDialog } from "./library/AssignBriefDialog";
import type { Video } from "./library/types";

const PAGE = 48;
type Sort = "score" | "views" | "date" | "recent" | "ad_days";
const PERIODS: Record<string, number | null> = { all: null, "7": 7, "30": 30, "90": 90, "365": 365 };

function cursorValue(v: Video, sort: Sort): number {
  if (sort === "views") return v.views ?? -1;
  if (sort === "date") return v.published_at ? new Date(v.published_at).getTime() / 1000 : -1;
  if (sort === "recent") return new Date(v.first_seen_at).getTime() / 1000;
  if (sort === "ad_days") return v.ad_days ?? -1;
  return Number(v.score);
}

export default function Library({ adsOnly = false }: { adsOnly?: boolean }) {
  const [params, setParams] = useSearchParams();
  const get = (k: string, d = "") => params.get(k) ?? d;
  const set = (k: string, val: string) => {
    const p = new URLSearchParams(params);
    if (val) p.set(k, val); else p.delete(k);
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
  const [open, setOpen] = useState<Video | null>(null);
  const [assign, setAssign] = useState<Video | null>(null);
  const [adhoc, setAdhoc] = useState(false);
  const sort = (get("sort", adsOnly ? "ad_days" : "score") as Sort);

  useEffect(() => { const t = setTimeout(() => set("q", q), 350); return () => clearTimeout(t); }, [q]);

  const { data: collections } = useQuery({ queryKey: ["collections-list"], queryFn: async () => (await supabase.from("collections").select("id, name").order("name")).data ?? [] });
  const { data: favs } = useQuery({
    queryKey: ["favorites", profile?.id],
    queryFn: async () => new Set(((await supabase.from("favorites").select("video_id").eq("user_id", profile!.id)).data ?? []).map((f) => f.video_id)),
    enabled: !!profile,
  });

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
    };
  }, [params, adsOnly]);

  const query = useInfiniteQuery({
    queryKey: ["explore", filters],
    initialPageParam: null as null | { v: number; id: string },
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("explore_videos", { ...filters, p_cursor_value: pageParam?.v ?? null, p_cursor_id: pageParam?.id ?? null, p_limit: PAGE });
      if (error) throw error;
      return (data ?? []) as Video[];
    },
    getNextPageParam: (last) => (last.length < PAGE ? undefined : { v: cursorValue(last[last.length - 1], sort), id: last[last.length - 1].id }),
  });
  const videos = query.data?.pages.flat() ?? [];

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage(); }, { rootMargin: "800px" });
    io.observe(el);
    return () => io.disconnect();
  }, [query.hasNextPage, query.isFetchingNextPage, videos.length]);

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
  const languages = ["en", "fr", "es", "de", "it", "pt", "pl", "nl"];

  return (
    <div>
      <PageHeader
        title={adsOnly ? "Pubs gagnantes" : "Bibliothèque"}
        description={adsOnly
          ? "Pubs vidéo des concurrents qui tournent depuis longtemps (une pub qui dure est une pub rentable). Recycle-les en brief organique."
          : "Vidéos de référence collectées par les agents. Survole pour lire, clique pour le détail."}
        actions={profile?.role === "admin" && !adsOnly && <Button variant="outline" onClick={() => setAdhoc(true)}><Download className="h-4 w-4" /> Collecter à la demande</Button>}
      />

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Rechercher légende, #hashtag, @auteur…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select className="w-44" value={sort} onChange={(e) => set("sort", e.target.value)}>
            {adsOnly && <option value="ad_days">Durée de diffusion</option>}
            <option value="score">Score</option>
            {!adsOnly && <option value="views">Vues</option>}
            <option value="date">Date de publication</option>
            <option value="recent">Ajout récent</option>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <Select className="h-8 w-36 text-xs" value={get("app")} onChange={(e) => set("app", e.target.value)}><option value="">Toutes les apps</option>{(apps ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          <Select className="h-8 w-40 text-xs" value={get("competitor")} onChange={(e) => set("competitor", e.target.value)}><option value="">Tous les concurrents</option>{(comps ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          {!adsOnly && <Select className="h-8 w-32 text-xs" value={get("platform")} onChange={(e) => set("platform", e.target.value)}><option value="">Plateformes</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook_ads">Meta Ads</option></Select>}
          <Select className="h-8 w-28 text-xs" value={get("lang")} onChange={(e) => set("lang", e.target.value)}><option value="">Langues</option>{languages.map((l) => <option key={l} value={l}>{l}</option>)}</Select>
          <Select className="h-8 w-32 text-xs" value={get("country")} onChange={(e) => set("country", e.target.value)}><option value="">Pays</option>{(countries ?? []).map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select>
          <Select className="h-8 w-36 text-xs" value={get("category")} onChange={(e) => set("category", e.target.value)}><option value="">Catégories</option>{(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select className="h-8 w-32 text-xs" value={get("period", "all")} onChange={(e) => set("period", e.target.value === "all" ? "" : e.target.value)}>
            <option value="all">Toute période</option><option value="7">7 jours</option><option value="30">30 jours</option><option value="90">90 jours</option><option value="365">1 an</option>
          </Select>
          {!adsOnly && <Input className="h-8 w-28 text-xs" type="number" placeholder="Vues min." value={get("minViews")} onChange={(e) => set("minViews", e.target.value)} />}
          <Input className="h-8 w-24 text-xs" type="number" placeholder="Score min." value={get("minScore")} onChange={(e) => set("minScore", e.target.value)} />
          {adsOnly && <Input className="h-8 w-36 text-xs" type="number" placeholder="Diffusion ≥ jours" value={get("minDays", "14")} onChange={(e) => set("minDays", e.target.value)} />}
          {!adsOnly && <Select className="h-8 w-32 text-xs" value={get("ads", "all")} onChange={(e) => set("ads", e.target.value === "all" ? "" : e.target.value)}><option value="all">Organique + pubs</option><option value="organic">Organique</option><option value="ads">Pubs</option></Select>}
          <Select className="h-8 w-36 text-xs" value={get("collection")} onChange={(e) => set("collection", e.target.value)}><option value="">Collections</option>{(collections ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={get("fav") === "1"} onChange={(e) => set("fav", e.target.checked ? "1" : "")} /> Favoris</label>
          {[...params.keys()].some((k) => k !== "sort") && <button className="text-xs text-muted-foreground underline" onClick={() => { setQ(""); setParams({}, { replace: true }); }}>Réinitialiser</button>}
        </div>
      </div>

      {query.isLoading ? <div className="flex justify-center py-20"><Spinner /></div>
        : query.error ? <Empty title="Erreur de chargement">{(query.error as Error).message}</Empty>
        : videos.length === 0 ? <Empty title="Aucune vidéo">Élargis les filtres, ou lance un agent dans « Agents de collecte ».</Empty>
        : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {videos.map((v) => <VideoCard key={v.id} v={v} fav={!!favs?.has(v.id)} onOpen={() => setOpen(v)} onFav={() => toggleFav(v)} categoryName={catName(v.category_id)} />)}
          </div>
        )}
      <div ref={sentinel} className="flex justify-center py-8">{query.isFetchingNextPage && <Spinner />}</div>

      <VideoDrawer video={open} onClose={() => setOpen(null)} fav={!!(open && favs?.has(open.id))} onFav={() => open && toggleFav(open)} onAssign={() => setAssign(open)} />
      <AssignBriefDialog video={assign} open={!!assign} onClose={() => setAssign(null)} origin={assign?.is_ad ? "ad" : "library"} />
      <AdhocDialog open={adhoc} onClose={() => setAdhoc(false)} onDone={() => toast("Run lancé : les vidéos arrivent dans quelques minutes (Agents de collecte)", "success")} />
    </div>
  );
}

function AdhocDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { data: apps } = useApps();
  const [platform, setPlatform] = useState("tiktok");
  const [kind, setKind] = useState("keyword");
  const [value, setValue] = useState("");
  const [max, setMax] = useState(30);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await callFn("collect", { action: "run_adhoc", platform, kind, value, max_results: max, app_id: apps?.[0]?.id ?? null });
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
        <Field label="Nombre max. de vidéos" hint={`Coût estimé ≈ ${(unit * max).toFixed(2)} $ (plafond dur et budget mensuel dans Réglages → Intégrations)`}><Input type="number" min={1} max={200} value={max} onChange={(e) => setMax(Number(e.target.value))} /></Field>
      </div>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ExternalLink, FolderPlus, Heart, Send } from "lucide-react";
import { Badge, Button, Drawer, Input, Select, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useCategories, useCompetitors } from "@/lib/hooks";
import { compact, dateFr, flag } from "@/lib/utils";
import { PLATFORM_LABEL, type Video } from "./types";
import { playableUrl, thumbOf } from "./media";

export function VideoDrawer({ video, onClose, fav, onFav, onAssign }: { video: Video | null; onClose: () => void; fav: boolean; onFav: () => void; onAssign: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: cats } = useCategories();
  const { data: comps } = useCompetitors();
  const [src, setSrc] = useState<string | null>(null);
  const [newCollection, setNewCollection] = useState("");
  const [archiving, setArchiving] = useState(false);
  useEffect(() => { setSrc(null); if (video) playableUrl(video).then(setSrc); }, [video?.id, video?.video_path]);
  const { data: collections, refetch } = useQuery({
    queryKey: ["collections"],
    queryFn: async () => (await supabase.from("collections").select("id, name, collection_videos(video_id)").order("name")).data ?? [],
    enabled: !!video,
  });
  const { data: history } = useQuery({
    queryKey: ["metrics", video?.id],
    queryFn: async () => (await supabase.from("video_metrics").select("captured_at, views").eq("video_id", video!.id).order("captured_at")).data ?? [],
    enabled: !!video && !video.is_ad,
  });
  if (!video) return null;
  const v = video;
  const refresh = () => qc.invalidateQueries({ queryKey: ["explore"] });

  const setCategory = async (id: string) => {
    await supabase.from("videos").update({ category_id: id || null, category_auto: false }).eq("id", v.id);
    toast("Catégorie mise à jour", "success");
    refresh();
  };
  const toggleCollection = async (cid: string, inside: boolean) => {
    if (inside) await supabase.from("collection_videos").delete().eq("collection_id", cid).eq("video_id", v.id);
    else await supabase.from("collection_videos").insert({ collection_id: cid, video_id: v.id });
    refetch();
  };
  const createCollection = async () => {
    if (!newCollection.trim()) return;
    const { data: me } = await supabase.auth.getUser();
    const { data } = await supabase.from("collections").insert({ name: newCollection.trim(), created_by: me.user?.id }).select("id").single();
    if (data) await supabase.from("collection_videos").insert({ collection_id: data.id, video_id: v.id });
    setNewCollection("");
    refetch();
  };
  const archive = async () => {
    setArchiving(true);
    try {
      const r = await callFn("collect", { action: "store_video", video_id: v.id });
      toast(r.pending ? "Téléchargement lancé (Apify) : le MP4 arrive dans quelques minutes" : "MP4 archivé", "success");
      refresh();
    } catch (e) { toast((e as Error).message, "danger"); } finally { setArchiving(false); }
  };

  return (
    <Drawer open onClose={onClose} title={<span className="flex items-center gap-2">{PLATFORM_LABEL[v.platform]} · @{v.author_handle ?? v.ad_page_name}</span>}>
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div>
          <div className="aspect-[9/16] overflow-hidden rounded-lg bg-black">
            {src ? <video key={src} src={src} controls autoPlay muted loop playsInline poster={thumbOf(v) ?? undefined} className="h-full w-full object-contain" onError={() => setSrc(null)} />
              : thumbOf(v) ? <img src={thumbOf(v)!} className="h-full w-full object-cover" /> : null}
          </div>
          {!v.video_path && <p className="mt-2 text-xs text-muted-foreground">Lecture depuis le CDN de la plateforme (peut expirer). Archive le MP4 pour le garder.</p>}
        </div>
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button onClick={onAssign}><Send className="h-4 w-4" /> Assigner en brief</Button>
            <Button variant="outline" onClick={onFav}><Heart className={fav ? "h-4 w-4 fill-red-500 text-red-500" : "h-4 w-4"} /> {fav ? "Favori" : "Ajouter aux favoris"}</Button>
            {v.url && <a href={v.url} target="_blank" rel="noreferrer"><Button variant="outline"><ExternalLink className="h-4 w-4" /> Original</Button></a>}
            {!v.video_path && <Button variant="outline" onClick={archive} loading={archiving}><Archive className="h-4 w-4" /> Archiver le MP4</Button>}
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="Score" value={Math.round(v.score)} />
            {v.is_ad ? <>
              <Metric label="Diffusion" value={`${v.ad_days ?? "?"} j`} />
              <Metric label="Statut" value={v.ad_active ? "Active" : "Arrêtée"} />
            </> : <>
              <Metric label="Vues" value={compact(v.views)} />
              <Metric label="Abonnés" value={compact(v.author_followers)} />
              <Metric label="Likes" value={compact(v.likes)} />
              <Metric label="Commentaires" value={compact(v.comments)} />
              <Metric label="Partages" value={compact(v.shares)} />
            </>}
          </div>
          <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Publication</dt><dd>{v.is_ad ? `${dateFr(v.ad_started_at)} → ${v.ad_active ? "aujourd'hui" : dateFr(v.ad_ended_at)}` : dateFr(v.published_at)}</dd>
            <dt className="text-muted-foreground">Langue / pays</dt><dd>{v.language ?? "—"} {flag(v.country)} {v.country ?? ""}</dd>
            <dt className="text-muted-foreground">Durée</dt><dd>{v.duration_s ? `${Math.round(v.duration_s)} s` : "—"}</dd>
            <dt className="text-muted-foreground">Son</dt><dd className="truncate">{v.sound_name ?? "—"}</dd>
            <dt className="text-muted-foreground">Concurrent</dt><dd>{comps?.find((c: any) => c.id === v.competitor_id)?.name ?? "—"}</dd>
            <dt className="text-muted-foreground">Catégorie</dt>
            <dd>
              <Select value={v.category_id ?? ""} onChange={(e) => setCategory(e.target.value)} className="h-8 max-w-56">
                <option value="">—</option>
                {(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              {v.category_auto && v.category_id && <span className="ml-2 text-xs text-muted-foreground">auto</span>}
            </dd>
          </dl>
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Légende</p>
            <p className="whitespace-pre-wrap text-sm">{v.caption || "—"}</p>
            <div className="mt-2 flex flex-wrap gap-1">{v.hashtags.map((h) => <Badge key={h} tone="outline">#{h}</Badge>)}</div>
          </div>
          {history && history.length > 1 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Historique des vues</p>
              <Spark points={history.map((h: any) => Number(h.views))} />
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Collections</p>
            <div className="flex flex-wrap gap-1.5">
              {(collections ?? []).map((c: any) => {
                const inside = c.collection_videos.some((x: any) => x.video_id === v.id);
                return <button key={c.id} onClick={() => toggleCollection(c.id, inside)} className={`rounded-full border px-2.5 py-1 text-xs ${inside ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground"}`}>{c.name}</button>;
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <Input placeholder="Nouvelle collection" value={newCollection} onChange={(e) => setNewCollection(e.target.value)} className="h-8 max-w-60" />
              <Button size="sm" variant="outline" onClick={createCollection}><FolderPlus className="h-3.5 w-3.5" /> Créer</Button>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md bg-muted px-3 py-2"><p className="text-[11px] uppercase text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>;
}

function Spark({ points }: { points: number[] }) {
  const max = Math.max(...points, 1), w = 300, h = 60;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - (p / max) * h}`).join(" ");
  return <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full"><polyline points={d} fill="none" stroke="var(--accent)" strokeWidth="2" /></svg>;
}

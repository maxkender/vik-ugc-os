import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Eye, ExternalLink, FolderPlus, Heart, Megaphone, Repeat2, Send, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { Badge, Button, Drawer, Input, Select, Sparkline, useToast } from "@/components/ui";
import { PlatformIcon, ThumbPlaceholder } from "./VideoCard";
import { ScorePill } from "./VideoTable";
import { callFn, supabase } from "@/lib/supabase";
import { useCategories, useCompetitors } from "@/lib/hooks";
import { compact, dateFr, flag } from "@/lib/utils";
import { ORIGIN_LABEL, PLATFORM_LABEL, pct, times, type Video } from "./types";
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

  const thumb = thumbOf(v);
  const competitor = comps?.find((c: any) => c.id === v.competitor_id)?.name;
  return (
    <Drawer open onClose={onClose} title={
      <span className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-tint-violet text-[11px] font-semibold uppercase text-[#7a32ef]">{(v.author_handle ?? v.ad_page_name ?? "?").charAt(0)}</span>
        <span className="truncate">@{v.author_handle ?? v.ad_page_name}</span>
        <span className="inline-flex items-center gap-1 text-xs font-normal text-subtle-foreground"><PlatformIcon p={v.platform} className="h-3.5 w-3.5" />{PLATFORM_LABEL[v.platform]}</span>
      </span>
    }>
      <div className="grid gap-8 md:grid-cols-[230px_1fr]">
        <div>
          <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-[#0b1530] ring-1 ring-border">
            {src ? <video key={src} src={src} controls autoPlay muted loop playsInline poster={thumb ?? undefined} className="h-full w-full object-contain" onError={() => setSrc(null)} />
              : thumb ? <img src={thumb} className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} /> : <ThumbPlaceholder v={v} />}
          </div>
          {!v.video_path && <p className="mt-3 text-xs leading-relaxed text-subtle-foreground">Lecture depuis le CDN de la plateforme (lien temporaire). Archive le MP4 pour le garder.</p>}
          <div className="mt-4 space-y-2">
            {v.url && <a href={v.url} target="_blank" rel="noreferrer" className="block"><Button variant="secondary" className="w-full"><ExternalLink className="h-4 w-4" /> Voir l'original</Button></a>}
            {!v.video_path && <Button variant="secondary" className="w-full" onClick={archive} loading={archiving}><Archive className="h-4 w-4" /> Archiver le MP4</Button>}
          </div>
        </div>

        <div className="min-w-0 space-y-7">
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={onAssign}><Send className="h-4 w-4" /> Assigner en brief</Button>
            <Button variant="secondary" onClick={onFav}><Heart className={fav ? "h-4 w-4 fill-[#fe504f] text-[#fe504f]" : "h-4 w-4"} /> {fav ? "Dans les favoris" : "Favori"}</Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-subtle-foreground">Score <ScorePill score={v.score} /></span>
            <span className="mx-1 h-4 w-px bg-border-strong" />
            <span className="text-[13px] font-medium text-foreground">{competitor ?? "Hors concurrents"}</span>
            {v.origin && <Badge tone={v.origin === "ugc" ? "accent" : v.origin === "ad" ? "warning" : v.origin === "official" ? "violet" : "default"}>{ORIGIN_LABEL[v.origin]}</Badge>}
            {v.language && <Badge>{flag(v.country)} {v.language}</Badge>}
            {v.is_ad && <Badge tone={v.ad_active ? "success" : "default"}>{v.ad_active ? "Active" : "Arrêtée"}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {v.is_ad ? <>
              <Tile icon={<Megaphone />} tint="yellow" label="Diffusion" value={`${v.ad_days ?? "?"} jours`} />
              <Tile icon={<TrendingUp />} tint="blue" label="Début" value={v.ad_started_at ? new Date(v.ad_started_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "2-digit" }) : "—"} />
              <Tile icon={<Sparkles />} tint="green" label="Statut" value={v.ad_active ? "Active" : "Arrêtée"} />
            </> : <>
              <Tile icon={<Eye />} tint="blue" label="Vues" value={compact(v.views)} />
              <Tile icon={<Heart />} tint="red" label="Engagement" value={pct(v.engagement)} />
              <Tile icon={<Zap />} tint="yellow" label="Outlier" value={times(v.outlier)} hint="vues ÷ abonnés" />
              <Tile icon={<TrendingUp />} tint="green" label="Vues / jour" value={compact(v.velocity)} />
              <Tile icon={<Users />} tint="violet" label="Abonnés" value={compact(v.author_followers)} />
              <Tile icon={<Repeat2 />} tint="cyan" label="Partages · com." value={`${compact(v.shares)} · ${compact(v.comments)}`} />
            </>}
          </div>

          {history && history.length > 1 && (
            <Block title="Évolution des vues"><Sparkline values={history.map((h: any) => Number(h.views))} height={56} /></Block>
          )}

          <Block title="Légende">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{v.caption || "—"}</p>
            {(v.hashtags.length > 0 || v.mentions?.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {v.mentions?.map((m) => <Badge key={`@${m}`} tone="accent">@{m}</Badge>)}
                {v.hashtags.map((h) => <Badge key={h}>#{h}</Badge>)}
              </div>
            )}
          </Block>

          <Block title="Détails">
            <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2.5 text-[13px]">
              <dt className="text-subtle-foreground">Publication</dt><dd className="text-foreground">{v.is_ad ? `${dateFr(v.ad_started_at)} → ${v.ad_active ? "aujourd'hui" : dateFr(v.ad_ended_at)}` : dateFr(v.published_at)}</dd>
              <dt className="text-subtle-foreground">Durée</dt><dd className="text-foreground">{v.duration_s ? `${Math.round(v.duration_s)} s` : "—"}</dd>
              <dt className="text-subtle-foreground">Son</dt><dd className="truncate text-foreground">{v.sound_name ?? "—"}</dd>
              <dt className="text-subtle-foreground">Likes</dt><dd className="tabular text-foreground">{compact(v.likes)}</dd>
              <dt className="flex items-center text-subtle-foreground">Format</dt>
              <dd className="flex items-center gap-2">
                <Select value={v.category_id ?? ""} onChange={(e) => setCategory(e.target.value)} className="h-8 max-w-56">
                  <option value="">Non classé</option>
                  {(cats ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
                {v.category_auto && v.category_id && <span className="text-xs text-subtle-foreground">auto</span>}
              </dd>
            </dl>
          </Block>

          <Block title="Collections">
            <div className="flex flex-wrap gap-1.5">
              {(collections ?? []).length === 0 && <p className="text-[13px] text-subtle-foreground">Aucune collection pour l'instant.</p>}
              {(collections ?? []).map((c: any) => {
                const inside = c.collection_videos.some((x: any) => x.video_id === v.id);
                return <button key={c.id} onClick={() => toggleCollection(c.id, inside)} className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${inside ? "border-[#cddcff] bg-accent-soft text-[#0040d6]" : "border-border-strong text-muted-foreground hover:text-foreground"}`}>{c.name}</button>;
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <Input placeholder="Nouvelle collection" value={newCollection} onChange={(e) => setNewCollection(e.target.value)} className="h-8 max-w-60" />
              <Button size="sm" variant="secondary" onClick={createCollection}><FolderPlus className="h-3.5 w-3.5" /> Créer</Button>
            </div>
          </Block>
        </div>
      </div>
    </Drawer>
  );
}

const TILE_TINT = {
  blue: "bg-tint-blue text-accent", red: "bg-tint-red text-[#e5383b]", yellow: "bg-tint-yellow text-[#c98a00]",
  green: "bg-tint-green text-[#12a150]", violet: "bg-tint-violet text-[#8c43ff]", cyan: "bg-tint-cyan text-[#0a95e0]",
} as const;
function Tile({ icon, tint, label, value, hint }: { icon: React.ReactNode; tint: keyof typeof TILE_TINT; label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-separator bg-white p-3.5">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5 ${TILE_TINT[tint]}`}>{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="tabular mt-2 truncate text-base font-semibold tracking-tight text-foreground">{value}</p>
      {hint && <p className="text-[11px] text-subtle-foreground">{hint}</p>}
    </div>
  );
}
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-separator pt-6">
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground">{title}</h3>
      {children}
    </section>
  );
}


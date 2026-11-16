import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clapperboard, ExternalLink, Eye, Globe2, Inbox, Pencil, Plus, Shuffle, Users } from "lucide-react";
import { Badge, Button, Card, Drawer, Empty, MetricPill, PageHeader, Spinner, Tabs, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn, compact, dateFr, flag } from "@/lib/utils";
import { AssignBriefDialog } from "./library/AssignBriefDialog";
import { thumbOf } from "./library/media";
import { BriefAssetsPicker } from "./assets/BriefAssets";
import { ReviewPanel } from "./review/ReviewPanel";
import { FeedbackStats } from "./review/FeedbackStats";
import { VideoPlayer } from "./library/VideoPlayer";
import type { Video } from "./library/types";
import { createContext, useContext } from "react";

/** Clic sur une miniature de brief : ouvre le lecteur sur la vidéo de référence. */
const PlayCtx = createContext<(v: Video) => void>(() => {});

const ST_TONE: Record<string, any> = { todo: "default", posted: "accent", validated: "success", rejected: "danger", changes_requested: "warning" };
const ST_LABEL: Record<string, string> = { todo: "À faire", posted: "Posté", validated: "Validé", rejected: "Refusé", changes_requested: "À corriger" };

function Thumb({ v, className }: { v: any; className?: string }) {
  const src = v ? thumbOf(v) : null;
  const play = useContext(PlayCtx);
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-lg bg-[#f1f3f7] ring-1 ring-border", v?.platform && "cursor-pointer hover:ring-accent", className)}
      onClick={v?.platform ? (e) => { e.stopPropagation(); play(v); } : undefined} title={v?.platform ? "Lire la vidéo de référence" : undefined}>
      {src ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
        : <div className="flex h-full w-full items-center justify-center text-subtle-foreground"><Clapperboard className="h-4 w-4" /></div>}
    </div>
  );
}

export default function Briefs() {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"queue" | "briefs" | "feedback">("queue");
  const [reviewing, setReviewing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<Video | null>(null);
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { data: briefs, isLoading: loadingBriefs } = useQuery({
    queryKey: ["briefs"],
    queryFn: async () => (await supabase.from("briefs").select("*, apps(name), pools(name), videos(*), brief_assignments(id, status)").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const { data: queue, isLoading: loadingQueue } = useQuery({
    queryKey: ["briefs", "queue"],
    queryFn: async () => (await supabase.from("brief_assignments").select("*, briefs(title, hook, instructions, videos(*)), posters(display_name, country)").eq("status", "posted").order("posted_at").limit(200)).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["briefs"] });
  // Rien à valider mais des briefs existent : on ouvre directement la liste.
  const autoTab = useRef(false);
  useEffect(() => {
    if (autoTab.current || !queue || !briefs) return;
    autoTab.current = true;
    if (queue.length === 0 && briefs.length > 0) setTab("briefs");
  }, [queue, briefs]);

  const review = async (id: string, status: "validated" | "rejected") => {
    const reason = status === "rejected" ? window.prompt("Raison du refus (visible par le posteur) :") : null;
    if (status === "rejected" && reason === null) return;
    try { await callFn("briefs", { action: "review", assignment_id: id, status, reason }); toast(status === "validated" ? "Post validé" : "Post refusé", "success"); refresh(); }
    catch (e) { toast((e as Error).message, "danger"); }
  };
  const dispatch = async () => {
    setBusy(true);
    try { const r = await callFn("briefs", { action: "dispatch" }); toast(`${r.assigned} assignation(s) ajoutée(s) à la file du jour`, "success"); refresh(); }
    catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(false); }
  };
  const archive = async (b: any) => {
    const { error } = await supabase.from("briefs").update({ status: b.status === "active" ? "archived" : "active" }).eq("id", b.id);
    if (error) toast(error.message, "danger");
    refresh();
  };

  return (
    <PlayCtx.Provider value={setPlaying}>
    <div>
      <PageHeader title="Briefs" description="Chaque posteur reçoit 2 briefs par jour. Les briefs « pool » sont répartis automatiquement chaque matin (5 h UTC)."
        actions={<>
          {isAdmin && <Button variant="secondary" onClick={dispatch} loading={busy}><Shuffle className="h-4 w-4" /> Répartir maintenant</Button>}
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouveau brief</Button>
        </>} />
      <div className="mb-6">
        <Tabs value={tab} onChange={setTab} items={[
          { value: "queue", label: <span className="flex items-center gap-1.5">À valider {queue?.length ? <span className="tabular rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">{queue.length}</span> : null}</span> },
          { value: "briefs", label: <span className="flex items-center gap-1.5">Tous les briefs <span className="tabular text-subtle-foreground">{briefs?.length ?? 0}</span></span> },
          { value: "feedback", label: "Retours et stats" },
        ]} />
      </div>

      {tab === "queue" && (loadingQueue ? <div className="flex justify-center py-16"><Spinner /></div> : queue?.length ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {queue.map((a: any) => (
            <Card key={a.id} className="flex gap-4 p-4">
              <Thumb v={a.briefs?.videos} className="h-[120px] w-[68px]" />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-[14px] font-medium text-foreground">{a.briefs?.title}</p>
                <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{flag(a.posters?.country)} {a.posters?.display_name} · posté {dateFr(a.posted_at, true)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <a className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline" href={a.posted_url} target="_blank" rel="noreferrer">Voir sur {a.posted_platform === "instagram" ? "Instagram" : a.posted_platform === "tiktok" ? "TikTok" : "la plateforme"} <ExternalLink className="h-3 w-3" /></a>
                </div>
                <div className="mt-2"><ViewsEditor a={a} onSaved={refresh} /></div>
                <div className="mt-auto flex gap-2 pt-3">
                  <Button size="sm" onClick={() => setReviewing(a)}><Pencil className="h-3.5 w-3.5" /> Revoir</Button>
                  <Button size="sm" variant="success" onClick={() => review(a.id, "validated")}><Check className="h-3.5 w-3.5" /> Valider direct</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : <Empty title="Rien à valider" icon={<Check className="h-5 w-5" />}>Quand un posteur colle le lien de sa vidéo publiée, elle apparaît ici pour être validée (ou refusée avec un commentaire).</Empty>)}

      {tab === "briefs" && (loadingBriefs ? <div className="flex justify-center py-16"><Spinner /></div> : briefs?.length ? (
        <Card className="overflow-hidden p-0">
          <ul>
            {briefs.map((b: any) => {
              const as = b.brief_assignments ?? [];
              const count = (s: string) => as.filter((x: any) => x.status === s).length;
              const total = Math.max(b.pool_id ? b.quantity : as.length, as.length, 1);
              const v = count("validated"), p = count("posted");
              return (
                <li key={b.id} onClick={() => setOpen(b)} className="flex cursor-pointer flex-col gap-4 border-b border-separator px-5 py-4 transition-colors last:border-b-0 hover:bg-muted sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <Thumb v={b.videos} className="h-[72px] w-[41px]" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14px] font-medium text-foreground">{b.title}</p>
                        {b.status === "archived" && <Badge tone="outline">Archivé</Badge>}
                        {b.status === "draft" && <Badge tone="warning">Brouillon à valider</Badge>}
                      </div>
                      {b.hook && <p className="mt-0.5 max-w-xl truncate text-[13px] text-muted-foreground">« {b.hook} »</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {b.apps?.name && <MetricPill tone="blue">{b.apps.name}</MetricPill>}
                        <MetricPill icon={<Globe2 />}>{b.language ?? "toutes langues"} · {b.target_countries?.length ? b.target_countries.map(flag).join(" ") : "tous pays"}</MetricPill>
                        <MetricPill icon={<Users />}>{b.pools ? `${b.pools.name} · ${b.quantity}` : `${as.length} posteur(s)`}</MetricPill>
                      </div>
                    </div>
                  </div>
                  <div className="w-full sm:w-64 sm:shrink-0">
                    <div className="flex h-2 overflow-hidden rounded-full bg-[#f1f3f7]">
                      <div className="bg-success" style={{ width: `${(v / total) * 100}%` }} />
                      <div className="bg-accent" style={{ width: `${(p / total) * 100}%` }} />
                    </div>
                    <p className="tabular mt-1.5 text-xs text-subtle-foreground"><span className="font-medium text-foreground">{v + p}/{total}</span> réalisés · {v} validé · {count("todo")} à faire{b.pool_id && as.length < b.quantity ? ` · ${b.quantity - as.length} à répartir` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:w-44 sm:shrink-0 sm:justify-end">
                    <span className="tabular whitespace-nowrap text-xs text-subtle-foreground">{dateFr(b.created_at)}</span>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); archive(b); }}>{b.status === "archived" ? "Réactiver" : b.status === "draft" ? "Valider" : "Archiver"}</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : <Empty title="Aucun brief" icon={<Inbox className="h-5 w-5" />} action={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Nouveau brief</Button>}>Crée un brief depuis la Bibliothèque (« Assigner en brief » sur une vidéo) ou un brief manuel.</Empty>)}

      {tab === "feedback" && <FeedbackStats />}
      <BriefDrawer brief={open} onClose={() => setOpen(null)} onReview={review} onOpenReview={(a) => setReviewing({ ...a, briefs: { title: open?.title, hook: open?.hook, instructions: open?.instructions, videos: open?.videos } })} />
      <ReviewPanel assignment={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); refresh(); }} />
      <AssignBriefDialog video={null} open={creating} onClose={() => { setCreating(false); refresh(); }} origin="manual" />
      <VideoPlayer list={playing ? [playing] : []} index={playing ? 0 : null} onIndex={(i) => i === null && setPlaying(null)} />
    </div>
    </PlayCtx.Provider>
  );
}

/** Vues mesurées (J+2 / J+7) : corrigeables par le contrôleur ou l'admin. */
function ViewsEditor({ a, onSaved }: { a: any; onSaved: () => void }) {
  const toast = useToast();
  const [d2, setD2] = useState(a.views_d2 ?? "");
  const [d7, setD7] = useState(a.views_d7 ?? "");
  const [editing, setEditing] = useState(false);
  if (!editing) return (
    <button className="group inline-flex flex-wrap items-center gap-1.5 text-left" title="Corriger les vues mesurées" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      <MetricPill icon={<Eye />}>J+2 {compact(a.views_d2)}</MetricPill>
      <MetricPill icon={<Eye />}>J+7 {compact(a.views_d7)}</MetricPill>
      {a.last_views != null && a.views_d7 == null && <span className="text-xs text-subtle-foreground">dernier relevé {compact(a.last_views)}</span>}
      <Pencil className="h-3 w-3 text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
  const save = async () => {
    const num = (v: any) => (v === "" || v === null ? null : Math.max(0, Math.round(Number(v))));
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { views_d2: num(d2), views_d7: num(d7) };
    if (num(d2) !== null && !a.views_d2_at) patch.views_d2_at = now;
    if (num(d7) !== null && !a.views_d7_at) patch.views_d7_at = now;
    const { error } = await supabase.from("brief_assignments").update(patch).eq("id", a.id);
    if (error) return toast(error.message, "danger");
    toast("Vues mises à jour", "success");
    setEditing(false);
    onSaved();
  };
  const cls = "h-8 w-24 rounded-lg border border-border-strong bg-white px-2 text-[13px] focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";
  return (
    <span className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      <input className={cls} type="number" placeholder="Vues J+2" value={d2} onChange={(e) => setD2(e.target.value)} />
      <input className={cls} type="number" placeholder="Vues J+7" value={d7} onChange={(e) => setD7(e.target.value)} />
      <Button size="sm" onClick={save}>OK</Button>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
    </span>
  );
}

function BriefDrawer({ brief, onClose, onReview, onOpenReview }: { brief: any; onClose: () => void; onReview: (id: string, s: "validated" | "rejected") => void; onOpenReview: (a: any) => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["briefs", "detail", brief?.id],
    queryFn: async () => (await supabase.from("brief_assignments").select("*, posters(display_name, country)").eq("brief_id", brief.id).order("due_date", { ascending: false })).data ?? [],
    enabled: !!brief,
  });
  if (!brief) return null;
  return (
    <Drawer open onClose={onClose} title={brief.title}>
      <div className="space-y-6">
        <div className="flex gap-5">
          <Thumb v={brief.videos} className="h-[160px] w-[90px]" />
          <div className="min-w-0 space-y-4">
            {brief.hook && <div><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">Hook</p><p className="mt-1 text-[15px] font-medium text-foreground">« {brief.hook} »</p></div>}
            {brief.videos?.url && <a className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline" href={brief.videos.url} target="_blank" rel="noreferrer">Vidéo de référence @{brief.videos.author_handle} <ExternalLink className="h-3 w-3" /></a>}
          </div>
        </div>
        {brief.instructions && (
          <div className="rounded-xl bg-muted px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">Consignes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{brief.instructions}</p>
          </div>
        )}
        <BriefAssetsPicker briefId={brief.id} appId={brief.app_id ?? null} />
        <section>
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">Assignations</h3>
          {isLoading ? <Spinner /> : (data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Pas encore assigné : la répartition du matin s'en charge pour les briefs « pool ».</p> : (
            <ul className="divide-y divide-separator rounded-xl border">
              {(data ?? []).map((a: any) => (
                <li key={a.id} className="space-y-2 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{flag(a.posters?.country)} {a.posters?.display_name}</span>
                    <Badge tone={ST_TONE[a.status]}>{ST_LABEL[a.status]}</Badge>
                    <span className="tabular text-xs text-subtle-foreground">échéance {a.due_date}</span>
                    {a.posted_url && <a href={a.posted_url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">Lien <ExternalLink className="h-3 w-3" /></a>}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ViewsEditor a={a} onSaved={() => qc.invalidateQueries({ queryKey: ["briefs"] })} />
                    {a.posted_url && <span className="flex gap-1.5"><Button size="sm" onClick={() => onOpenReview(a)}><Pencil className="h-3 w-3" /> Revoir / retour</Button>{a.status === "posted" && <Button size="sm" variant="success" onClick={() => onReview(a.id, "validated")}><Check className="h-3 w-3" /> Valider</Button>}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Plus, Shuffle, X } from "lucide-react";
import { Badge, Button, Drawer, Empty, PageHeader, Table, Tabs, Td, Th, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { compact, dateFr, flag } from "@/lib/utils";
import { AssignBriefDialog } from "./library/AssignBriefDialog";
import { thumbOf } from "./library/media";

const ST_TONE: Record<string, any> = { todo: "default", posted: "accent", validated: "success", rejected: "danger" };
const ST_LABEL: Record<string, string> = { todo: "À faire", posted: "Posté", validated: "Validé", rejected: "Refusé" };

export default function Briefs() {
  const toast = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"queue" | "briefs">("queue");
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { data: briefs } = useQuery({
    queryKey: ["briefs"],
    queryFn: async () => (await supabase.from("briefs").select("*, apps(name), pools(name), videos(thumbnail_path, thumbnail_src, author_handle, url), brief_assignments(id, status)").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const { data: queue } = useQuery({
    queryKey: ["briefs", "queue"],
    queryFn: async () => (await supabase.from("brief_assignments").select("*, briefs(title, hook), posters(display_name, country)").eq("status", "posted").order("posted_at").limit(200)).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["briefs"] });

  const review = async (id: string, status: "validated" | "rejected") => {
    const reason = status === "rejected" ? window.prompt("Raison du refus (visible par le posteur) :") : null;
    if (status === "rejected" && reason === null) return;
    try { await callFn("briefs", { action: "review", assignment_id: id, status, reason }); refresh(); }
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
    <div>
      <PageHeader title="Briefs" description="Chaque posteur reçoit 2 briefs par jour. Les briefs « pool » sont répartis automatiquement chaque matin (5 h UTC)."
        actions={<>
          {isAdmin && <Button variant="outline" onClick={dispatch} loading={busy}><Shuffle className="h-4 w-4" /> Répartir maintenant</Button>}
          <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Brief manuel</Button>
        </>} />
      <div className="mb-6"><Tabs value={tab} onChange={setTab} items={[{ value: "queue", label: `À valider (${queue?.length ?? 0})` }, { value: "briefs", label: `Briefs (${briefs?.length ?? 0})` }]} /></div>

      {tab === "queue" && (queue?.length ? (
        <Table>
          <thead><tr><Th>Posté</Th><Th>Posteur</Th><Th>Brief</Th><Th>Lien</Th><Th>Vues J+2 / J+7</Th><Th /></tr></thead>
          <tbody>
            {queue.map((a: any) => (
              <tr key={a.id}>
                <Td className="text-xs">{dateFr(a.posted_at, true)}</Td>
                <Td>{flag(a.posters?.country)} {a.posters?.display_name}</Td>
                <Td className="max-w-64 truncate">{a.briefs?.title}</Td>
                <Td><a className="flex items-center gap-1 text-accent hover:underline" href={a.posted_url} target="_blank" rel="noreferrer">{a.posted_platform} <ExternalLink className="h-3 w-3" /></a></Td>
                <Td><ViewsEditor a={a} onSaved={refresh} /></Td>
                <Td className="whitespace-nowrap">
                  <Button size="sm" variant="success" onClick={() => review(a.id, "validated")}><Check className="h-3.5 w-3.5" /> Valider</Button>{" "}
                  <Button size="sm" variant="outline" onClick={() => review(a.id, "rejected")}><X className="h-3.5 w-3.5" /> Refuser</Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : <Empty title="Rien à valider">Les vidéos postées par les posteurs apparaissent ici.</Empty>)}

      {tab === "briefs" && (briefs?.length ? (
        <Table>
          <thead><tr><Th>Référence</Th><Th>Brief</Th><Th>App</Th><Th>Cible</Th><Th>Assignation</Th><Th>Avancement</Th><Th>Créé</Th><Th /></tr></thead>
          <tbody>
            {briefs.map((b: any) => {
              const as = b.brief_assignments ?? [];
              const count = (s: string) => as.filter((x: any) => x.status === s).length;
              const thumb = b.videos ? thumbOf(b.videos) : null;
              return (
                <tr key={b.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen(b)}>
                  <Td>{thumb ? <img src={thumb} className="h-14 w-8 rounded object-cover" /> : <div className="h-14 w-8 rounded bg-muted" />}</Td>
                  <Td><p className="font-medium">{b.title}</p><p className="max-w-80 truncate text-xs text-muted-foreground">{b.hook}</p>{b.status === "archived" && <Badge tone="outline">archivé</Badge>}{b.status === "draft" && <Badge tone="warning">brouillon à valider</Badge>}</Td>
                  <Td>{b.apps?.name ?? "—"}</Td>
                  <Td className="text-xs">{b.language ?? "toutes langues"} · {b.target_countries?.length ? b.target_countries.map(flag).join(" ") : "tous pays"}</Td>
                  <Td className="text-xs">{b.pools ? `${b.pools.name} · ${b.quantity} vidéos` : `${as.length} posteur(s)`}</Td>
                  <Td className="text-xs">{count("validated")} validé · {count("posted")} posté · {count("todo")} à faire{b.pool_id && as.length < b.quantity ? ` · ${b.quantity - as.length} en attente` : ""}</Td>
                  <Td className="text-xs">{dateFr(b.created_at)}</Td>
                  <Td><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); archive(b); }}>{b.status === "archived" ? "Réactiver" : b.status === "draft" ? "Valider" : "Archiver"}</Button></Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      ) : <Empty title="Aucun brief">Crée un brief depuis la Bibliothèque (« Assigner en brief ») ou un brief manuel.</Empty>)}

      <BriefDrawer brief={open} onClose={() => setOpen(null)} onReview={review} />
      <AssignBriefDialog video={null} open={creating} onClose={() => { setCreating(false); refresh(); }} origin="manual" />
    </div>
  );
}

/** Vues mesurées (J+2 / J+7) : corrigeables par le contrôleur ou l'admin. */
function ViewsEditor({ a, onSaved }: { a: any; onSaved: () => void }) {
  const toast = useToast();
  const [d2, setD2] = useState(a.views_d2 ?? "");
  const [d7, setD7] = useState(a.views_d7 ?? "");
  const [editing, setEditing] = useState(false);
  if (!editing) return (
    <button className="text-left text-xs hover:underline" title="Corriger les vues mesurées" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      {compact(a.views_d2)} / {compact(a.views_d7)}{a.last_views != null && a.views_d7 == null ? <span className="text-muted-foreground"> (dernier relevé {compact(a.last_views)})</span> : null}
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
  return (
    <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <input className="h-7 w-20 rounded border bg-card px-1.5 text-xs" type="number" placeholder="J+2" value={d2} onChange={(e) => setD2(e.target.value)} />
      <input className="h-7 w-20 rounded border bg-card px-1.5 text-xs" type="number" placeholder="J+7" value={d7} onChange={(e) => setD7(e.target.value)} />
      <Button size="sm" onClick={save}>OK</Button>
    </span>
  );
}

function BriefDrawer({ brief, onClose, onReview }: { brief: any; onClose: () => void; onReview: (id: string, s: "validated" | "rejected") => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["briefs", "detail", brief?.id],
    queryFn: async () => (await supabase.from("brief_assignments").select("*, posters(display_name, country)").eq("brief_id", brief.id).order("due_date", { ascending: false })).data ?? [],
    enabled: !!brief,
  });
  if (!brief) return null;
  return (
    <Drawer open onClose={onClose} title={brief.title}>
      <div className="space-y-4">
        {brief.hook && <div><p className="text-xs uppercase text-muted-foreground">Hook</p><p>{brief.hook}</p></div>}
        {brief.instructions && <div><p className="text-xs uppercase text-muted-foreground">Consignes</p><p className="whitespace-pre-wrap text-sm">{brief.instructions}</p></div>}
        {brief.videos?.url && <a className="text-sm text-accent underline" href={brief.videos.url} target="_blank" rel="noreferrer">Vidéo de référence (@{brief.videos.author_handle})</a>}
        <Table>
          <thead><tr><Th>Posteur</Th><Th>Échéance</Th><Th>Statut</Th><Th>Lien</Th><Th>J+2</Th><Th>J+7</Th><Th /></tr></thead>
          <tbody>
            {(data ?? []).map((a: any) => (
              <tr key={a.id}>
                <Td>{flag(a.posters?.country)} {a.posters?.display_name}</Td>
                <Td className="text-xs">{a.due_date}</Td>
                <Td><Badge tone={ST_TONE[a.status]}>{ST_LABEL[a.status]}</Badge></Td>
                <Td>{a.posted_url ? <a href={a.posted_url} target="_blank" rel="noreferrer" className="text-accent"><ExternalLink className="h-3.5 w-3.5" /></a> : "—"}</Td>
                <Td colSpan={2}><ViewsEditor a={a} onSaved={() => qc.invalidateQueries({ queryKey: ["briefs"] })} /></Td>
                <Td>{a.status === "posted" && <span className="flex gap-1"><Button size="sm" variant="success" onClick={() => onReview(a.id, "validated")}><Check className="h-3 w-3" /></Button><Button size="sm" variant="outline" onClick={() => onReview(a.id, "rejected")}><X className="h-3 w-3" /></Button></span>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </Drawer>
  );
}

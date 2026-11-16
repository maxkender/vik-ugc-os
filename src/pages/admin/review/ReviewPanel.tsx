import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { Check, Clock, ExternalLink, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Badge, Button, Spinner, Textarea, useToast } from "@/components/ui";
import { VideoSurface } from "@/components/video/VideoSurface";
import { callFn, supabase } from "@/lib/supabase";
import { cn, dateFr, flag } from "@/lib/utils";
import { checkLabel, parseTimestamp, REVIEW_CHECKS, type Verdict } from "@shared/review.ts";
import { tiktokId, instagramCode } from "@shared/playback.ts";

const VERDICTS: { v: Verdict; label: string; tone: string }[] = [
  { v: "validated", label: "Validé", tone: "border-[#b7e4c7] bg-[#e6f6ec] text-[#0b7a3c]" },
  { v: "changes_requested", label: "À corriger", tone: "border-[#ffe2a8] bg-tint-yellow text-[#8a5a00]" },
  { v: "rejected", label: "Refusé", tone: "border-[#ffd1d1] bg-tint-red text-[#c42a2d]" },
];
export const VERDICT_TONE: Record<string, "success" | "warning" | "danger" | "default"> = { validated: "success", changes_requested: "warning", rejected: "danger" };
export const VERDICT_FR: Record<string, string> = { validated: "Validé", changes_requested: "À corriger", rejected: "Refusé" };

/** Vidéo publiée par le posteur, lisible dans le même lecteur que la bibliothèque. */
function postedVideo(url: string | null) {
  const platform = /instagram\.com/i.test(url ?? "") ? "instagram" : /tiktok\.com/i.test(url ?? "") ? "tiktok" : "other";
  const v = { id: `posted-${url}`, platform, url, external_id: platform === "tiktok" ? tiktokId({ platform, url }) : instagramCode(url) };
  return v;
}

/**
 * Revue d'un post (admin / contrôleur) : à gauche la vidéo du posteur, à droite la vidéo de référence et le brief ;
 * dessous, le retour (verdict, commentaire, points, timestamps, modèles) et l'historique des retours.
 */
export function ReviewPanel({ assignment, onClose, onDone }: { assignment: any | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const [verdict, setVerdict] = useState<Verdict>("validated");
  const [comment, setComment] = useState("");
  const [checks, setChecks] = useState<string[]>([]);
  const [stamps, setStamps] = useState<{ t: string; note: string }[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setVerdict("validated"); setComment(""); setChecks([]); setStamps([]); }, [assignment?.id]);
  useEffect(() => {
    if (!assignment) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [assignment, onClose]);
  const templates = useQuery({ queryKey: ["review-templates"], queryFn: async () => (await supabase.from("review_templates").select("*").order("label")).data ?? [], enabled: !!assignment });
  const history = useQuery({
    queryKey: ["post-reviews", assignment?.id],
    queryFn: async () => (await supabase.from("post_reviews").select("*, profiles:reviewer_id(full_name)").eq("assignment_id", assignment.id).order("created_at", { ascending: false })).data ?? [],
    enabled: !!assignment,
  });
  if (!assignment) return null;
  const a = assignment;
  const brief = a.briefs ?? {};
  const ref = brief.videos;

  const applyTemplate = (t: any) => { setVerdict(t.verdict); setComment(t.comment); setChecks(t.checks ?? []); };
  const saveTemplate = async () => {
    const label = window.prompt("Nom du modèle de retour :");
    if (!label?.trim() || !comment.trim()) return;
    await supabase.from("review_templates").insert({ label: label.trim(), verdict, comment: comment.trim(), checks });
    templates.refetch();
    toast("Modèle enregistré", "success");
  };
  const removeTemplate = async (t: any) => {
    if (!window.confirm(`Supprimer le modèle « ${t.label} » ?`)) return;
    await supabase.from("review_templates").delete().eq("id", t.id);
    templates.refetch();
  };
  const submit = async () => {
    if (verdict !== "validated" && !comment.trim()) return toast("Ajoute un commentaire pour « À corriger » ou « Refusé »", "danger");
    const bad = stamps.find((s) => s.t && parseTimestamp(s.t) === null);
    if (bad) return toast(`Timestamp invalide : « ${bad.t} » (format 0:04)`, "danger");
    setBusy(true);
    try {
      await callFn("briefs", { action: "review", assignment_id: a.id, verdict, comment, checks, timestamps: stamps.filter((s) => s.t) });
      toast(verdict === "validated" ? "Post validé" : verdict === "rejected" ? "Post refusé, retour envoyé" : "Retour envoyé : à corriger", "success");
      qc.invalidateQueries({ queryKey: ["post-reviews"] });
      onDone();
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#070d1f]/80 p-3 backdrop-blur-md sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()} data-testid="review-panel">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-separator px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{brief.title}</p>
            <p className="truncate text-xs text-subtle-foreground">{flag(a.posters?.country)} {a.posters?.display_name} · posté {dateFr(a.posted_at, true)}</p>
          </div>
          <Badge tone={VERDICT_TONE[a.status] ?? "default"}>{VERDICT_FR[a.status] ?? "À valider"}</Badge>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          {/* Vidéo du posteur */}
          <section>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground">Vidéo du posteur</p>
            <VideoSurface v={postedVideo(a.posted_url) as any} className="mx-auto max-h-[70vh] w-full max-w-[340px]" />
            {a.posted_url && <a href={a.posted_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">Ouvrir sur la plateforme <ExternalLink className="h-3 w-3" /></a>}
          </section>
          {/* Référence + brief + retour */}
          <section className="min-w-0 space-y-4">
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground">Référence</p>
                {ref ? <VideoSurface v={ref} autoPlay={false} muted className="w-full" /> : <p className="text-xs text-subtle-foreground">Pas de vidéo de référence</p>}
              </div>
              <div className="min-w-0 space-y-3">
                {brief.hook && <div className="rounded-xl bg-tint-blue px-3.5 py-2.5"><p className="text-[11px] font-semibold text-[#0040d6]">Hook</p><p className="text-[15px] font-semibold text-foreground">« {brief.hook} »</p></div>}
                {brief.instructions && <div className="rounded-xl bg-muted px-3.5 py-2.5"><p className="text-[11px] font-semibold text-subtle-foreground">Consignes</p><p className="whitespace-pre-wrap text-[13px] text-foreground">{brief.instructions}</p></div>}
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="flex flex-wrap gap-2">
                {VERDICTS.map((x) => (
                  <button key={x.v} onClick={() => setVerdict(x.v)} className={cn("h-9 rounded-lg border px-3.5 text-[13px] font-semibold transition", verdict === x.v ? x.tone : "border-border-strong bg-white text-muted-foreground hover:text-foreground")}>{x.label}</button>
                ))}
              </div>
              <Textarea className="mt-3" rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder={verdict === "validated" ? "Commentaire (facultatif) : ce qui marche bien" : "Ce qu'il faut corriger (obligatoire, visible par le posteur)"} />
              <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground">Points à revoir</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {REVIEW_CHECKS.map((c) => {
                  const on = checks.includes(c);
                  return <button key={c} onClick={() => setChecks(on ? checks.filter((x) => x !== c) : [...checks, c])}
                    className={cn("h-7 rounded-full border px-2.5 text-[12px] transition", on ? "border-[#cddcff] bg-accent-soft text-[#0040d6]" : "border-border-strong text-muted-foreground hover:text-foreground")}>{checkLabel(c, "fr")}</button>;
                })}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground"><Clock className="h-3 w-3" /> Moments précis</p>
              <div className="mt-1.5 space-y-1.5">
                {stamps.map((s, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input value={s.t} onChange={(e) => setStamps(stamps.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))} placeholder="0:04" className="h-8 w-16 rounded-lg border border-border-strong px-2 text-[13px]" />
                    <input value={s.note} onChange={(e) => setStamps(stamps.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} placeholder="à 0:04, coupe le silence" className="h-8 min-w-0 flex-1 rounded-lg border border-border-strong px-2 text-[13px]" />
                    <button onClick={() => setStamps(stamps.filter((_, j) => j !== i))} className="rounded-lg px-2 text-subtle-foreground hover:bg-muted" aria-label="Retirer"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => setStamps([...stamps, { t: "", note: "" }])} className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"><Plus className="h-3 w-3" /> Ajouter un moment</button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-separator pt-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground">Modèles</span>
                {(templates.data ?? []).map((t: any) => (
                  <span key={t.id} className="group inline-flex items-center rounded-full border border-border-strong">
                    <button onClick={() => applyTemplate(t)} className="h-7 px-2.5 text-[12px] text-foreground hover:text-accent">{t.label}</button>
                    <button onClick={() => removeTemplate(t)} className="hidden pr-2 text-subtle-foreground hover:text-[#c42a2d] group-hover:inline" aria-label="Supprimer le modèle"><Trash2 className="h-3 w-3" /></button>
                  </span>
                ))}
                <button onClick={saveTemplate} className="inline-flex h-7 items-center gap-1 rounded-full px-2 text-[12px] text-accent hover:underline" title="Enregistrer ce retour comme modèle"><Save className="h-3 w-3" /> Enregistrer comme modèle</button>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={submit} loading={busy}>{verdict === "validated" ? <><Check className="h-4 w-4" /> Valider</> : <><Pencil className="h-4 w-4" /> Envoyer le retour</>}</Button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground">Historique des retours</p>
              {history.isLoading ? <Spinner /> : (history.data ?? []).length === 0 ? <p className="text-[13px] text-subtle-foreground">Aucun retour pour l'instant.</p> : (
                <ul className="space-y-2">
                  {(history.data ?? []).map((r: any) => (
                    <li key={r.id} className="rounded-xl bg-[#f6f7fa] px-3.5 py-2.5 text-[13px]">
                      <div className="flex flex-wrap items-center gap-2"><Badge tone={VERDICT_TONE[r.verdict]}>{VERDICT_FR[r.verdict]}</Badge><span className="text-xs text-subtle-foreground">{dateFr(r.created_at, true)} · {r.profiles?.full_name ?? "équipe"}{r.seen_at ? " · lu" : ""}</span></div>
                      {r.comment && <p className="mt-1 whitespace-pre-wrap text-foreground">{r.comment}</p>}
                      {(r.checks?.length || r.timestamps?.length) ? <p className="mt-1 text-xs text-muted-foreground">{[...(r.checks ?? []).map((c: string) => checkLabel(c, "fr")), ...(r.timestamps ?? []).map((t: any) => `${t.t} ${t.note}`)].join(" · ")}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}

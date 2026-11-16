import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Link2, MessageSquare, Pencil, Send, XCircle } from "lucide-react";
import { Button, Spinner, useToast } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { checkLabel } from "@shared/review.ts";
import { READ_ONLY_HINT, useCreatorIdentity } from "./shared";

const TONE: Record<string, { cls: string; icon: any }> = {
  validated: { cls: "bg-tint-green text-[#0b7a3c]", icon: CheckCircle2 },
  changes_requested: { cls: "bg-tint-yellow text-[#8a5a00]", icon: Pencil },
  rejected: { cls: "bg-tint-red text-[#c42a2d]", icon: XCircle },
};

/** Écran « Retours » du posteur : historique des retours de l'équipe ; « J'ai corrigé » renvoie un nouveau lien. */
export default function Feedback() {
  const { t, i18n } = useTranslation();
  const me = useCreatorIdentity();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["my-reviews", me.id],
    enabled: !!me.id,
    queryFn: async () => (await supabase.from("post_reviews")
      .select("id, verdict, comment, checks, timestamps, posted_url, seen_at, created_at, assignment_id, brief_assignments(id, status, posted_url, briefs(title))")
      .eq("poster_id", me.id).order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  // Ouvrir l'écran marque les retours comme lus (la pastille de l'onglet disparaît).
  useEffect(() => {
    if (!q.data?.some((r: any) => !r.seen_at) || me.readOnly) return;
    supabase.rpc("mark_reviews_seen").then(() => qc.invalidateQueries({ queryKey: ["unread-reviews"] }));
  }, [q.data]);
  if (q.isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  const rows = q.data ?? [];
  return (
    <div>
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-foreground">{t("creator.feedback.title")}</h1>
      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground"><MessageSquare className="mx-auto mb-2 h-6 w-6 text-subtle-foreground" />{t("creator.feedback.empty")}</div>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((r: any) => {
            const tone = TONE[r.verdict] ?? TONE.rejected;
            const a = r.brief_assignments;
            const canFix = r.verdict !== "validated" && a && a.status !== "validated" && a.status !== "posted" && r.id === rows.find((x: any) => x.assignment_id === r.assignment_id)?.id;
            return (
              <li key={r.id} className="overflow-hidden rounded-2xl border bg-white shadow-xs">
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-foreground">{a?.briefs?.title ?? t("creator.feedback.brief")}</p>
                    <p className="text-xs text-subtle-foreground">{new Date(r.created_at).toLocaleDateString(i18n.resolvedLanguage, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{!r.seen_at && <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-white">{t("creator.feedback.new")}</span>}</p>
                  </div>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", tone.cls)}><tone.icon className="h-3.5 w-3.5" />{t(`creator.feedback.verdict.${r.verdict}`)}</span>
                </div>
                <div className="space-y-2.5 border-t border-separator px-4 py-3 text-sm">
                  {r.comment && <p className="whitespace-pre-wrap leading-relaxed text-foreground">{r.comment}</p>}
                  {r.checks?.length > 0 && (
                    <div><p className="text-xs font-medium text-subtle-foreground">{t("creator.feedback.points")}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">{r.checks.map((c: string) => <span key={c} className="rounded-full bg-[#f1f3f7] px-2.5 py-0.5 text-xs text-foreground">{checkLabel(c, i18n.resolvedLanguage)}</span>)}</div></div>
                  )}
                  {r.timestamps?.length > 0 && (
                    <div><p className="text-xs font-medium text-subtle-foreground">{t("creator.feedback.moments")}</p>
                      <ul className="mt-1 space-y-0.5">{r.timestamps.map((x: any, i: number) => <li key={i} className="flex gap-2 text-[13px]"><span className="tabular inline-flex items-center gap-1 font-semibold text-accent"><Clock className="h-3 w-3" />{x.t}</span><span className="text-foreground">{x.note}</span></li>)}</ul></div>
                  )}
                  {canFix && <FixForm assignmentId={a.id} previous={a.posted_url} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FixForm({ assignmentId, previous }: { assignmentId: string; previous: string | null }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { readOnly } = useCreatorIdentity();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = /^https?:\/\//i.test(url.trim()) && url.trim() !== (previous ?? "");
  const send = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("submit_post", { p_assignment: assignmentId, p_url: url.trim() });
    setBusy(false);
    if (error) return toast(error.message, "danger");
    toast(t("creator.feedback.sent"), "success");
    qc.invalidateQueries({ queryKey: ["my-reviews"] });
    qc.invalidateQueries({ queryKey: ["my-assignments"] });
  };
  return (
    <div className="rounded-xl border border-[#ffe2a8] bg-tint-yellow p-3">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#8a5a00]"><Pencil className="h-3.5 w-3.5" /> {t("creator.feedback.fixed")}</p>
      <p className="mt-0.5 text-xs text-[#8a5a00]">{t("creator.feedback.fixedHint")}</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`fix-${assignmentId}`}>{t("creator.feedback.newLink")}</label>
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <input id={`fix-${assignmentId}`} type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@you/video/…"
            className="h-11 w-full rounded-lg border border-border-strong bg-white pl-9 pr-3 text-[15px] focus:border-accent focus:outline-none" />
        </div>
        <Button className="h-11" onClick={send} loading={busy} disabled={readOnly || !valid} title={readOnly ? READ_ONLY_HINT : undefined}><Send className="h-4 w-4" /> {t("creator.feedback.send")}</Button>
      </div>
    </div>
  );
}

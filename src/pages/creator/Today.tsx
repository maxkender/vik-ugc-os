import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { publicUrl, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, Empty, Input, Spinner, useToast } from "@/components/ui";
import { formatMoney } from "@shared/zones.ts";
import { todayIso, useMyPoster } from "./shared";

interface RefVideo { id: string; url: string | null; thumbnail_path: string | null; thumbnail_src: string | null; video_path: string | null; caption: string | null; platform: string }
interface Assignment {
  id: string; due_date: string; status: "todo" | "posted" | "validated" | "rejected"; posted_url: string | null; rejection_reason: string | null;
  briefs: { title: string; hook: string | null; instructions: string | null; reference_video_id: string | null; videos: RefVideo | null } | null;
}

const TONE = { todo: "default", posted: "accent", validated: "success", rejected: "danger" } as const;

function Reference({ v }: { v: RefVideo }) {
  const { t } = useTranslation();
  const signed = useQuery({
    queryKey: ["ref-video", v.video_path],
    enabled: !!v.video_path,
    queryFn: async () => (await supabase.storage.from("reference-videos").createSignedUrl(v.video_path!, 3600)).data?.signedUrl ?? null,
    staleTime: 50 * 60_000,
  });
  const thumb = publicUrl("thumbnails", v.thumbnail_path) ?? v.thumbnail_src;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("creator.reference")}</p>
      {v.video_path && signed.data ? (
        <video src={signed.data} controls playsInline className="aspect-[9/16] max-h-[480px] w-auto rounded-lg bg-black" poster={thumb ?? undefined} />
      ) : thumb ? (
        <img src={thumb} alt="" className="aspect-[9/16] max-h-[360px] w-auto rounded-lg bg-muted object-cover" loading="lazy" />
      ) : null}
      {v.url && <a href={v.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline"><ExternalLink className="h-3.5 w-3.5" /> {t("creator.openOriginal")}</a>}
    </div>
  );
}

function AssignmentCard({ a, compact }: { a: Assignment; compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [url, setUrl] = useState(a.posted_url ?? "");
  const [busy, setBusy] = useState(false);
  const b = a.briefs;
  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("submit_post", { p_assignment: a.id, p_url: url.trim() });
    setBusy(false);
    if (error) toast(error.message, "danger");
    else {
      toast(t("creator.submitted"), "success");
      qc.invalidateQueries({ queryKey: ["my-assignments"] });
    }
  };
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{b?.title}</h3>
          <p className="text-xs text-muted-foreground">{t("creator.due", { date: new Date(`${a.due_date}T12:00:00Z`).toLocaleDateString(i18n.resolvedLanguage) })}</p>
        </div>
        <Badge tone={TONE[a.status]}>{t(`creator.status.${a.status}`)}</Badge>
      </div>
      {!compact && (
        <>
          {b?.hook && <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("creator.hook")}</p><p className="mt-1 text-lg font-medium">“{b.hook}”</p></div>}
          {b?.instructions && <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("creator.instructions")}</p><p className="mt-1 whitespace-pre-line text-sm">{b.instructions}</p></div>}
          {b?.videos && <Reference v={b.videos} />}
        </>
      )}
      {a.status === "rejected" && a.rejection_reason && <p className="rounded-md bg-danger/10 p-3 text-sm text-danger">{t("creator.rejectedReason", { reason: a.rejection_reason })}</p>}
      {a.status === "validated" ? (
        a.posted_url && <a href={a.posted_url} target="_blank" rel="noreferrer" className="block truncate text-sm text-accent hover:underline">{a.posted_url}</a>
      ) : (
        <div className="flex gap-2">
          <Input type="url" placeholder="https://www.tiktok.com/@you/video/…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label={t("creator.postedLink")} />
          <Button onClick={submit} loading={busy} disabled={!/^https?:\/\//i.test(url.trim()) || url.trim() === (a.posted_url ?? "")}>{t("creator.submit")}</Button>
        </div>
      )}
    </Card>
  );
}

export default function Today() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const poster = useMyPoster();
  const q = useQuery({
    queryKey: ["my-assignments", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data, error } = await supabase.from("brief_assignments")
        .select("id, due_date, status, posted_url, rejection_reason, briefs(title, hook, instructions, reference_video_id, videos(id, url, thumbnail_path, thumbnail_src, video_path, caption, platform))")
        .eq("poster_id", profile!.id).order("due_date", { ascending: false }).limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as Assignment[];
    },
  });
  const today = todayIso();
  const list = q.data ?? [];
  const current = list.filter((a) => a.due_date >= today || a.status === "todo" || a.status === "rejected");
  const earlier = list.filter((a) => !current.includes(a));
  const z = poster.data?.zones;
  const lang = i18n.resolvedLanguage ?? "en";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("creator.hello", { name: (profile?.full_name ?? "").split(" ")[0] })}</h1>
        {z && <p className="mt-1 text-sm text-muted-foreground">{t("creator.rate", { price: formatMoney(Number(z.price_per_video), z.currency, lang), rpm: formatMoney(Number(z.rpm), z.currency, lang), views: new Intl.NumberFormat(lang).format(z.rpm_views) })}</p>}
      </div>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("creator.todayTitle")}</h2>
        {q.isLoading ? <Spinner /> : current.length === 0 ? <Empty title={t("creator.none")} /> : current.map((a) => <AssignmentCard key={a.id} a={a} />)}
      </section>
      {earlier.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("creator.earlier")}</h2>
          {earlier.map((a) => <AssignmentCard key={a.id} a={a} compact />)}
        </section>
      )}
    </div>
  );
}

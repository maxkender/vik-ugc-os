import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, ExternalLink, Lightbulb, Link2, Play, Quote, Send, Sparkles, XCircle } from "lucide-react";
import { publicUrl, supabase } from "@/lib/supabase";
import { Button, Spinner, useToast } from "@/components/ui";
import { formatMoney } from "@shared/zones.ts";
import { cn } from "@/lib/utils";
import { playSources } from "@shared/playback.ts";
import { VideoSurface } from "@/components/video/VideoSurface";
import { READ_ONLY_HINT, todayIso, useCreatorIdentity, useMyPoster } from "./shared";

interface RefVideo { id: string; url: string | null; thumbnail_path: string | null; thumbnail_src: string | null; video_path: string | null; video_src?: string | null; external_id?: string | null; caption: string | null; platform: string }
interface Assignment {
  id: string; due_date: string; status: "todo" | "posted" | "validated" | "rejected"; posted_url: string | null; rejection_reason: string | null;
  briefs: { title: string; hook: string | null; instructions: string | null; reference_video_id: string | null; videos: RefVideo | null } | null;
}

const STATUS = {
  todo: { cls: "bg-[#f1f3f7] text-muted-foreground", icon: Clock },
  posted: { cls: "bg-tint-blue text-[#0040d6]", icon: Send },
  validated: { cls: "bg-tint-green text-[#0b7a3c]", icon: CheckCircle2 },
  rejected: { cls: "bg-tint-red text-[#c42a2d]", icon: XCircle },
} as const;

function StatusPill({ status }: { status: Assignment["status"] }) {
  const { t } = useTranslation();
  const s = STATUS[status];
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", s.cls)}><s.icon className="h-3.5 w-3.5" />{t(`creator.status.${status}`)}</span>;
}

function Reference({ v }: { v: RefVideo }) {
  const { t } = useTranslation();
  const [play, setPlay] = useState(false);
  const thumb = publicUrl("thumbnails", v.thumbnail_path) ?? v.thumbnail_src;
  // MP4 archivé, lien CDN encore valide ou lecteur officiel TikTok / Instagram.
  const canPlay = playSources(v).some((s) => s.kind !== "link");
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-subtle-foreground">{t("creator.reference")}</p>
      {canPlay && play ? (
        <VideoSurface v={v} className="mx-auto w-full max-w-[260px] rounded-2xl ring-1 ring-border sm:mx-0" />
      ) : (
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-2xl bg-[#f1f3f7] ring-1 ring-border sm:mx-0">
          {thumb && <img src={thumb} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />}
          {canPlay ? (
            <button onClick={() => setPlay(true)} className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/20" aria-label="Play">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg"><Play className="ml-0.5 h-6 w-6 fill-[#0b1530] text-[#0b1530]" /></span>
            </button>
          ) : !thumb && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-subtle-foreground"><Play className="h-8 w-8" /></div>}
        </div>
      )}
      {v.url && (
        <a href={v.url} target="_blank" rel="noreferrer" className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
          <ExternalLink className="h-3.5 w-3.5" /> {t("creator.openOriginal")}
        </a>
      )}
    </div>
  );
}

function BriefCard({ a, index }: { a: Assignment; index: number }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [url, setUrl] = useState(a.posted_url ?? "");
  const [busy, setBusy] = useState(false);
  const { readOnly } = useCreatorIdentity();
  const b = a.briefs;
  const submit = async () => {
    if (readOnly) return;
    setBusy(true);
    const { error } = await supabase.rpc("submit_post", { p_assignment: a.id, p_url: url.trim() });
    setBusy(false);
    if (error) toast(error.message, "danger");
    else {
      toast(t("creator.submitted"), "success");
      qc.invalidateQueries({ queryKey: ["my-assignments"] });
    }
  };
  const valid = /^https?:\/\//i.test(url.trim());
  return (
    <article className="overflow-hidden rounded-2xl border bg-white shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b border-separator px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="tabular mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">{index + 1}</span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold leading-snug text-foreground">{b?.title}</h3>
            <p className="mt-0.5 text-xs text-subtle-foreground">{t("creator.due", { date: new Date(`${a.due_date}T12:00:00Z`).toLocaleDateString(i18n.resolvedLanguage, { weekday: "long", day: "numeric", month: "long" }) })}</p>
          </div>
        </div>
        <StatusPill status={a.status} />
      </div>

      <div className="space-y-5 px-5 py-5">
        {b?.hook && (
          <div className="rounded-xl bg-tint-blue px-4 py-3.5">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#0040d6]"><Quote className="h-3.5 w-3.5" /> {t("creator.hook")}</p>
            <p className="text-[17px] font-semibold leading-snug text-[#0b1530]">{b.hook}</p>
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
          {b?.instructions && (
            <div className="order-2 sm:order-1">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-subtle-foreground"><Lightbulb className="h-3.5 w-3.5" /> {t("creator.instructions")}</p>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-foreground">{b.instructions}</p>
            </div>
          )}
          {b?.videos && <div className="order-1 sm:order-2 sm:w-[200px]"><Reference v={b.videos} /></div>}
        </div>

        {a.status === "rejected" && a.rejection_reason && (
          <div className="flex gap-2.5 rounded-xl bg-tint-red px-4 py-3 text-sm text-[#a52326]">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {t("creator.rejectedReason", { reason: a.rejection_reason })}
          </div>
        )}

        {a.status === "validated" ? (
          a.posted_url && (
            <a href={a.posted_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-tint-green px-4 py-3 text-sm font-medium text-[#0b7a3c]">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> <span className="truncate">{a.posted_url}</span>
            </a>
          )
        ) : (
          <div className="rounded-xl border border-border-strong bg-muted p-3">
            <label className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> {t("creator.postedLink")}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input type="url" inputMode="url" placeholder="https://www.tiktok.com/@you/video/…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label={t("creator.postedLink")}
                className="h-12 w-full rounded-lg border border-border-strong bg-white px-3.5 text-[15px] placeholder:text-subtle-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10" />
              <Button size="lg" className="h-12 shrink-0 sm:px-6" onClick={submit} loading={busy} disabled={readOnly || !valid || url.trim() === (a.posted_url ?? "")} title={readOnly ? READ_ONLY_HINT : undefined}>
                <Send className="h-4 w-4" /> {t("creator.submit")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function EarlierRow({ a }: { a: Assignment }) {
  const { i18n } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{a.briefs?.title}</p>
        <p className="text-xs text-subtle-foreground">{new Date(`${a.due_date}T12:00:00Z`).toLocaleDateString(i18n.resolvedLanguage, { day: "numeric", month: "short" })}
          {a.posted_url && <> · <a href={a.posted_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{hostOf(a.posted_url)}</a></>}
        </p>
      </div>
      <StatusPill status={a.status} />
    </div>
  );
}

const hostOf = (u: string) => { try { return new URL(u).hostname.replace("www.", ""); } catch { return u; } };

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 26, c = 2 * Math.PI * r, pct = total ? Math.min(1, done / total) : 0;
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#eef0f4" strokeWidth="6" />
      <circle cx="32" cy="32" r={r} fill="none" stroke={pct >= 1 ? "#12a150" : "#004dff"} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-all duration-500" />
    </svg>
  );
}

export default function Today() {
  const { t, i18n } = useTranslation();
  const me = useCreatorIdentity();
  const poster = useMyPoster();
  const q = useQuery({
    queryKey: ["my-assignments", me.id],
    enabled: !!me.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("brief_assignments")
        .select("id, due_date, status, posted_url, rejection_reason, briefs(title, hook, instructions, reference_video_id, videos(id, url, external_id, thumbnail_path, thumbnail_src, video_path, video_src, caption, platform))")
        .eq("poster_id", me.id!).order("due_date", { ascending: false }).limit(60);
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
  const goal = z?.videos_per_day ?? 2;
  const doneToday = list.filter((a) => a.due_date === today && (a.status === "posted" || a.status === "validated")).length;
  const first = (me.fullName ?? "").split(" ")[0];

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-xs">
        <div className="relative">
          <ProgressRing done={doneToday} total={goal} />
          <span className="tabular absolute inset-0 flex items-center justify-center text-[15px] font-semibold text-foreground">{doneToday}/{goal}</span>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-foreground">{t("creator.hello", { name: first })} 👋</h1>
          <p className="mt-0.5 text-sm capitalize text-muted-foreground">{new Date().toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" })}</p>
          {z && (
            <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-full bg-tint-green px-2.5 py-1 text-xs font-medium text-[#0b7a3c]">
              <Sparkles className="h-3.5 w-3.5" />
              {t("creator.rate", { price: formatMoney(Number(z.price_per_video), z.currency, lang), rpm: formatMoney(Number(z.rpm), z.currency, lang), views: new Intl.NumberFormat(lang).format(z.rpm_views) })}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-[13px] font-semibold text-muted-foreground">{t("creator.todayTitle")}</h2>
        {q.isLoading ? <div className="flex justify-center py-10"><Spinner /></div>
          : current.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-white px-6 py-12 text-center">
              <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-tint-blue text-accent"><CalendarIcon /></span>
              <p className="max-w-xs text-sm text-muted-foreground">{t("creator.none")}</p>
            </div>
          ) : current.map((a, i) => <BriefCard key={a.id} a={a} index={i} />)}
      </section>

      {earlier.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-muted-foreground">{t("creator.earlier")}</h2>
          <div className="divide-y divide-separator overflow-hidden rounded-2xl border bg-white shadow-xs">
            {earlier.map((a) => <EarlierRow key={a.id} a={a} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function CalendarIcon() {
  return <Clock className="h-6 w-6" />;
}

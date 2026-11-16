import { useState } from "react";
import { WarmupLock } from "./Warmup";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Download, ExternalLink, Pencil, Lightbulb, Link2, Play, Quote, Send, Sparkles, XCircle } from "lucide-react";
import { publicUrl, supabase } from "@/lib/supabase";
import { Button, Spinner, useToast } from "@/components/ui";
import { formatMoney } from "@shared/zones.ts";
import { cn } from "@/lib/utils";
import { playSources } from "@shared/playback.ts";
import { VideoSurface } from "@/components/video/VideoSurface";
import { guideText } from "@/i18n/guide";
import { PremiumAccess } from "@/components/creator/PremiumAccess";
import { READ_ONLY_HINT, todayIso, useCreatorIdentity, useMyPoster } from "./shared";

interface RefVideo { id: string; url: string | null; thumbnail_path: string | null; thumbnail_src: string | null; video_path: string | null; video_src?: string | null; external_id?: string | null; caption: string | null; platform: string }
interface BriefFile { id: string; name: string; kind: string; path: string; mime: string | null; size_bytes: number | null }
interface Assignment {
  id: string; due_date: string; status: "todo" | "posted" | "validated" | "rejected" | "changes_requested"; posted_url: string | null; posted_url_instagram?: string | null; rejection_reason: string | null;
  briefs: { title: string; hook: string | null; instructions: string | null; reference_video_id: string | null;
    angle?: string | null; hook_variants?: string[] | null; caption?: string | null; hashtags?: string | null; post_time?: string | null; demo_notes?: string | null; app_access?: string | null;
    apps?: { name: string; pitch: Record<string, string> | null; ios_url: string | null; android_url: string | null } | null; videos: RefVideo | null; brief_assets?: { assets: BriefFile | null }[] } | null;
}

const STATUS = {
  todo: { cls: "bg-[#f1f3f7] text-muted-foreground", icon: Clock },
  posted: { cls: "bg-tint-blue text-[#0040d6]", icon: Send },
  validated: { cls: "bg-tint-green text-[#0b7a3c]", icon: CheckCircle2 },
  rejected: { cls: "bg-tint-red text-[#c42a2d]", icon: XCircle },
  changes_requested: { cls: "bg-tint-yellow text-[#8a5a00]", icon: Pencil },
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

/** Assets joints au brief (logo, captures, démo, son…) : aperçu et téléchargement depuis le téléphone. */
function BriefFiles({ files }: { files: BriefFile[] }) {
  const { t } = useTranslation();
  if (!files.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-subtle-foreground">{t("creator.assets")}</p>
      <ul className="space-y-2">
        {files.map((f) => {
          const url = publicUrl("brief-assets", f.path) ?? "";
          return (
            <li key={f.id} className="flex items-center gap-3 rounded-xl border bg-white p-2">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f1f3f7]">
                {f.mime?.startsWith("image/") ? <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" /> : f.mime?.startsWith("video/") ? <Play className="h-4 w-4 text-subtle-foreground" /> : <Download className="h-4 w-4 text-subtle-foreground" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{f.name}</span>
              <a href={`${url}?download=${encodeURIComponent(f.name)}`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-white"><Download className="h-3.5 w-3.5" />{t("creator.download")}</a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BriefCard({ a, index }: { a: Assignment; index: number }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const toast = useToast();
  const [url, setUrl] = useState(a.posted_url ?? "");
  const [ig, setIg] = useState(a.posted_url_instagram ?? "");
  const G = guideText(i18n.resolvedLanguage);
  const lang2 = (i18n.resolvedLanguage ?? "en").split("-")[0];
  const [busy, setBusy] = useState(false);
  const { readOnly } = useCreatorIdentity();
  const b = a.briefs;
  const submit = async () => {
    if (readOnly) return;
    setBusy(true);
    const { error } = await supabase.rpc("submit_post_links", { p_assignment: a.id, p_tiktok: url.trim(), p_instagram: ig.trim() });
    setBusy(false);
    if (error) toast(error.message, "danger");
    else {
      toast(t("creator.submitted"), "success");
      qc.invalidateQueries({ queryKey: ["my-assignments"] });
    }
  };
  const valid = /^https?:\/\/([a-z0-9-]+\.)*tiktok\.com\//i.test(url.trim()) && /^https?:\/\/([a-z0-9-]+\.)*instagram\.com\//i.test(ig.trim());
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
        {(b?.hook_variants ?? []).length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-subtle-foreground">{G.brief.hookVariants}</p>
            <ul className="space-y-1">{b!.hook_variants!.map((h) => <li key={h} className="text-[14px] font-medium text-foreground">« {h} »</li>)}</ul>
          </div>
        )}
        <BriefSection title={G.brief.content}>
          {b?.apps?.pitch && <p className="text-[14px] leading-relaxed text-foreground"><b>{G.brief.app} · {b.apps.name}</b> : {b.apps.pitch[lang2] ?? b.apps.pitch.en}</p>}
          {b?.angle && <p className="mt-2 text-[14px] text-foreground"><b>{G.brief.angle}</b> : {b.angle}</p>}
          <p className="mt-3 text-xs font-medium text-subtle-foreground">{G.brief.structure}</p>
          <ol className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-foreground">
            {G.brief.structureSteps.map((x, n) => <li key={x} className="flex items-center gap-1.5"><span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">{n + 1}. {x}</span>{n < 2 && <span className="text-subtle-foreground">→</span>}</li>)}
          </ol>
          {b?.videos && <p className="mt-3 rounded-lg bg-tint-yellow px-3 py-2 text-[13px] font-medium text-[#8a5a00]">♻️ {G.brief.recreate}</p>}
        </BriefSection>
        <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
          {b?.instructions && (
            <div className="order-2 sm:order-1">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-subtle-foreground"><Lightbulb className="h-3.5 w-3.5" /> {t("creator.instructions")}</p>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-foreground">{b.instructions}</p>
            </div>
          )}
          {b?.videos && <div className="order-1 sm:order-2 sm:w-[200px]"><Reference v={b.videos} /></div>}
        </div>
        <BriefSection title={G.brief.demo}>
          {(b?.apps?.ios_url || b?.apps?.android_url) && (
            <p className="flex flex-wrap items-center gap-2 text-[13px]"><span className="font-medium text-subtle-foreground">{G.brief.install} :</span>
              {b?.apps?.ios_url && <a className="rounded-full border px-2.5 py-1 font-medium text-foreground hover:bg-muted" href={b.apps.ios_url} target="_blank" rel="noopener noreferrer">App Store ↗</a>}
              {b?.apps?.android_url && <a className="rounded-full border px-2.5 py-1 font-medium text-foreground hover:bg-muted" href={b.apps.android_url} target="_blank" rel="noopener noreferrer">Google Play ↗</a>}
            </p>
          )}
          {b?.demo_notes && <p className="mt-2 text-[14px] text-foreground"><b>{G.brief.whatToFilm}</b> : {b.demo_notes}</p>}
          {b?.app_access && <p className="mt-2 text-[14px] text-foreground"><b>{G.brief.access}</b> : {b.app_access}</p>}
          <div className="mt-3"><PremiumAccess compact /></div>
          <div className="mt-3"><BriefFiles files={(b?.brief_assets ?? []).map((x) => x.assets).filter((x): x is BriefFile => !!x)} /></div>
        </BriefSection>
        <BriefSection title={G.brief.publish}>
          <p className="text-[14px] font-medium text-foreground">{G.brief.publishBoth}</p>
          {b?.caption && <CopyLine label={G.brief.caption} text={b.caption} copy={G.brief.copy} copied={G.brief.copied} />}
          {b?.hashtags && <CopyLine label={G.brief.hashtags} text={b.hashtags} copy={G.brief.copy} copied={G.brief.copied} />}
          <p className="mt-2 text-[13px] text-muted-foreground">{b?.post_time && <>{G.brief.time} : <b className="text-foreground">{b.post_time}</b> · </>}{G.brief.deadline.replace("{{date}}", new Date(`${a.due_date}T12:00:00Z`).toLocaleDateString(i18n.resolvedLanguage, { weekday: "long", day: "numeric", month: "long" }))}</p>
        </BriefSection>
        <details className="rounded-xl border border-border-strong px-4 py-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-foreground">{G.brief.format} · {G.brief.validation}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] text-foreground">{G.brief.formatShort.map((x) => <li key={x}>{x}</li>)}</ul>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-[13px] text-foreground">{G.guide.checks.map((x) => <li key={x}>{x}</li>)}</ol>
          <Link to="/creator/guide" className="mt-3 inline-block text-[13px] font-medium text-accent hover:underline">{G.brief.openGuide} →</Link>
        </details>

        {a.status === "rejected" && a.rejection_reason && (
          <div className="flex gap-2.5 rounded-xl bg-tint-red px-4 py-3 text-sm text-[#a52326]">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {t("creator.rejectedReason", { reason: a.rejection_reason })}
          </div>
        )}

        {a.status === "changes_requested" && (
          <div className="rounded-xl bg-tint-yellow px-4 py-3 text-sm text-[#8a5a00]">
            <p className="flex items-center gap-1.5 font-semibold"><Pencil className="h-4 w-4" /> {t("creator.feedback.verdict.changes_requested")}</p>
            {a.rejection_reason && <p className="mt-1 whitespace-pre-wrap text-[#5c3d00]">{a.rejection_reason}</p>}
            <p className="mt-1.5 text-xs">{t("creator.feedback.fixedHint")} <Link to="/creator/feedback" className="font-medium underline">{t("creator.nav.feedback")}</Link></p>
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
            <label className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> {G.brief.tiktokLink}</label>
            <input type="url" inputMode="url" placeholder="https://www.tiktok.com/@you/video/…" value={url} onChange={(e) => setUrl(e.target.value)} aria-label={G.brief.tiktokLink}
              className="h-12 w-full rounded-lg border border-border-strong bg-white px-3.5 text-[15px] placeholder:text-subtle-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10" />
            <label className="mb-1.5 mt-3 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> {G.brief.instagramLink}</label>
            <input type="url" inputMode="url" placeholder="https://www.instagram.com/reel/…" value={ig} onChange={(e) => setIg(e.target.value)} aria-label={G.brief.instagramLink}
              className="h-12 w-full rounded-lg border border-border-strong bg-white px-3.5 text-[15px] placeholder:text-subtle-foreground focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10" />
            <Button size="lg" className="mt-3 h-12 w-full" onClick={submit} loading={busy} disabled={readOnly || !valid || (url.trim() === (a.posted_url ?? "") && ig.trim() === (a.posted_url_instagram ?? ""))} title={readOnly ? READ_ONLY_HINT : undefined}>
              <Send className="h-4 w-4" /> {G.brief.submit}
            </Button>
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
        .select("id, due_date, status, posted_url, posted_url_instagram, rejection_reason, briefs(title, hook, instructions, reference_video_id, angle, hook_variants, caption, hashtags, post_time, demo_notes, app_access, apps(name, pitch, ios_url, android_url), videos(id, url, external_id, thumbnail_path, thumbnail_src, video_path, video_src, caption, platform), brief_assets(assets(id, name, kind, path, mime, size_bytes)))")
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
  const goal = z?.videos_per_day ?? 1;
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
        <WarmupLock />
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

function BriefSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-strong px-4 py-3.5">
      <p className="mb-2 text-[13px] font-semibold text-foreground">{title}</p>
      {children}
    </div>
  );
}

function CopyLine({ label, text, copy, copied }: { label: string; text: string; copy: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="mt-2">
      <p className="mb-1 text-xs font-medium text-subtle-foreground">{label}</p>
      <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2">
        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] text-foreground">{text}</p>
        <button className="shrink-0 text-xs font-medium text-accent" onClick={async () => { try { await navigator.clipboard.writeText(text); } catch { /* ignore */ } setDone(true); setTimeout(() => setDone(false), 1500); }}>{done ? copied : copy}</button>
      </div>
    </div>
  );
}

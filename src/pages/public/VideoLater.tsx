import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, Video } from "lucide-react";
import { callFn } from "@/lib/supabase";
import { Button, Spinner } from "@/components/ui";
import { Logo } from "@/components/brand/Logo";
import { landingJob } from "@/i18n/landingJob";
import { uiLangForCountry } from "@/i18n";
import { YapUpload } from "@/components/public/YapUpload";

/** /apply/video/<token> : candidature envoyée sans vidéo, ajout dans les 3 jours (lien personnel de l'email). */
export default function VideoLater() {
  const { token = "" } = useParams();
  const { t, i18n } = useTranslation();
  const lj = landingJob(i18n.resolvedLanguage);
  const info = useQuery({ queryKey: ["video-info", token], queryFn: () => callFn<any>("apply", { action: "video_info", token }), retry: false });
  const [v, setV] = useState<{ path: string | null; url: string | null }>({ path: null, url: null });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (info.data?.locale) i18n.changeLanguage(uiLangForCountry(info.data.locale)); }, [info.data?.locale]);
  const d = info.data;
  const date = d?.due_at ? new Date(d.due_at).toLocaleString(i18n.resolvedLanguage, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "";
  const restart = <Link to={`/apply/${String(d?.country ?? "").toLowerCase()}`}><Button size="lg" className="h-12 w-full">{lj.restart}</Button></Link>;

  const submit = async () => {
    setBusy(true); setErr(null);
    try { await callFn("apply", { action: "video_submit", token, yap_video_path: v.path, yap_video_url: v.path ? null : v.url }); setSent(true); }
    catch (e) { const m = (e as Error).message; setErr(m.includes("expired") ? lj.videoPageExpired : m.includes("yap_video_url") ? lj.yapLinkInvalid : lj.yapUploadFailed); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-full bg-[#f6f7f9]">
      <header className="border-b bg-white"><div className="mx-auto flex h-16 max-w-xl items-center px-5"><Logo className="h-[22px]" /></div></header>
      <main className="mx-auto max-w-xl px-5 py-8" data-testid="video-later-page">
        {info.isLoading ? <div className="flex justify-center py-20"><Spinner /></div>
          : info.isError ? <Card><p className="text-[15px] text-foreground">{lj.videoPageInvalid}</p></Card>
          : sent ? <Card><CheckCircle2 className="h-8 w-8 text-success" /><p className="mt-3 text-lg font-semibold text-foreground">{lj.videoPageSent}</p></Card>
          : d?.expired ? <Card><Clock className="h-8 w-8 text-[#c98a00]" /><p className="mt-3 text-[15px] text-foreground">{lj.videoPageExpired}</p><div className="mt-5">{restart}</div></Card>
          : (
            <Card>
              <h1 className="flex items-center gap-2 text-[22px] font-semibold tracking-[-0.02em] text-foreground"><Video className="h-5 w-5 text-accent" />{lj.videoPageTitle}</h1>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{lj.videoPageIntro.replace("{{name}}", d?.first_name ?? "").replace("{{date}}", date)}</p>
              <div className="mt-5">
                <YapUpload lj={lj} country={d?.country ?? null} onChange={setV}
                  labels={{ choose: t("apply.chooseVideo"), uploaded: t("apply.uploaded"), uploading: (pct) => t("apply.uploading", { pct }) }} />
              </div>
              {err && <p className="mt-3 text-sm text-danger" role="alert">{err}</p>}
              <Button size="lg" className="mt-5 h-12 w-full" loading={busy} disabled={!v.path && !v.url} onClick={submit}>{lj.videoPageSubmit}</Button>
            </Card>
          )}
      </main>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-3xl border bg-white p-6 shadow-xs">{children}</section>;
}

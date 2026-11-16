import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as tus from "tus-js-client";
import { CheckCircle2, Sparkles, Upload, User, Video } from "lucide-react";
import { ANON_KEY, SUPABASE_URL, callFn } from "@/lib/supabase";
import { usePixel } from "@/lib/usePixel";
import { attribution, newEventId, track } from "@/lib/pixel";
import { ConsentBanner } from "@/components/public/ConsentBanner";
import { Button, Field, IconTile, Input, Select, Spinner, Textarea, type Tint } from "@/components/ui";
import { uiLangForCountry } from "@/i18n";
import { ageOn } from "@shared/zones.ts";
import { flag } from "@/lib/utils";
import { LangSwitcher, keptParams, useOpenCountries } from "./Landing";
import { Logo } from "@/components/brand/Logo";

const MAX_BYTES = 200 * 1024 * 1024;
const BRAND = "Vik Studios";

type Form = {
  first_name: string; last_name: string; birthdate: string; email: string; phone: string; country: string; languages: string;
  ugc_experience: string; tiktok_url: string; tiktok_followers: string; instagram_url: string; instagram_followers: string;
  equipment: string; availability: string; motivation: string; website: string; adult: boolean; consent: boolean;
};

export default function Apply() {
  const { country: param } = useParams();
  const [params] = useSearchParams();
  const pixel = usePixel(params, "apply");
  const { t, i18n } = useTranslation();
  const { data: countries, isLoading } = useOpenCountries();
  const open = useMemo(() => (countries ?? []).filter((c) => c.open && c.zone_code), [countries]);
  const [f, setF] = useState<Form>({
    first_name: "", last_name: "", birthdate: "", email: "", phone: "", country: (param ?? "").toUpperCase(), languages: "",
    ugc_experience: "", tiktok_url: "", tiktok_followers: "", instagram_url: "", instagram_followers: "",
    equipment: "", availability: "", motivation: "", website: "", adult: false, consent: false,
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const [yapPath, setYapPath] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const c = countries?.find((x) => x.code === f.country);
    if (c && !params.get("lang")) i18n.changeLanguage(uiLangForCountry(c.language));
  }, [countries, param]);

  const upload = (file: File) => {
    setUploadError(null);
    setYapPath(null);
    if (!file.type.startsWith("video/")) return setUploadError(t("apply.errors.yap_video"));
    if (file.size > MAX_BYTES) return setUploadError(t("apply.yapHint"));
    const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safeExt = ["mp4", "mov", "webm", "m4v"].includes(ext) ? ext : "mp4";
    const objectName = `pending/${crypto.randomUUID()}.${safeExt}`;
    uploadRef.current?.abort();
    const up = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY, "x-upsert": "false" },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: { bucketName: "yap-videos", objectName, contentType: file.type || "video/mp4", cacheControl: "3600" },
      chunkSize: 6 * 1024 * 1024,
      onError: (e) => { setProgress(null); setUploadError(e.message); },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => { setProgress(100); setYapPath(objectName); },
    });
    uploadRef.current = up;
    setProgress(0);
    up.findPreviousUploads().then((prev) => {
      if (prev.length) up.resumeFromPreviousUpload(prev[0]);
      up.start();
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (f.birthdate && ageOn(f.birthdate) < 18) errs.push("underage");
    if (!yapPath) errs.push("yap_video");
    if (errs.length) return setErrors(errs);
    setBusy(true);
    setErrors([]);
    const utm: Record<string, string> = {};
    params.forEach((v, k) => { if (k.startsWith("utm_")) utm[k] = v; });
    // Même event_id pour le pixel (navigateur) et la Conversions API (serveur) : Meta déduplique.
    const eventId = newEventId();
    try {
      await callFn("apply", {
        action: "submit", ...f,
        tiktok_followers: f.tiktok_followers ? Number(f.tiktok_followers) : null,
        instagram_followers: f.instagram_followers ? Number(f.instagram_followers) : null,
        languages: f.languages.split(",").map((s) => s.trim()).filter(Boolean),
        yap_video_path: yapPath, locale: i18n.resolvedLanguage ?? "en", utm,
        tracking: attribution(eventId),
      });
      track("Lead", { content_name: "ugc_creator_application", country: f.country }, eventId);
      setDone(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setErrors(String((err as Error).message).split(",").map((s) => s.trim()));
    } finally {
      setBusy(false);
    }
  };

  const errText = (code: string) => {
    const known = ["underage", "already_applied", "yap_video", "country_closed"];
    return known.includes(code) ? t(`apply.errors.${code}`) : code === "yap_video_missing" ? t("apply.errors.yap_video") : null;
  };
  const messages = [...new Set(errors.map((c) => errText(c) ?? t("apply.errors.generic")))];
  const underage = !!f.birthdate && /^\d{4}-\d{2}-\d{2}$/.test(f.birthdate) && ageOn(f.birthdate) < 18;

  return (
    <div className="min-h-full bg-white">
      <ConsentBanner enabled={pixel.enabled} />
      <header className="sticky top-0 z-30 border-b border-separator bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-5">
        <Link to={`/join/${f.country.toLowerCase()}${keptParams(params)}`} className="inline-flex"><Logo className="h-[22px]" /></Link>
        <LangSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-8 sm:pt-12">
        {done ? (
          <div className="rounded-3xl border bg-white px-6 py-14 text-center shadow-xs">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-tint-green text-success"><CheckCircle2 className="h-7 w-7" /></span>
            <p className="mx-auto mt-5 max-w-md text-lg font-semibold text-foreground">{t("apply.success")}</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="mb-8">
              <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">{t("apply.title")}</h1>
              <p className="mt-2 text-[15px] text-muted-foreground">{t("apply.subtitle")}</p>
            </div>
            <FormSection n={1} icon={<User />} tint="blue" title={t("apply.identity")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("apply.firstName")}><Input required maxLength={80} value={f.first_name} onChange={(e) => set("first_name", e.target.value)} autoComplete="given-name" /></Field>
                <Field label={t("apply.lastName")}><Input required maxLength={80} value={f.last_name} onChange={(e) => set("last_name", e.target.value)} autoComplete="family-name" /></Field>
                <Field label={t("apply.birthdate")} hint={underage ? <span className="text-danger">{t("apply.errors.underage")}</span> : undefined}>
                  <Input type="date" required value={f.birthdate} onChange={(e) => set("birthdate", e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                </Field>
                <Field label={t("apply.country")}>
                  <Select required value={f.country} onChange={(e) => set("country", e.target.value)}>
                    <option value="" disabled>—</option>
                    {open.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
                  </Select>
                </Field>
                <Field label={t("apply.email")}><Input type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" /></Field>
                <Field label={t("apply.phone")}><Input type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" /></Field>
                <Field label={t("apply.languages")} hint={t("apply.languagesHint")} className="sm:col-span-2"><Input value={f.languages} onChange={(e) => set("languages", e.target.value)} /></Field>
              </div>
            </FormSection>
            <FormSection n={2} icon={<Sparkles />} tint="violet" title={t("apply.experience")}>
              <Field label={t("apply.ugcExperience")}><Textarea maxLength={2000} value={f.ugc_experience} onChange={(e) => set("ugc_experience", e.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                <Field label={t("apply.tiktok")}><Input type="url" placeholder="https://www.tiktok.com/@…" value={f.tiktok_url} onChange={(e) => set("tiktok_url", e.target.value)} /></Field>
                <Field label={t("apply.tiktokFollowers")}><Input type="number" min={0} value={f.tiktok_followers} onChange={(e) => set("tiktok_followers", e.target.value)} /></Field>
                <Field label={t("apply.instagram")}><Input type="url" placeholder="https://www.instagram.com/…" value={f.instagram_url} onChange={(e) => set("instagram_url", e.target.value)} /></Field>
                <Field label={t("apply.instagramFollowers")}><Input type="number" min={0} value={f.instagram_followers} onChange={(e) => set("instagram_followers", e.target.value)} /></Field>
              </div>
              <Field label={t("apply.equipment")}><Input maxLength={1000} value={f.equipment} onChange={(e) => set("equipment", e.target.value)} /></Field>
              <Field label={t("apply.availability")}><Input maxLength={1000} value={f.availability} onChange={(e) => set("availability", e.target.value)} /></Field>
              <Field label={t("apply.motivation")}><Textarea maxLength={2000} value={f.motivation} onChange={(e) => set("motivation", e.target.value)} /></Field>
            </FormSection>
            <FormSection n={3} icon={<Video />} tint="cyan" title={t("apply.yap")} hint={t("apply.yapHint")}>
              <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${yapPath ? "border-[#bfe8cd] bg-tint-green" : "border-border-strong bg-muted hover:border-[#cddcff] hover:bg-accent-soft"}`}>
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${yapPath ? "bg-white text-success" : "bg-white text-accent shadow-xs"}`}>{yapPath ? <CheckCircle2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}</span>
                <span className="text-sm font-semibold text-foreground">{yapPath ? t("apply.uploaded") : t("apply.chooseVideo")}</span>
                <span className="text-xs text-subtle-foreground">MP4 · MOV · ≤ 200 MB</span>
                <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
              {progress !== null && !yapPath && (
                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#f1f3f7]"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div>
                  <p className="mt-1 text-xs text-muted-foreground">{t("apply.uploading", { pct: progress })}</p>
                </div>
              )}
              {uploadError && <p className="text-sm text-danger">{uploadError}</p>}
            </FormSection>
            {/* Pot de miel anti-bot */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" value={f.website} onChange={(e) => set("website", e.target.value)} aria-hidden="true" />
            <div className="space-y-3 rounded-2xl border bg-white p-5 shadow-xs sm:p-6">
              <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground"><input type="checkbox" required className="mt-0.5 h-4 w-4 accent-[#004dff]" checked={f.adult} onChange={(e) => set("adult", e.target.checked)} /> {t("apply.adult")}</label>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground"><input type="checkbox" required className="mt-0.5 h-4 w-4 accent-[#004dff]" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} /> {t("apply.consent", { brand: BRAND })}</label>
            </div>
            {messages.length > 0 && <div className="rounded-xl bg-tint-red px-4 py-3 text-sm text-[#a52326]">{messages.map((m) => <p key={m}>{m}</p>)}</div>}
            <Button type="submit" size="lg" className="h-12 w-full text-[15px]" loading={busy} disabled={underage || (progress !== null && !yapPath)}>{t("apply.submit")}</Button>
          </form>
        )}
      </main>
    </div>
  );
}

function FormSection({ n, icon, tint, title, hint, children }: { n: number; icon: React.ReactNode; tint: Tint; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-xs sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <IconTile icon={icon} tint={tint} className="h-10 w-10 rounded-xl" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-subtle-foreground">{n} / 3</p>
          <h2 className="text-[16px] font-semibold text-foreground">{title}</h2>
          {hint && <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

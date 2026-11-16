import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { usePixel } from "@/lib/usePixel";
import { companyLine } from "@/lib/company";
import { landingJob, fillVars } from "@/i18n/landingJob";
import { JobWarning } from "@/components/public/JobWarning";
import { ConsentBanner } from "@/components/public/ConsentBanner";
import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarCheck, Check, ClipboardList, Globe2, Heart, MessageCircle, PenLine, Play, Plus, Share2, ShieldCheck, Smartphone, TrendingUp, Video, Wallet } from "lucide-react";
import { publicUrl, supabase } from "@/lib/supabase";
import { Button, IconTile, Select, Spinner, type Tint } from "@/components/ui";
import { LANGS, uiLangForCountry } from "@/i18n";
import { formatMoney, type ZoneRow } from "@shared/zones.ts";
import { cn, flag } from "@/lib/utils";
import { countryName } from "@shared/cardCopy.ts";
import { Logo } from "@/components/brand/Logo";

interface CountryWithZone {
  code: string;
  name: string;
  language: string;
  open: boolean;
  zone_code: string | null;
  zones: ZoneRow | null;
}

export function useOpenCountries() {
  return useQuery({
    queryKey: ["public-countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("code, name, language, open, zone_code, zones(code, price_per_video, rpm, rpm_views, currency, videos_per_day, bonus_cap, active)").order("name");
      return (data ?? []) as unknown as CountryWithZone[];
    },
  });
}

/** Paramètres à conserver d'une page publique à l'autre (lang + utm_*). */
export function keptParams(params: URLSearchParams): string {
  const out = new URLSearchParams();
  params.forEach((v, k) => {
    if (k === "lang" || k === "fbclid" || k.startsWith("utm_")) out.set(k, v);
  });
  const s = out.toString();
  return s ? `?${s}` : "";
}

export function LangSwitcher() {
  const { i18n } = useTranslation();
  return (
    <select aria-label="Language" value={i18n.resolvedLanguage} onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="h-8 cursor-pointer rounded-full border border-border-strong bg-white px-3 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none">
      {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  );
}

const BRAND = "Vik Studios";

export default function Landing() {
  const { country: param } = useParams();
  const [params] = useSearchParams();
  const pixel = usePixel(params, "landing");
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: countries, isLoading } = useOpenCountries();
  const code = (param ?? "").toUpperCase();
  const country = countries?.find((c) => c.code === code) ?? null;
  const zone = country?.zones ?? null;
  const open = !!country && country.open && !!zone && zone.active !== false;
  const kept = keptParams(params);

  useEffect(() => {
    if (country && !params.get("lang")) i18n.changeLanguage(uiLangForCountry(country.language));
  }, [country?.code]);

  const lang = i18n.resolvedLanguage ?? "en";
  const lj = landingJob(lang);
  const price = zone ? formatMoney(Number(zone.price_per_video), zone.currency, lang) : "";
  const steps = t("landing.steps", { returnObjects: true }) as unknown as string[][];
  // Textes surchargés pour ce pays et cette langue (Réglages → Contenus & aperçus → Landing).
  const overrides = useQuery({
    queryKey: ["landing-overrides", code, lang],
    enabled: !!code,
    queryFn: async () => {
      const { data } = await supabase.from("landing_overrides").select("key, value").eq("country_code", code).eq("language", lang.split("-")[0]);
      return Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value])) as Record<string, string>;
    },
  });
  const ov = overrides.data ?? {};
  /** Texte i18n, ou sa surcharge (mêmes variables {{brand}}, {{price}}…). */
  const tt = (key: string, vars: Record<string, string> = {}): string =>
    ov[key] ? ov[key].replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => vars[k] ?? m) : (t(key, vars) as string);
  // Titre au format offre d'emploi (16/11) ; une surcharge admin reste prioritaire.
  const heroTitle = ov["landing.title"] ? tt("landing.title", { brand: BRAND }) : lj.heroTitle;
  const heroSubtitle = ov["landing.subtitle"] ? tt("landing.subtitle", { price }) : lj.heroSubtitle;
  const faqs = [[lj.faqIphoneQ, lj.faqIphoneA], ...(t("landing.faqs", { returnObjects: true }) as unknown as string[][]).map(([q, a], i) =>
    [ov[`landing.faq.${i}.q`] ?? q, ov[`landing.faq.${i}.a`] ?? a])];
  const openCountries = useMemo(() => (countries ?? []).filter((c) => c.open && c.zone_code).sort((a, b) => countryName(a.code, lang).localeCompare(countryName(b.code, lang), lang)), [countries, lang]);
  const applyHref = `/apply/${code.toLowerCase()}${kept}`;

  const selector = (
    <Select aria-label={t("landing.country")} value={code} className="h-12 w-full rounded-lg sm:w-auto sm:min-w-52"
      onChange={(e) => nav(`/join/${e.target.value.toLowerCase()}${kept}`)}>
      <option value="" disabled>{t("landing.country")}</option>
      {openCountries.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {countryName(c.code, lang)}</option>)}
    </Select>
  );

  const stepIcons = [ClipboardList, PenLine, Video, Wallet];
  const stepTints = ["blue", "violet", "cyan", "green"] as const;
  const rpm = formatMoney(Number(zone?.rpm ?? 0), zone?.currency ?? "USD", lang);

  return (
    <div className="min-h-full bg-white">
      <ConsentBanner enabled={pixel.enabled} />
      <header className="sticky top-0 z-30 border-b border-transparent bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo className="h-[22px] sm:h-6" />
          <div className="flex items-center gap-2">
            <LangSwitcher />
            {open && <Link to={applyHref} className="hidden sm:block"><Button size="sm">{tt("landing.cta")}</Button></Link>}
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-32"><Spinner /></div>
      ) : !open ? (
        <section className="mx-auto max-w-xl px-6 py-24 text-center">
          <span className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-tint-blue text-accent"><Globe2 className="h-6 w-6" /></span>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-foreground">{tt("landing.badge")}</h1>
          <p className="mt-3 text-muted-foreground">{code ? t("landing.closed") : t("landing.country")}</p>
          <div className="mt-8 flex justify-center">{selector}</div>
        </section>
      ) : (
        <>
          {/* Hero */}
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,#eef3ff,transparent)]" />
            <div className="pointer-events-none absolute -left-32 top-64 h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,#f3edff,transparent)]" />
            <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:pb-24">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe5ff] bg-white px-3 py-1 text-xs font-medium text-[#0040d6] shadow-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> {tt("landing.badge")} · {flag(country!.code)} {countryName(country!.code, lang)}
                </span>
                <h1 className="mt-6 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground sm:text-5xl lg:text-[56px]">{heroTitle}</h1>
                <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">{heroSubtitle}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link to={applyHref}><Button size="lg" className="h-12 w-full px-7 text-[15px] sm:w-auto">{tt("landing.cta")} <ArrowRight className="h-4 w-4" /></Button></Link>
                  {selector}
                </div>
                <div className="mt-10 grid grid-cols-3 gap-3 sm:max-w-xl">
                  <PriceCard tint="blue" icon={<Video />} value={price} label={t("landing.perVideo")} />
                  <PriceCard tint="violet" icon={<TrendingUp />} value={`+${rpm}`} label={t("landing.bonusDetail", { rpm, views: new Intl.NumberFormat(lang).format(zone!.rpm_views) })} />
                  <PriceCard tint="green" icon={<Wallet />} value={formatMoney(Number(zone!.bonus_cap ?? 0), zone!.currency, lang)} label={lj.payCap} />
                </div>
              </div>
              <div className="relative hidden h-[520px] lg:block">
                <Phone className="absolute left-4 top-12 rotate-[-5deg]" grad="from-[#8c43ff] to-[#1fafff]" tag="POV" caption="POV: you studied 2h instead of 6h" />
                <Phone className="absolute right-4 top-0 z-10 rotate-[4deg]" grad="from-[#004dff] to-[#1fafff]" tag="Tuto" caption="3 study hacks I wish I knew" />
                <div className="absolute bottom-10 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-[0_16px_40px_-12px_rgba(16,24,40,0.25)]">
                  <IconTile icon={<Wallet />} tint="green" className="h-10 w-10 rounded-xl" />
                  <div>
                    <p className="tabular text-lg font-semibold leading-tight text-foreground">+{formatMoney(Number(zone!.price_per_video) * 2, zone!.currency, lang)}</p>
                    <p className="text-xs text-muted-foreground">2 × {t("landing.perVideo")}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Étapes */}
          <section className="border-t border-separator">
            <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">{t("landing.how")}</h2>
              <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map(([title, text], i) => {
                  const Icon = stepIcons[i] ?? Check;
                  return (
                    <li key={i} className="rounded-2xl border bg-white p-6 shadow-xs">
                      <div className="flex items-center justify-between">
                        <IconTile icon={<Icon />} tint={stepTints[i] ?? "blue"} className="h-10 w-10 rounded-xl" />
                        <span className="tabular text-xs font-semibold text-subtle-foreground">0{i + 1}</span>
                      </div>
                      <p className="mt-5 text-[15px] font-semibold text-foreground">{title}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          {/* Le job (16/11) : vidéos, exemples de la bibliothèque, rythme, simulateur */}
          <section id="job" className="border-t border-separator">
            <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">{lj.jobTitle}</h2>
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border bg-white p-6 shadow-xs">
                  <IconTile icon={<Smartphone />} tint="blue" className="h-10 w-10 rounded-xl" />
                  <p className="mt-4 text-[15px] font-semibold text-foreground">{lj.videosTitle}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{lj.videosText}</p>
                </div>
                <div className="rounded-2xl border bg-white p-6 shadow-xs">
                  <IconTile icon={<CalendarCheck />} tint="violet" className="h-10 w-10 rounded-xl" />
                  <p className="mt-4 text-[15px] font-semibold text-foreground">{lj.dailyTitle}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{lj.dailyText}</p>
                </div>
                <div className="rounded-2xl border-2 border-[#dbe5ff] bg-white p-6 shadow-xs lg:col-span-2" data-testid="iphone-required">
                  <IconTile icon={<Smartphone />} tint="cyan" className="h-10 w-10 rounded-xl" />
                  <p className="mt-4 text-[15px] font-semibold text-foreground"> {lj.iphoneTitle}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{lj.iphoneText}</p>
                </div>
              </div>
              <h3 className="mt-12 text-lg font-semibold text-foreground">{lj.examplesTitle}</h3>
              <JobExamples lang={lang} />
              <PaySimulator countries={openCountries} initial={code} lang={lang} />
            </div>
          </section>

          {/* FAQ */}
          <section className="border-t border-separator">
            <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">{t("landing.faq")}</h2>
              <div className="mt-8 divide-y divide-separator rounded-2xl border bg-white shadow-xs">
                {faqs.map(([q, a], i) => (
                  <details key={i} className="group px-5 py-4 sm:px-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-foreground">
                      {q}<span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f1f3f7] text-muted-foreground transition-transform group-open:rotate-45"><Plus className="h-3.5 w-3.5" /></span>
                    </summary>
                    <p className="mt-2 pr-8 text-sm leading-relaxed text-muted-foreground">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* CTA final */}
          <section className="px-5 pb-16 sm:px-8 sm:pb-24">
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 rounded-3xl bg-tint-blue px-6 py-12 text-center sm:py-16">
              <h2 className="max-w-2xl text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">{heroTitle}</h2>
              <p className="max-w-xl text-muted-foreground">{heroSubtitle}</p>
              <Link to={applyHref}><Button size="lg" className="h-12 px-7 text-[15px]">{tt("landing.cta")} <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
            <JobWarning lang={lang} className="mx-auto mt-8 max-w-6xl" />
          </section>
        </>
      )}
      <footer className="border-t border-separator px-5 py-8 pb-28 text-center text-xs text-subtle-foreground sm:pb-8">© {new Date().getFullYear()} {BRAND} · <Link to="/privacy" className="hover:underline">Privacy</Link> · <Link to="/terms" className="hover:underline">Terms</Link><br /><span className="mt-1 inline-block">{companyLine()}</span></footer>

      {/* CTA collant mobile */}
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-md sm:hidden">
          <Link to={applyHref}><Button size="lg" className="h-12 w-full text-[15px]">{tt("landing.cta")} · {fillVars(lj.pricePerVideo, { price })}</Button></Link>
        </div>
      )}
    </div>
  );
}

function PriceCard({ tint, icon, value, label }: { tint: Tint; icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border bg-white p-3.5 shadow-xs sm:p-4">
      <IconTile icon={icon} tint={tint} className="h-8 w-8" />
      <p className="tabular mt-3 text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}

function Phone({ grad, tag, caption, className, small, fluid }: { grad: string; tag: string; caption: string; className?: string; small?: boolean; fluid?: boolean }) {
  return (
    <div className={cn(fluid ? "mx-auto w-full max-w-[230px]" : small ? "w-[190px]" : "w-[230px]", className)}>
      <div className={`relative aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${grad} p-1.5 shadow-[0_24px_48px_-16px_rgba(16,24,40,0.28)] ring-1 ring-black/5`}>
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
        <span className="absolute left-3 top-3 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm sm:left-4 sm:top-4">{tag}</span>
        <div className="absolute bottom-3 right-3 flex flex-col items-center gap-2 text-white/90 sm:bottom-14 sm:right-3.5">
          <Heart className="hidden h-5 w-5 fill-white/90 sm:block" /><MessageCircle className="hidden h-5 w-5 sm:block" /><Share2 className="hidden h-5 w-5 sm:block" />
        </div>
        <p className="absolute inset-x-3 bottom-3 pr-6 text-[11px] font-semibold leading-snug text-white drop-shadow sm:inset-x-4 sm:bottom-4 sm:text-sm sm:pr-10">{caption}</p>
      </div>
    </div>
  );
}

const CATEGORY_LABEL: Record<string, string> = { "Yapping / face cam": "Face cam", "Réaction": "Reaction", "Liste / top": "Top", "Avant / après": "Before / after" };

/** 3–4 vidéos de la bibliothèque compatibles Micabo (une par catégorie), ouvertes sur TikTok. */
function JobExamples({ lang }: { lang: string }) {
  const { data } = useQuery({
    queryKey: ["job-examples", lang.split("-")[0]],
    queryFn: async () => {
      const { data } = await supabase.rpc("public_job_examples", { p_language: lang.split("-")[0], p_limit: 4 });
      return (data ?? []) as { id: string; url: string | null; thumbnail_path: string | null; thumbnail_src: string | null; category: string | null }[];
    },
    staleTime: 3600_000,
  });
  if (!data?.length) return (
    <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-8">
      <Phone grad="from-[#8c43ff] to-[#1fafff]" tag="POV" caption="POV: you studied 2h instead of 6h" fluid />
      <Phone grad="from-[#004dff] to-[#1fafff]" tag="Tuto" caption="3 study hacks I wish I knew" fluid />
      <Phone grad="from-[#ffbb43] to-[#fe504f]" tag="Face cam" caption="Okay this app saved my exam…" fluid />
    </div>
  );
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">
      {data.map((v) => {
        const thumb = publicUrl("thumbnails", v.thumbnail_path) ?? v.thumbnail_src;
        return (
          <a key={v.id} href={v.url ?? undefined} target="_blank" rel="noopener noreferrer" className="group relative block aspect-[9/16] overflow-hidden rounded-2xl bg-[#0b0b0f] shadow-xs">
            {thumb && <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />}
            <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-foreground">{CATEGORY_LABEL[v.category ?? ""] ?? v.category ?? "UGC"}</span>
            <span className="absolute bottom-3 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-white/90 text-foreground"><Play className="ml-0.5 h-4 w-4 fill-current" /></span>
          </a>
        );
      })}
    </div>
  );
}

/** « Voir ma rémunération » : pays (pré-rempli par l'URL) → zone, prix par vidéo validée, RPM, plafond, exemple neutre. Aucune promesse mensuelle. */
function PaySimulator({ countries, initial, lang }: { countries: CountryWithZone[]; initial: string; lang: string }) {
  const lj = landingJob(lang);
  const [code, setCode] = useState(initial);
  useEffect(() => setCode(initial), [initial]);
  const c = countries.find((x) => x.code === code) ?? countries.find((x) => x.code === initial);
  const z = c?.zones;
  if (!c || !z) return null;
  const money = (n: number) => formatMoney(n, z.currency, lang);
  const views = 10000;
  const bonus = Math.min((views / (z.rpm_views || 1000)) * Number(z.rpm), Number(z.bonus_cap ?? Infinity));
  const nf = new Intl.NumberFormat(lang);
  const rows: [React.ReactNode, string, string][] = [
    [<Video key="v" />, lj.payPerVideo, money(Number(z.price_per_video))],
    [<TrendingUp key="r" />, lj.payRpm, fillVars(lj.payRpmDetail, { rpm: money(Number(z.rpm)) })],
    [<ShieldCheck key="c" />, lj.payCap, money(Number(z.bonus_cap ?? 0))],
  ];
  return (
    <div id="pay" className="mt-12 rounded-3xl border-2 border-[#dbe5ff] bg-[#f6f9ff] p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-xl font-semibold tracking-[-0.01em] text-foreground sm:text-2xl">{lj.payTitle}</h3>
        <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">{lj.payCountry}
          <Select aria-label={lj.payCountry} value={c.code} onChange={(e) => setCode(e.target.value)} className="h-11 w-full rounded-lg bg-white sm:min-w-56">
            {countries.map((x) => <option key={x.code} value={x.code}>{flag(x.code)} {countryName(x.code, lang)}</option>)}
          </Select>
        </label>
      </div>
      <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0040d6] shadow-xs">{fillVars(lj.payZone, { zone: z.code })} · {flag(c.code)} {countryName(c.code, lang)}</span>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {rows.map(([icon, label, value]) => (
          <div key={label} className="rounded-2xl border bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>{label}</div>
            <p className="tabular mt-2 text-lg font-semibold text-foreground">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-[15px] font-medium text-foreground shadow-xs">
        {fillVars(lj.payExample, { views: nf.format(views), base: money(Number(z.price_per_video)), bonus: money(Math.round(bonus * 100) / 100) })}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{lj.payNote}</p>
    </div>
  );
}

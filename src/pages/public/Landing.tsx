import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Select, Spinner } from "@/components/ui";
import { LANGS, uiLangForCountry } from "@/i18n";
import { formatMoney, monthlyEstimate, rpmLabel, type ZoneRow } from "@shared/zones.ts";
import { flag } from "@/lib/utils";

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
      const { data } = await supabase.from("countries").select("code, name, language, open, zone_code, zones(code, price_per_video, rpm, rpm_views, currency, videos_per_day, active)").order("name");
      return (data ?? []) as unknown as CountryWithZone[];
    },
  });
}

/** Paramètres à conserver d'une page publique à l'autre (lang + utm_*). */
export function keptParams(params: URLSearchParams): string {
  const out = new URLSearchParams();
  params.forEach((v, k) => {
    if (k === "lang" || k.startsWith("utm_")) out.set(k, v);
  });
  const s = out.toString();
  return s ? `?${s}` : "";
}

export function LangSwitcher() {
  const { i18n } = useTranslation();
  return (
    <select aria-label="Language" value={i18n.resolvedLanguage} onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="h-8 rounded-md border bg-card px-2 text-xs">
      {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  );
}

const BRAND = "Vik Studios";

export default function Landing() {
  const { country: param } = useParams();
  const [params] = useSearchParams();
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
  const price = zone ? formatMoney(Number(zone.price_per_video), zone.currency, lang) : "";
  const steps = t("landing.steps", { returnObjects: true }) as unknown as string[][];
  const faqs = t("landing.faqs", { returnObjects: true }) as unknown as string[][];
  const openCountries = useMemo(() => (countries ?? []).filter((c) => c.open && c.zone_code), [countries]);
  const applyHref = `/apply/${code.toLowerCase()}${kept}`;

  const selector = (
    <Select aria-label={t("landing.country")} value={code} className="w-auto min-w-48"
      onChange={(e) => nav(`/join/${e.target.value.toLowerCase()}${kept}`)}>
      <option value="" disabled>{t("landing.country")}</option>
      {openCountries.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
    </Select>
  );

  return (
    <div className="min-h-full bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-base font-semibold tracking-tight">{BRAND}</span>
        <div className="flex items-center gap-2"><LangSwitcher /></div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-32"><Spinner /></div>
      ) : !open ? (
        <section className="mx-auto max-w-xl px-6 py-24 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{t("landing.badge")}</h1>
          <p className="mt-4 text-muted-foreground">{code ? t("landing.closed") : t("landing.country")}</p>
          <div className="mt-8 flex justify-center">{selector}</div>
        </section>
      ) : (
        <>
          <section className="mx-auto max-w-5xl px-6 pb-20 pt-10 sm:pt-20">
            <Badge tone="accent">{t("landing.badge")} · {flag(country!.code)} {country!.name}</Badge>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{t("landing.title", { brand: BRAND })}</h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">{t("landing.subtitle", { price })}</p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to={applyHref}><Button size="lg">{t("landing.cta")} <ArrowRight className="h-4 w-4" /></Button></Link>
              {selector}
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border bg-card p-6">
                <p className="text-3xl font-semibold">{price}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("landing.perVideo")}</p>
              </div>
              <div className="rounded-xl border bg-card p-6">
                <p className="text-3xl font-semibold">+{rpmLabel(zone!, lang).split(" / ")[0]}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("landing.bonus")} · {t("landing.bonusDetail", { rpm: formatMoney(Number(zone!.rpm), zone!.currency, lang), views: new Intl.NumberFormat(lang).format(zone!.rpm_views) })}</p>
              </div>
              <div className="rounded-xl border bg-card p-6">
                <p className="text-3xl font-semibold">{t("landing.monthly", { amount: formatMoney(monthlyEstimate({ ...zone!, price_per_video: Number(zone!.price_per_video) }), zone!.currency, lang) })}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("landing.monthlyHint")}</p>
              </div>
            </div>
          </section>

          <section className="border-t bg-muted/40">
            <div className="mx-auto max-w-5xl px-6 py-20">
              <h2 className="text-2xl font-semibold tracking-tight">{t("landing.how")}</h2>
              <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map(([title, text], i) => (
                  <li key={i}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">{i + 1}</span>
                    <p className="mt-4 font-medium">{title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-2xl font-semibold tracking-tight">{t("landing.examples")}</h2>
            <div className="mt-10 grid grid-cols-3 gap-4 sm:gap-8">
              {[
                ["POV", "POV: you studied 2h instead of 6h", "from-violet-500/80 to-fuchsia-400/70"],
                ["Tuto", "3 study hacks I wish I knew", "from-sky-500/80 to-emerald-400/70"],
                ["Face cam", "Okay this app saved my exam…", "from-amber-500/80 to-rose-400/70"],
              ].map(([tag, caption, grad]) => (
                <div key={tag} className="mx-auto w-full max-w-[220px]">
                  <div className={`relative aspect-[9/16] overflow-hidden rounded-[1.6rem] border-4 border-foreground/80 bg-gradient-to-br ${grad} shadow-lg`}>
                    <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white">{tag}</span>
                    <p className="absolute inset-x-3 bottom-4 text-xs font-semibold leading-snug text-white drop-shadow sm:text-sm">{caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border-t">
            <div className="mx-auto max-w-3xl px-6 py-20">
              <h2 className="text-2xl font-semibold tracking-tight">{t("landing.faq")}</h2>
              <div className="mt-8 divide-y rounded-xl border bg-card">
                {faqs.map(([q, a], i) => (
                  <details key={i} className="group px-5 py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                      {q}<span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-2 text-sm text-muted-foreground">{a}</p>
                  </details>
                ))}
              </div>
              <div className="mt-12 flex flex-col items-center gap-3 text-center">
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-success" /> {t("landing.subtitle", { price })}</p>
                <Link to={applyHref}><Button size="lg">{t("landing.cta")} <ArrowRight className="h-4 w-4" /></Button></Link>
              </div>
            </div>
          </section>
        </>
      )}
      <footer className="border-t py-8 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} {BRAND}</footer>
    </div>
  );
}

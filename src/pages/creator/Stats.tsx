import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BarChart3, Eye, Film, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { IconTile, Spinner } from "@/components/ui";

interface Row { id: string; posted_url: string | null; posted_at: string | null; views_d2: number | null; views_d7: number | null; last_views: number | null; briefs: { title: string } | null }

const EMPTY: Record<string, string> = {
  en: "Your views appear here after your first posted video (measured at D+2 and D+7).",
  fr: "Tes vues apparaissent ici après ta première vidéo postée (mesurées à J+2 et J+7).",
  es: "Tus visualizaciones aparecen aquí tras tu primer vídeo publicado (medidas a D+2 y D+7).",
};

export default function Stats() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const lang = i18n.resolvedLanguage ?? "en";
  const nf = new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 });
  const q = useQuery({
    queryKey: ["my-stats", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data } = await supabase.from("brief_assignments").select("id, posted_url, posted_at, views_d2, views_d7, last_views, briefs(title)")
        .eq("poster_id", profile!.id).not("posted_url", "is", null).order("posted_at", { ascending: false }).limit(200);
      return (data ?? []) as unknown as Row[];
    },
  });
  if (q.isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  const rows = q.data ?? [];
  const measured = rows.filter((r) => r.views_d7 !== null);
  const total = measured.reduce((s, r) => s + (r.views_d7 ?? 0), 0);
  const chart = [...rows].reverse().slice(-20);
  const max = Math.max(1, ...chart.map((r) => r.views_d7 ?? r.last_views ?? 0));

  const kpis = [
    { label: t("creator.videosPosted"), value: rows.length, icon: <Film />, tint: "blue" as const },
    { label: t("creator.totalViews"), value: nf.format(total), icon: <Eye />, tint: "violet" as const },
    { label: t("creator.avgViews"), value: measured.length ? nf.format(Math.round(total / measured.length)) : "—", icon: <TrendingUp />, tint: "green" as const },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-[-0.01em] text-foreground">{t("creator.statsTitle")}</h1>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border bg-white p-3.5 shadow-xs sm:p-5">
            <IconTile icon={k.icon} tint={k.tint} className="h-8 w-8" />
            <p className="tabular mt-3 text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">{k.value}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground sm:text-xs">{k.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-white px-6 py-12 text-center">
          <IconTile icon={<BarChart3 />} tint="blue" className="mb-3 h-12 w-12 rounded-2xl" />
          <p className="max-w-xs text-sm text-muted-foreground">{EMPTY[lang.split("-")[0]] ?? EMPTY.en}</p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-foreground">{t("creator.d7")}</h2>
              <span className="flex items-center gap-3 text-[11px] text-subtle-foreground">
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-accent" />J+7</span>
                <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#b3c8ff]" />J+2</span>
              </span>
            </div>
            <div className="relative flex h-44 items-end gap-1.5" role="img" aria-label={t("creator.d7")}>
              {[0.5, 1].map((f) => <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-separator" style={{ bottom: `${f * 100}%` }} />)}
              {chart.map((r) => {
                const v = r.views_d7 ?? r.last_views ?? 0;
                return (
                  <div key={r.id} className="group relative flex h-full flex-1 items-end">
                    <div className={`w-full rounded-md transition-opacity group-hover:opacity-80 ${r.views_d7 !== null ? "bg-accent" : "bg-[#b3c8ff]"}`} style={{ height: `${Math.max(3, (v / max) * 100)}%` }} />
                    <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0b1530] px-1.5 py-0.5 text-[11px] font-medium text-white group-hover:block">{nf.format(v)}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border bg-white shadow-xs">
            <div className="grid grid-cols-[1fr_64px_64px] gap-2 border-b border-separator px-4 py-3 text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground">
              <span>Video</span><span className="text-right">{t("creator.d2").replace(/^\D*/, "") || "D+2"}</span><span className="text-right">{t("creator.d7").replace(/^\D*/, "") || "D+7"}</span>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[1fr_64px_64px] items-center gap-2 border-b border-separator px-4 py-3 last:border-0">
                <div className="min-w-0">
                  <a href={r.posted_url ?? "#"} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-foreground hover:text-accent">{r.briefs?.title ?? "—"}</a>
                  <p className="text-xs text-subtle-foreground">{r.posted_at ? new Date(r.posted_at).toLocaleDateString(lang, { day: "numeric", month: "short" }) : ""}</p>
                </div>
                <span className="tabular text-right text-sm text-muted-foreground">{r.views_d2 !== null ? nf.format(r.views_d2) : "—"}</span>
                <span className="tabular text-right text-sm font-semibold text-foreground">{r.views_d7 !== null ? nf.format(r.views_d7) : "—"}</span>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Card, Empty, Spinner, Stat, Table, Td, Th } from "@/components/ui";

interface Row { id: string; posted_url: string | null; posted_at: string | null; views_d2: number | null; views_d7: number | null; last_views: number | null; briefs: { title: string } | null }

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
  if (q.isLoading) return <Spinner />;
  const rows = q.data ?? [];
  const measured = rows.filter((r) => r.views_d7 !== null);
  const total = measured.reduce((s, r) => s + (r.views_d7 ?? 0), 0);
  const chart = [...rows].reverse().slice(-30);
  const max = Math.max(1, ...chart.map((r) => r.views_d7 ?? r.last_views ?? 0));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("creator.statsTitle")}</h1>
      <div className="grid grid-cols-3 gap-3">
        <Stat label={t("creator.videosPosted")} value={rows.length} />
        <Stat label={t("creator.totalViews")} value={nf.format(total)} />
        <Stat label={t("creator.avgViews")} value={measured.length ? nf.format(Math.round(total / measured.length)) : "—"} />
      </div>
      {rows.length === 0 ? <Empty title={t("creator.none")} /> : (
        <>
          <Card>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("creator.d7")}</p>
            <div className="flex h-40 items-end gap-1" role="img" aria-label={t("creator.d7")}>
              {chart.map((r) => {
                const v = r.views_d7 ?? r.last_views ?? 0;
                return (
                  <div key={r.id} className="group relative flex-1" style={{ height: "100%" }}>
                    <div className={`absolute bottom-0 w-full rounded-t ${r.views_d7 !== null ? "bg-accent" : "bg-accent/30"}`} style={{ height: `${Math.max(2, (v / max) * 100)}%` }} title={`${r.briefs?.title ?? ""}: ${nf.format(v)}`} />
                  </div>
                );
              })}
            </div>
          </Card>
          <Table>
            <thead><tr><Th>Video</Th><Th className="text-right">{t("creator.d2")}</Th><Th className="text-right">{t("creator.d7")}</Th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <a href={r.posted_url ?? "#"} target="_blank" rel="noreferrer" className="font-medium hover:underline">{r.briefs?.title ?? "—"}</a>
                    <p className="text-xs text-muted-foreground">{r.posted_at ? new Date(r.posted_at).toLocaleDateString(lang) : ""}</p>
                  </Td>
                  <Td className="text-right tabular-nums">{r.views_d2 !== null ? nf.format(r.views_d2) : "—"}</Td>
                  <Td className="text-right tabular-nums">{r.views_d7 !== null ? nf.format(r.views_d7) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
}

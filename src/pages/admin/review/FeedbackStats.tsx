import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MessageSquareWarning, Wallet } from "lucide-react";
import { Card, CardTitle, Empty, Spinner, Table, Td, Th } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { flag } from "@/lib/utils";
import { checkLabel, reviewStats } from "@shared/review.ts";

/** Statistiques des retours : taux de validation par posteur, points les plus fréquents. Seules les vidéos validées sont payées. */
export function FeedbackStats() {
  const q = useQuery({
    queryKey: ["post-reviews", "stats"],
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
      const [r, p] = await Promise.all([
        supabase.from("post_reviews").select("poster_id, verdict, checks, created_at").gte("created_at", since).limit(10000),
        supabase.from("posters").select("id, display_name, country"),
      ]);
      return { rows: (r.data ?? []) as any[], posters: new Map((p.data ?? []).map((x: any) => [x.id, x])) };
    },
  });
  const stats = useMemo(() => reviewStats(q.data?.rows ?? []), [q.data]);
  if (q.isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!stats.posters.length) return <Empty title="Pas encore de retours" icon={<MessageSquareWarning className="h-5 w-5" />}>Dès qu'un post est revu (Validé / À corriger / Refusé), les statistiques apparaissent ici.</Empty>;
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <CardTitle title="Retours les plus fréquents (90 jours)" description="Les points cochés lors des revues : à travailler dans les briefs et l'onboarding." />
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.top_issues.map((i) => <span key={i.check} className="tabular rounded-full bg-[#f1f3f7] px-3 py-1 text-[13px] text-foreground">{checkLabel(i.check, "fr")} <b>{i.n}</b></span>)}
          {!stats.top_issues.length && <span className="text-[13px] text-subtle-foreground">Aucun point coché.</span>}
        </div>
      </Card>
      <Card className="p-0">
        <div className="flex items-center justify-between px-6 pt-5">
          <CardTitle title="Par posteur" description="Seules les vidéos validées sont payées." />
          <Link to="/admin/payroll" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"><Wallet className="h-3.5 w-3.5" /> Voir la paie</Link>
        </div>
        <Table className="mt-3 rounded-none rounded-b-xl border-x-0 border-b-0 shadow-none">
          <thead><tr><Th>Posteur</Th><Th num>Revues</Th><Th num>Validées</Th><Th num>À corriger</Th><Th num>Refusées</Th><Th num>Taux de validation</Th><Th>Points fréquents</Th></tr></thead>
          <tbody>
            {stats.posters.map((s) => {
              const p: any = q.data?.posters.get(s.poster_id);
              return (
                <tr key={s.poster_id}>
                  <Td><Link to={`/admin/creators/${s.poster_id}`} className="font-medium text-foreground hover:text-accent">{flag(p?.country)} {p?.display_name ?? "?"}</Link></Td>
                  <Td num>{s.total}</Td><Td num>{s.validated}</Td><Td num>{s.changes}</Td><Td num>{s.rejected}</Td>
                  <Td num><span className={s.validation_rate >= 70 ? "font-semibold text-[#0b7a3c]" : s.validation_rate >= 40 ? "font-semibold text-[#8a5a00]" : "font-semibold text-[#c42a2d]"}>{s.validation_rate} %</span></Td>
                  <Td className="text-[13px] text-muted-foreground">{s.top_issues.map((i) => `${checkLabel(i.check, "fr")} (${i.n})`).join(", ") || "—"}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Info } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Empty, Input, PageHeader, Select, Spinner, Switch, Table, Td, Th, useToast } from "@/components/ui";
import { compact, dateFr, flag } from "@/lib/utils";

export default function PaidAds() {
  const qc = useQueryClient();
  const toast = useToast();
  const [codes, setCodes] = useState<Record<string, string>>({});
  const list = useQuery({
    queryKey: ["paid_ads_candidates"],
    queryFn: async () => {
      const { data } = await supabase.from("brief_assignments")
        .select("id, posted_url, posted_platform, posted_at, last_views, views_d2, views_d7, status, posters(display_name, country), briefs(title), paid_ad_candidates(*)")
        .in("status", ["posted", "validated"]).not("posted_url", "is", null)
        .order("last_views", { ascending: false, nullsFirst: false }).limit(100);
      return data ?? [];
    },
  });
  const reload = () => qc.invalidateQueries({ queryKey: ["paid_ads_candidates"] });
  const cand = (a: any) => (Array.isArray(a.paid_ad_candidates) ? a.paid_ad_candidates[0] : a.paid_ad_candidates) ?? null;
  const upsert = async (a: any, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("paid_ad_candidates").upsert({ assignment_id: a.id, ...patch }, { onConflict: "assignment_id" });
    if (error) toast(error.message, "danger"); else reload();
  };
  const toggle = async (a: any, on: boolean) => {
    const c = cand(a);
    if (on) await upsert(a, { status: "candidate" });
    else if (c) { await supabase.from("paid_ad_candidates").delete().eq("id", c.id); reload(); }
  };

  return (
    <div>
      <PageHeader title="Paid Ads" description="Les vidéos organiques de nos posteurs qui percent, à pousser en pub." />
      <div className="mb-6 flex items-start gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Squelette : pas d'intégration TikTok Ads pour l'instant. On garde les candidates, le code Spark Ads et un statut ; la création de pub Meta (toujours en PAUSED) viendra ensuite.</p>
      </div>
      {list.isLoading ? <Spinner /> : (list.data ?? []).length === 0 ? <Empty title="Aucune vidéo postée pour l'instant" /> : (
        <Table>
          <thead><tr><Th>Vidéo</Th><Th>Posteur</Th><Th>Vues</Th><Th>Candidate</Th><Th>Code Spark Ads</Th><Th>Statut</Th><Th /></tr></thead>
          <tbody>
            {(list.data ?? []).map((a: any) => {
              const c = cand(a);
              return (
                <tr key={a.id}>
                  <Td>
                    <div className="font-medium">{a.briefs?.title}</div>
                    <a href={a.posted_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">{a.posted_platform} <ExternalLink className="h-3 w-3" /></a>
                    <span className="ml-2 text-xs text-muted-foreground">{dateFr(a.posted_at)}</span>
                  </Td>
                  <Td>{flag(a.posters?.country)} {a.posters?.display_name}</Td>
                  <Td><div className="font-semibold">{compact(a.views_d7 ?? a.last_views ?? a.views_d2)}</div><div className="text-xs text-muted-foreground">{a.views_d7 !== null ? "J+7" : a.views_d2 !== null ? "J+2" : "dernier relevé"}</div></Td>
                  <Td><Switch checked={!!c} onChange={(v) => toggle(a, v)} label="Candidate" /></Td>
                  <Td>{c && (
                    <div className="flex gap-1">
                      <Input className="h-8 w-44 text-xs" placeholder="#spark code" value={codes[a.id] ?? c.spark_code ?? ""} onChange={(e) => setCodes({ ...codes, [a.id]: e.target.value })} />
                      <Button size="sm" variant="outline" onClick={() => upsert(a, { spark_code: codes[a.id] ?? c.spark_code ?? null, status: (codes[a.id] ?? c.spark_code) ? "spark_ready" : c.status })}>OK</Button>
                    </div>
                  )}</Td>
                  <Td>{c && (
                    <Select className="h-8 w-40 text-xs" value={c.status} onChange={(e) => upsert(a, { status: e.target.value })}>
                      <option value="candidate">Candidate</option><option value="spark_ready">Spark prêt</option><option value="meta_prepared">Préparée Meta</option><option value="archived">Archivée</option>
                    </Select>
                  )}</Td>
                  <Td>{c && (
                    <span title="Intégration à venir : marque seulement la vidéo comme préparée (rien n'est créé chez Meta).">
                      <Button size="sm" variant="subtle" disabled={c.status === "meta_prepared"} onClick={() => upsert(a, { status: "meta_prepared" })}>Préparer en pub Meta (PAUSED)</Button>
                    </span>
                  )}{c?.status === "meta_prepared" && <Badge tone="accent">préparée</Badge>}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

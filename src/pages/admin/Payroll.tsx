import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Download, Calculator } from "lucide-react";
import { supabase, callFn } from "@/lib/supabase";
import { usePosters, useZones } from "@/lib/hooks";
import { addDays, lastCompletedWeek, mondayOf } from "@shared/dates.ts";
import { formatMoney } from "@shared/zones.ts";
import { Badge, Button, Empty, Input, PageHeader, Spinner, Stat, Table, Td, Th, useToast } from "@/components/ui";
import { dateFr, flag } from "@/lib/utils";

export default function Payroll() {
  const qc = useQueryClient();
  const toast = useToast();
  const [week, setWeek] = useState(lastCompletedWeek());
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const posters = usePosters();
  const zones = useZones();
  const payouts = useQuery({
    queryKey: ["payouts", week],
    queryFn: async () => (await supabase.from("payouts").select("*, posters(display_name, country, ruul_email, ruul_status, profiles(full_name, email))").eq("week_start", week).order("total", { ascending: false })).data ?? [],
  });
  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast(ok, "success"); qc.invalidateQueries({ queryKey: ["payouts"] }); qc.invalidateQueries({ queryKey: ["posters"] }); }
    catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(null); }
  };
  const exportCsv = () => run("csv", async () => {
    const r = await callFn<{ csv: string }>("payroll", { action: "csv", week_start: week });
    const url = URL.createObjectURL(new Blob([r.csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `paie-${week}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });
  const rows = payouts.data ?? [];
  const totals = useMemo(() => ({
    total: rows.reduce((s: number, p: any) => s + Number(p.total), 0),
    paid: rows.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.total), 0),
    videos: rows.reduce((s: number, p: any) => s + p.videos_count, 0),
    currency: rows[0]?.currency ?? "USD",
  }), [rows]);
  const toAdd = (posters.data ?? []).filter((p: any) => p.ruul_status === "email_given");
  const problems = (posters.data ?? []).filter((p: any) => p.ruul_status === "added" && p.ruul_reminders >= 4);
  const zoneOf = (code: string | null) => (zones.data ?? []).find((z: any) => z.code === code);

  return (
    <div>
      <PageHeader
        title="Paie"
        description="Semaine du lundi au dimanche : vidéos validées × tarif de zone + bonus vues J+7 × RPM. Payé via Ruul."
        actions={<>
          <Button variant="outline" onClick={() => setWeek(addDays(week, -7))}>←</Button>
          <Input type="date" className="w-40" value={week} onChange={(e) => e.target.value && setWeek(mondayOf(e.target.value))} />
          <Button variant="outline" onClick={() => setWeek(addDays(week, 7))}>→</Button>
          <Button variant="outline" loading={busy === "csv"} onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button loading={busy === "compute"} onClick={() => run("compute", () => callFn("payroll", { action: "compute", week_start: week }), "Semaine calculée")}><Calculator className="h-4 w-4" /> Calculer la semaine</Button>
        </>}
      />
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Semaine" value={dateFr(week)} hint={`au ${dateFr(addDays(week, 6))}`} />
        <Stat label="Total dû" value={formatMoney(totals.total, totals.currency)} />
        <Stat label="Déjà payé" value={formatMoney(totals.paid, totals.currency)} />
        <Stat label="Vidéos payées" value={totals.videos} hint={`${rows.length} posteurs`} />
      </div>

      {payouts.isLoading ? <Spinner /> : rows.length === 0 ? <Empty title="Aucune paie pour cette semaine">Clique « Calculer la semaine ». Le calcul automatique tourne chaque lundi à 7 h UTC.</Empty> : (
        <Table>
          <thead><tr><Th /><Th>Posteur</Th><Th>Pays</Th><Th>Zone</Th><Th>Ruul</Th><Th>Vidéos</Th><Th>Base</Th><Th>Bonus</Th><Th>Total</Th><Th>Statut</Th><Th /></tr></thead>
          <tbody>
            {rows.map((p: any) => (
              <Fragment key={p.id}>
                <tr className="hover:bg-muted/50">
                  <Td><button onClick={() => setOpenRow(openRow === p.id ? null : p.id)}>{openRow === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button></Td>
                  <Td><div className="font-medium">{p.posters?.profiles?.full_name ?? p.posters?.display_name}</div><div className="text-xs text-muted-foreground">{p.posters?.profiles?.email}</div></Td>
                  <Td>{flag(p.posters?.country)} {p.posters?.country}</Td>
                  <Td>{p.zone_code}</Td>
                  <Td className="text-xs">{p.posters?.ruul_email ?? "—"}<div><Badge tone={p.posters?.ruul_status === "done" ? "success" : "warning"}>{p.posters?.ruul_status}</Badge></div></Td>
                  <Td>{p.videos_count}</Td>
                  <Td>{formatMoney(Number(p.base_amount), p.currency)}</Td>
                  <Td>{formatMoney(Number(p.bonus_amount), p.currency)}</Td>
                  <Td className="font-semibold">{formatMoney(Number(p.total), p.currency)}</Td>
                  <Td><Badge tone={p.status === "paid" ? "success" : "default"}>{p.status === "paid" ? `Payé ${dateFr(p.paid_at)}` : "À payer"}</Badge></Td>
                  <Td>{p.status !== "paid" && (
                    <Button size="sm" loading={busy === p.id} onClick={() => window.confirm(`Confirmer le paiement de ${formatMoney(Number(p.total), p.currency)} sur Ruul ? Un email « You received… » partira au posteur.`) && run(p.id, () => callFn("payroll", { action: "mark_paid", payout_id: p.id }), "Marqué payé")}>Payé sur Ruul</Button>
                  )}</Td>
                </tr>
                {openRow === p.id && (
                  <tr><Td colSpan={11} className="bg-muted/30">
                    <table className="w-full text-xs">
                      <tbody>
                        {(p.lines ?? []).map((l: any, i: number) => (
                          <tr key={i}>
                            <td className="py-1 pr-3">{l.kind === "video" ? "Vidéo" : "Bonus J+7"}</td>
                            <td className="py-1 pr-3">{l.label}</td>
                            <td className="py-1 pr-3">{l.url ? <a className="text-accent hover:underline" href={l.url} target="_blank" rel="noreferrer">lien</a> : "—"}</td>
                            <td className="py-1 pr-3">{dateFr(l.posted_at)}</td>
                            <td className="py-1 pr-3">{l.views_d7 !== null ? `${l.views_d7} vues` : l.note ?? ""}</td>
                            <td className="py-1 text-right font-medium">{formatMoney(l.amount, p.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Td></tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </Table>
      )}

      <h2 className="mb-3 mt-10 text-lg font-semibold">À ajouter sur Ruul ({toAdd.length})</h2>
      {toAdd.length === 0 ? <p className="text-sm text-muted-foreground">Personne en attente.</p> : (
        <Table>
          <thead><tr><Th>Posteur</Th><Th>Email Ruul</Th><Th>Pays</Th><Th>Tarif zone</Th><Th /></tr></thead>
          <tbody>
            {toAdd.map((p: any) => {
              const z = zoneOf(p.zone_code);
              return (
                <tr key={p.id}>
                  <Td>{p.profiles?.full_name ?? p.display_name}</Td>
                  <Td className="font-mono text-xs">{p.ruul_email}</Td>
                  <Td>{flag(p.country)} {p.country}</Td>
                  <Td>{z ? `${formatMoney(Number(z.price_per_video), z.currency)} / vidéo (zone ${z.code})` : "—"}</Td>
                  <Td><Button size="sm" loading={busy === `r-${p.id}`} onClick={() => run(`r-${p.id}`, () => callFn("payroll", { action: "ruul_added", poster_id: p.id }), "Invitation Ruul envoyée")}>Ajouté sur Ruul</Button></Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <h2 className="mb-3 mt-10 text-lg font-semibold">Problèmes Ruul ({problems.length})</h2>
      {problems.length === 0 ? <p className="text-sm text-muted-foreground">Aucun : tous les invités ont cliqué « It's done » dans les 5 jours.</p> : (
        <Table>
          <thead><tr><Th>Posteur</Th><Th>Email Ruul</Th><Th>Ajouté le</Th><Th>Relances</Th></tr></thead>
          <tbody>
            {problems.map((p: any) => (
              <tr key={p.id}><Td>{p.profiles?.full_name ?? p.display_name}</Td><Td>{p.ruul_email}</Td><Td>{dateFr(p.ruul_added_at)}</Td><Td>{p.ruul_reminders}</Td></tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

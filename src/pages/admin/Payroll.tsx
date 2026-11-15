import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clapperboard, Download, Calculator, UserPlus, Wallet } from "lucide-react";
import { supabase, callFn } from "@/lib/supabase";
import { usePosters, useZones } from "@/lib/hooks";
import { addDays, lastCompletedWeek, mondayOf } from "@shared/dates.ts";
import { formatMoney } from "@shared/zones.ts";
import { Badge, Button, Card, CardTitle, Empty, IconTile, Input, PageHeader, Spinner, Table, Td, Th, useToast, type Tint } from "@/components/ui";
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
          <Button variant="secondary" loading={busy === "csv"} onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</Button>
          <Button loading={busy === "compute"} onClick={() => run("compute", () => callFn("payroll", { action: "compute", week_start: week }), "Semaine calculée")}><Calculator className="h-4 w-4" /> Calculer la semaine</Button>
        </>}
      />
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg bg-[#f1f3f7] p-1">
          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-foreground" onClick={() => setWeek(addDays(week, -7))} aria-label="Semaine précédente"><ChevronLeft className="h-4 w-4" /></button>
          <span className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-[13px] font-medium shadow-xs"><CalendarDays className="h-4 w-4 text-subtle-foreground" />{dateFr(week)} → {dateFr(addDays(week, 6))}</span>
          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-foreground" onClick={() => setWeek(addDays(week, 7))} aria-label="Semaine suivante"><ChevronRight className="h-4 w-4" /></button>
        </div>
        {[["Semaine dernière", lastCompletedWeek()], ["Cette semaine", mondayOf(new Date().toISOString().slice(0, 10))]].map(([l, w]) => (
          <button key={l} onClick={() => setWeek(w)} className={`h-8 rounded-full border px-3 text-[13px] ${week === w ? "border-[#cddcff] bg-accent-soft text-[#0040d6]" : "border-border-strong bg-white text-muted-foreground hover:text-foreground"}`}>{l}</button>
        ))}
        <Input type="date" className="h-8 w-40 text-[13px]" value={week} onChange={(e) => e.target.value && setWeek(mondayOf(e.target.value))} aria-label="Choisir une semaine" />
      </div>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PayKpi icon={<Wallet />} tint="blue" label="Total dû" value={formatMoney(totals.total, totals.currency)} hint={`${rows.length} posteur(s)`} />
        <PayKpi icon={<AlertTriangle />} tint="yellow" label="Reste à payer" value={formatMoney(totals.total - totals.paid, totals.currency)} hint={`${rows.filter((p: any) => p.status !== "paid").length} paiement(s) en attente`} />
        <PayKpi icon={<CheckCircle2 />} tint="green" label="Déjà payé" value={formatMoney(totals.paid, totals.currency)} />
        <PayKpi icon={<Clapperboard />} tint="violet" label="Vidéos payées" value={totals.videos} hint="Validées, publiées cette semaine" />
      </div>

      {payouts.isLoading ? <Spinner /> : rows.length === 0 ? <Empty title="Aucune paie pour cette semaine" icon={<Wallet className="h-5 w-5" />}>Clique « Calculer la semaine ». Le calcul automatique tourne chaque lundi à 7 h UTC.</Empty> : (
        <Table>
          <thead><tr><Th className="w-10" /><Th>Posteur</Th><Th>Pays</Th><Th>Zone</Th><Th>Ruul</Th><Th num>Vidéos</Th><Th num>Base</Th><Th num>Bonus</Th><Th num>Total</Th><Th>Statut</Th><Th /></tr></thead>
          <tbody>
            {rows.map((p: any) => (
              <Fragment key={p.id}>
                <tr className="cursor-pointer" onClick={() => setOpenRow(openRow === p.id ? null : p.id)}>
                  <Td><button className="rounded p-0.5 text-subtle-foreground hover:bg-white" aria-label="Détail">{openRow === p.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button></Td>
                  <Td><div className="font-medium">{p.posters?.profiles?.full_name ?? p.posters?.display_name}</div><div className="text-xs text-subtle-foreground">{p.posters?.profiles?.email}</div></Td>
                  <Td>{flag(p.posters?.country)} {p.posters?.country}</Td>
                  <Td>{p.zone_code}</Td>
                  <Td className="text-xs"><div className="text-muted-foreground">{p.posters?.ruul_email ?? "—"}</div><Badge tone={p.posters?.ruul_status === "done" ? "success" : "warning"} className="mt-1">{({ none: "Pas d'email", email_given: "À ajouter", added: "Invité", done: "Prêt", stopped: "Arrêté" } as Record<string, string>)[p.posters?.ruul_status] ?? "—"}</Badge></Td>
                  <Td num>{p.videos_count}</Td>
                  <Td num className="text-muted-foreground">{formatMoney(Number(p.base_amount), p.currency)}</Td>
                  <Td num className="text-muted-foreground">{formatMoney(Number(p.bonus_amount), p.currency)}</Td>
                  <Td num className="font-semibold">{formatMoney(Number(p.total), p.currency)}</Td>
                  <Td><Badge tone={p.status === "paid" ? "success" : "default"}>{p.status === "paid" ? `Payé ${dateFr(p.paid_at)}` : "À payer"}</Badge></Td>
                  <Td className="text-right"><span onClick={(e) => e.stopPropagation()}>{p.status !== "paid" && (
                    <Button size="sm" loading={busy === p.id} onClick={() => window.confirm(`Confirmer le paiement de ${formatMoney(Number(p.total), p.currency)} sur Ruul ? Un email « You received… » partira au posteur.`) && run(p.id, () => callFn("payroll", { action: "mark_paid", payout_id: p.id }), "Marqué payé")}>Payé sur Ruul</Button>
                  )}</span></Td>
                </tr>
                {openRow === p.id && (
                  <tr><Td colSpan={11} className="bg-muted px-6 py-3">
                    <table className="w-full text-[13px]">
                      <tbody>
                        {(p.lines ?? []).map((l: any, i: number) => (
                          <tr key={i}>
                            <td className="py-1.5 pr-3"><Badge tone={l.kind === "video" ? "accent" : "violet"}>{l.kind === "video" ? "Vidéo" : "Bonus J+7"}</Badge></td>
                            <td className="py-1.5 pr-3">{l.label}</td>
                            <td className="py-1.5 pr-3">{l.url ? <a className="text-accent hover:underline" href={l.url} target="_blank" rel="noreferrer">lien</a> : "—"}</td>
                            <td className="py-1.5 pr-3">{dateFr(l.posted_at)}</td>
                            <td className="py-1.5 pr-3">{l.views_d7 !== null ? `${l.views_d7} vues` : l.note ?? ""}</td>
                            <td className="tabular py-1.5 text-right font-medium">{formatMoney(l.amount, p.currency)}</td>
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

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card className="p-0">
          <div className="px-6 pt-5"><CardTitle title={`À ajouter sur Ruul (${toAdd.length})`} description="Posteurs qui ont donné leur email Ruul : ajoute-les comme contractors, puis clique « Ajouté »." /></div>
          {toAdd.length === 0 ? <p className="px-6 pb-6 text-sm text-muted-foreground">Personne en attente.</p> : (
            <Table className="rounded-none rounded-b-xl border-x-0 border-b-0 shadow-none">
              <thead><tr><Th>Posteur</Th><Th>Email Ruul</Th><Th>Tarif zone</Th><Th /></tr></thead>
              <tbody>
                {toAdd.map((p: any) => {
                  const z = zoneOf(p.zone_code);
                  return (
                    <tr key={p.id}>
                      <Td><div className="font-medium">{flag(p.country)} {p.profiles?.full_name ?? p.display_name}</div></Td>
                      <Td className="font-mono text-xs text-muted-foreground">{p.ruul_email}</Td>
                      <Td className="text-muted-foreground">{z ? `${formatMoney(Number(z.price_per_video), z.currency)} · zone ${z.code}` : "—"}</Td>
                      <Td className="text-right"><Button size="sm" loading={busy === `r-${p.id}`} onClick={() => run(`r-${p.id}`, () => callFn("payroll", { action: "ruul_added", poster_id: p.id }), "Invitation Ruul envoyée")}><UserPlus className="h-3.5 w-3.5" /> Ajouté</Button></Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="p-0">
          <div className="px-6 pt-5"><CardTitle title={`Problèmes Ruul (${problems.length})`} description="Invités depuis plus de 5 jours sans « It's done »." /></div>
          {problems.length === 0 ? <p className="flex items-center gap-2 px-6 pb-6 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-success" /> Aucun : tous les invités ont terminé.</p> : (
            <Table className="rounded-none rounded-b-xl border-x-0 border-b-0 shadow-none">
              <thead><tr><Th>Posteur</Th><Th>Email Ruul</Th><Th>Ajouté le</Th><Th num>Relances</Th></tr></thead>
              <tbody>
                {problems.map((p: any) => (
                  <tr key={p.id}><Td className="font-medium">{p.profiles?.full_name ?? p.display_name}</Td><Td className="text-muted-foreground">{p.ruul_email}</Td><Td className="text-muted-foreground">{dateFr(p.ruul_added_at)}</Td><Td num>{p.ruul_reminders}</Td></tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

function PayKpi({ icon, tint, label, value, hint }: { icon: React.ReactNode; tint: Tint; label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <Card className="flex items-start gap-4 p-5">
      <IconTile icon={icon} tint={tint} />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <p className="tabular mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em]">{value}</p>
        {hint && <p className="mt-1 text-xs text-subtle-foreground">{hint}</p>}
      </div>
    </Card>
  );
}

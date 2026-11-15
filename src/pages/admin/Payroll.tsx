import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle, CalendarDays, CheckCheck, CheckCircle2, ChevronLeft, ChevronRight, Clapperboard, Download, ExternalLink, Calculator,
  PencilLine, UserPlus, Wallet, ShieldCheck, Eye,
} from "lucide-react";
import { supabase, callFn } from "@/lib/supabase";
import { usePosters, useZones } from "@/lib/hooks";
import { addDays, lastCompletedWeek, mondayOf } from "@shared/dates.ts";
import { formatMoney } from "@shared/zones.ts";
import { d7Status, missingD7 } from "@shared/payroll.ts";
import { Badge, Button, Card, CardTitle, Dialog, Empty, Field, IconTile, Input, PageHeader, Spinner, Table, Td, Th, Tabs, useToast, type Tint } from "@/components/ui";
import { cn, compact, dateFr, flag } from "@/lib/utils";

type Filter = "all" | "to_review" | "validated" | "paid";

const STATUS = {
  to_review: { label: "À vérifier", tone: "warning" as const },
  validated: { label: "Validé", tone: "accent" as const },
  paid: { label: "Payé sur Ruul", tone: "success" as const },
};
const statusOf = (p: any): keyof typeof STATUS => (p.status === "paid" ? "paid" : p.review_status === "validated" ? "validated" : "to_review");

/** Lien vers le profil du créateur (TikTok de préférence, sinon Instagram). */
function profileLink(p: any): { href: string; label: string } | null {
  const tt = p?.tiktok_handle, ig = p?.instagram_handle;
  if (tt) return { href: `https://www.tiktok.com/@${tt}`, label: `@${tt}` };
  if (ig) return { href: `https://www.instagram.com/${ig}/`, label: `@${ig}` };
  return null;
}

export default function Payroll() {
  const qc = useQueryClient();
  const toast = useToast();
  const [week, setWeek] = useState(lastCompletedWeek());
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<any | null>(null);
  const posters = usePosters();
  const zones = useZones();
  const payouts = useQuery({
    queryKey: ["payouts", week],
    queryFn: async () => {
      const rows = ((await supabase.from("payouts")
        .select("*, posters(id, display_name, country, ruul_email, ruul_status, tiktok_handle, instagram_handle, profiles(full_name, email, is_test))")
        .eq("week_start", week).neq("status", "void").order("total", { ascending: false })).data ?? [])
        // Comptes de test : jamais dans la paie (la base les bloque aussi, ceci couvre l'historique).
        .filter((p: any) => !p.posters?.profiles?.is_test);
      // Vues J+7 actuelles des vidéos de la semaine, pour celles dont le bonus tombe une autre semaine.
      const ids = [...new Set(rows.flatMap((p: any) => (p.lines ?? []).map((l: any) => l.assignment_id)))];
      const views = new Map<string, number | null>();
      if (ids.length) for (const a of (await supabase.from("brief_assignments").select("id, views_d7").in("id", ids)).data ?? []) views.set(a.id, a.views_d7);
      return rows.map((p: any) => ({ ...p, _views: views }));
    },
  });
  const run = async (key: string, fn: () => Promise<any>, ok?: string | ((r: any) => string)) => {
    setBusy(key);
    try {
      const r = await fn();
      if (ok) toast(typeof ok === "function" ? ok(r) : ok, "success");
      qc.invalidateQueries({ queryKey: ["payouts"] });
      qc.invalidateQueries({ queryKey: ["posters"] });
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(null); }
  };
  const download = (csv: string, name: string) => {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };
  const ruulCsv = () => run("ruul", async () => {
    const r = await callFn<{ csv: string; rows: number }>("payroll", { action: "ruul_csv", week_start: week });
    if (r.rows === 0) throw new Error("Rien à exporter : valide d'abord les paiements de la semaine.");
    download(r.csv, `ruul-${week}.csv`);
    return r;
  }, (r) => `${r.rows} ligne(s) exportée(s) pour Ruul`);
  const fullCsv = () => run("csv", async () => {
    const r = await callFn<{ csv: string }>("payroll", { action: "csv", week_start: week });
    download(r.csv, `paie-${week}.csv`);
  });

  const all = payouts.data ?? [];
  const rows = all.filter((p: any) => filter === "all" || statusOf(p) === filter);
  const counts = useMemo(() => ({
    to_review: all.filter((p: any) => statusOf(p) === "to_review").length,
    validated: all.filter((p: any) => statusOf(p) === "validated").length,
    paid: all.filter((p: any) => statusOf(p) === "paid").length,
    flagged: all.filter((p: any) => missingD7(p.lines ?? []) > 0).length,
  }), [all]);
  const totals = useMemo(() => ({
    total: all.reduce((s: number, p: any) => s + Number(p.total), 0),
    paid: all.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.total), 0),
    videos: all.reduce((s: number, p: any) => s + p.videos_count, 0),
    currency: all[0]?.currency ?? "USD",
  }), [all]);
  const real = (posters.data ?? []).filter((p: any) => !p.profiles?.is_test); // comptes de test exclus
  const toAdd = real.filter((p: any) => p.ruul_status === "email_given");
  const problems = real.filter((p: any) => p.ruul_status === "added" && p.ruul_reminders >= 4);
  const zoneOf = (code: string | null) => (zones.data ?? []).find((z: any) => z.code === code);
  const isLast = week === lastCompletedWeek();

  return (
    <div>
      <PageHeader
        title="Paie de la semaine"
        description="Chaque lundi, on paie les vidéos de la semaine précédente : vidéos validées × tarif de zone + vues J+7 × RPM. Vérifie, valide, exporte pour Ruul, puis marque payé."
        actions={<>
          <Button variant="secondary" loading={busy === "csv"} onClick={fullCsv}><Download className="h-4 w-4" /> Détail CSV</Button>
          <Button variant="secondary" loading={busy === "compute"} onClick={() => run("compute", () => callFn("payroll", { action: "compute", week_start: week }),
            (r) => `${r.payouts} paiement(s) calculé(s)${r.missing_d7_rows ? ` · relevé J+7 relancé pour ${r.missing_d7_rows}` : ""}`)}>
            <Calculator className="h-4 w-4" /> Recalculer
          </Button>
          <Button loading={busy === "ruul"} onClick={ruulCsv}><Download className="h-4 w-4" /> CSV pour Ruul</Button>
        </>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center rounded-lg bg-[#f1f3f7] p-1">
          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-foreground" onClick={() => setWeek(addDays(week, -7))} aria-label="Semaine précédente"><ChevronLeft className="h-4 w-4" /></button>
          <span className="flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-[13px] font-medium shadow-xs"><CalendarDays className="h-4 w-4 text-subtle-foreground" />{dateFr(week)} → {dateFr(addDays(week, 6))}</span>
          <button className="rounded-md p-1.5 text-muted-foreground hover:bg-white hover:text-foreground" onClick={() => setWeek(addDays(week, 7))} aria-label="Semaine suivante"><ChevronRight className="h-4 w-4" /></button>
        </div>
        {[["Semaine à payer", lastCompletedWeek()], ["Semaine en cours", mondayOf(new Date().toISOString().slice(0, 10))]].map(([l, w]) => (
          <button key={l} onClick={() => setWeek(w)} className={cn("h-8 rounded-full border px-3 text-[13px]", week === w ? "border-[#cddcff] bg-accent-soft text-[#0040d6]" : "border-border-strong bg-white text-muted-foreground hover:text-foreground")}>{l}</button>
        ))}
        {!isLast && <span className="text-xs text-subtle-foreground">La paie du lundi porte sur la semaine du {dateFr(lastCompletedWeek())}.</span>}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PayKpi icon={<Wallet />} tint="blue" label="À verser" value={formatMoney(totals.total, totals.currency)} hint={`${all.length} créateur(s)`} />
        <PayKpi icon={<AlertTriangle />} tint="yellow" label="À vérifier" value={counts.to_review} hint={counts.flagged ? `${counts.flagged} avec vues J+7 manquantes` : "Rien de bloquant"} />
        <PayKpi icon={<CheckCircle2 />} tint="green" label="Déjà payé" value={formatMoney(totals.paid, totals.currency)} hint={`${counts.paid} paiement(s)`} />
        <PayKpi icon={<Clapperboard />} tint="violet" label="Vidéos payées" value={totals.videos} hint="Validées, publiées dans la semaine" />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onChange={setFilter} items={[
          { value: "all", label: `Tous (${all.length})` },
          { value: "to_review", label: `À vérifier (${counts.to_review})` },
          { value: "validated", label: `Validés (${counts.validated})` },
          { value: "paid", label: `Payés (${counts.paid})` },
        ]} />
        <Button variant="subtle" disabled={counts.to_review === 0} loading={busy === "all"}
          onClick={() => run("all", () => callFn("payroll", { action: "validate_all", week_start: week }),
            (r) => `${r.validated} validé(s)${r.skipped ? ` · ${r.skipped} laissé(s) à vérifier (vues J+7 manquantes)` : ""}`)}>
          <CheckCheck className="h-4 w-4" /> Tout valider
        </Button>
      </div>

      {payouts.isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : all.length === 0 ? (
        <Empty title="Aucune paie pour cette semaine" icon={<Wallet className="h-5 w-5" />}
          action={<Button onClick={() => run("compute", () => callFn("payroll", { action: "compute", week_start: week }), "Semaine calculée")}><Calculator className="h-4 w-4" /> Calculer la semaine</Button>}>
          Le calcul tourne automatiquement chaque lundi à 7 h UTC (récap envoyé aux admins). Les comptes de test sont exclus.
        </Empty>
      ) : rows.length === 0 ? <Empty title="Rien dans ce filtre" /> : (
        <div className="space-y-4">
          {rows.map((p: any) => (
            <PayoutCard key={p.id} p={p} busy={busy}
              onAdjust={() => setAdjusting(p)}
              onValidate={(force) => run(`v-${p.id}`, () => callFn("payroll", { action: "validate", payout_id: p.id, force }), "Paiement validé")}
              onPaid={() => window.confirm(`Confirmer le paiement de ${formatMoney(Number(p.total), p.currency)} sur Ruul ? Un email « You received… » partira au créateur.`)
                && run(`p-${p.id}`, () => callFn("payroll", { action: "mark_paid", payout_id: p.id }), "Marqué payé sur Ruul")} />
          ))}
        </div>
      )}

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <Card className="p-0">
          <div className="px-6 pt-5"><CardTitle title={`À ajouter sur Ruul (${toAdd.length})`} description="Créateurs qui ont donné leur email Ruul : ajoute-les comme contractors, puis clique « Ajouté »." /></div>
          {toAdd.length === 0 ? <p className="px-6 pb-6 text-sm text-muted-foreground">Personne en attente.</p> : (
            <Table className="rounded-none rounded-b-xl border-x-0 border-b-0 shadow-none">
              <thead><tr><Th>Créateur</Th><Th>Email Ruul</Th><Th>Tarif zone</Th><Th /></tr></thead>
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
              <thead><tr><Th>Créateur</Th><Th>Email Ruul</Th><Th>Ajouté le</Th><Th num>Relances</Th></tr></thead>
              <tbody>
                {problems.map((p: any) => (
                  <tr key={p.id}><Td className="font-medium">{p.profiles?.full_name ?? p.display_name}</Td><Td className="text-muted-foreground">{p.ruul_email}</Td><Td className="text-muted-foreground">{dateFr(p.ruul_added_at)}</Td><Td num>{p.ruul_reminders}</Td></tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <AdjustDialog payout={adjusting} onClose={() => setAdjusting(null)} onSave={(amount, reason) => run("adj", async () => {
        await callFn("payroll", { action: "adjust", payout_id: adjusting.id, amount, reason });
        setAdjusting(null);
      }, "Ajustement enregistré (à revalider)")} busy={busy === "adj"} />
    </div>
  );
}

function PayoutCard({ p, busy, onAdjust, onValidate, onPaid }: { p: any; busy: string | null; onAdjust: () => void; onValidate: (force: boolean) => void; onPaid: () => void }) {
  const st = statusOf(p);
  const lines: any[] = p.lines ?? [];
  const missing = missingD7(lines);
  const link = profileLink(p.posters);
  const name = p.posters?.profiles?.full_name ?? p.posters?.display_name;
  // Une ligne par vidéo : la base (vidéo publiée cette semaine) et/ou le bonus (J+7 tombé cette semaine).
  const videos = useMemo(() => {
    const m = new Map<string, any>();
    for (const l of lines) {
      const v = m.get(l.assignment_id) ?? { id: l.assignment_id, label: l.label?.replace(/^Views bonus \(D\+7\) — /, ""), url: l.url, posted_at: l.posted_at, base: 0, bonus: 0, views_d7: null, hasBonus: false };
      if (l.kind === "video") v.base += l.amount;
      else { v.bonus += l.amount; v.views_d7 = l.views_d7; v.hasBonus = true; }
      m.set(l.assignment_id, v);
    }
    return [...m.values()];
  }, [lines]);
  const cur = p.currency;
  return (
    <Card className={cn("p-0", missing > 0 && st !== "paid" && "ring-1 ring-[#ffe2a8]")}>
      <div className="flex flex-wrap items-center gap-4 border-b border-separator px-6 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tint-violet text-sm font-semibold uppercase text-vik-violet">{String(name ?? "?").charAt(0)}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/admin/creators/${p.poster_id}`} className="font-semibold text-foreground hover:text-accent">{name}</Link>
            {link && <a href={link.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-accent hover:underline">{link.label}<ExternalLink className="h-3 w-3" /></a>}
            <Badge tone={STATUS[st].tone}>{STATUS[st].label}</Badge>
            {missing > 0 && st !== "paid" && <Badge tone="warning"><AlertTriangle className="h-3 w-3" /> {missing} vue(s) J+7 manquante(s)</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-subtle-foreground">
            {flag(p.posters?.country)} {p.posters?.country} · zone {p.zone_code} · Ruul : {p.posters?.ruul_email ?? <span className="text-[#8a5a00]">pas d'email Ruul</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular text-xl font-semibold tracking-[-0.02em]">{formatMoney(Number(p.total), cur)}</p>
          <p className="tabular text-xs text-subtle-foreground">
            {formatMoney(Number(p.base_amount), cur)} + {formatMoney(Number(p.bonus_amount), cur)} bonus
            {Number(p.adjustment) !== 0 && <> {Number(p.adjustment) > 0 ? "+" : "−"} {formatMoney(Math.abs(Number(p.adjustment)), cur)} ajust.</>}
          </p>
        </div>
      </div>
      <div className="px-6 py-3">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-[0.06em] text-subtle-foreground">
            <th className="py-1.5 font-medium">Vidéo</th><th className="py-1.5 font-medium">Publiée</th><th className="py-1.5 text-right font-medium">Vues J+7</th><th className="py-1.5 text-right font-medium">Vidéo</th><th className="py-1.5 text-right font-medium">Bonus</th>
          </tr></thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.id} className="border-t border-separator">
                <td className="py-2 pr-3">
                  {v.url ? <a href={v.url} target="_blank" rel="noreferrer" className="inline-flex max-w-[22rem] items-center gap-1.5 truncate text-accent hover:underline"><ExternalLink className="h-3 w-3 shrink-0" /><span className="truncate">{v.label || v.url}</span></a> : <span className="text-muted-foreground">{v.label}</span>}
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{dateFr(v.posted_at)}</td>
                <td className="tabular py-2 pr-3 text-right">
                  {!v.hasBonus ? <D7Cell postedAt={v.posted_at} views={p._views?.get(v.id) ?? null} />
                    : v.views_d7 === null ? <span className="inline-flex items-center gap-1 font-medium text-[#8a5a00]"><AlertTriangle className="h-3.5 w-3.5" /> manquantes</span>
                    : <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3 text-subtle-foreground" />{compact(v.views_d7)}</span>}
                </td>
                <td className="tabular py-2 pr-3 text-right text-muted-foreground">{v.base ? formatMoney(v.base, cur) : "—"}</td>
                <td className="tabular py-2 text-right text-muted-foreground">{v.hasBonus ? formatMoney(v.bonus, cur) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {Number(p.adjustment) !== 0 && <p className="mt-2 rounded-lg bg-tint-blue px-3 py-2 text-xs text-[#0040d6]"><PencilLine className="mr-1 inline h-3 w-3" />Ajustement {formatMoney(Number(p.adjustment), cur)} : {p.adjustment_reason}</p>}
      </div>
      {st !== "paid" ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-separator px-6 py-3">
          <Button size="sm" variant="ghost" onClick={onAdjust}><PencilLine className="h-3.5 w-3.5" /> Ajuster</Button>
          {st === "to_review" && (missing > 0
            ? <Button size="sm" variant="secondary" loading={busy === `v-${p.id}`} onClick={() => window.confirm("Des vues J+7 manquent (le relevé est relancé au recalcul). Valider quand même, sans ce bonus ?") && onValidate(true)}><ShieldCheck className="h-3.5 w-3.5" /> Valider quand même</Button>
            : <Button size="sm" variant="secondary" loading={busy === `v-${p.id}`} onClick={() => onValidate(false)}><ShieldCheck className="h-3.5 w-3.5" /> Valider</Button>)}
          <Button size="sm" disabled={st !== "validated"} title={st !== "validated" ? "Valide d'abord le paiement" : undefined} loading={busy === `p-${p.id}`} onClick={onPaid}>Payé sur Ruul</Button>
        </div>
      ) : <p className="border-t border-separator px-6 py-3 text-right text-xs text-subtle-foreground">Payé le {dateFr(p.paid_at, true)}</p>}
    </Card>
  );
}

function AdjustDialog({ payout, onClose, onSave, busy }: { payout: any | null; onClose: () => void; onSave: (amount: number, reason: string) => void; busy: boolean }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const open = !!payout;
  const n = Number(amount.replace(",", "."));
  const valid = amount.trim() !== "" && Number.isFinite(n) && (n === 0 || reason.trim().length > 0);
  return (
    <Dialog open={open} onClose={() => { setAmount(""); setReason(""); onClose(); }} title="Ajuster le paiement"
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button disabled={!valid} loading={busy} onClick={() => { onSave(n, reason); setAmount(""); setReason(""); }}>Enregistrer</Button></>}>
      {payout && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Calculé : {formatMoney(Number(payout.base_amount) + Number(payout.bonus_amount), payout.currency)}. L'ajustement s'ajoute (ou se retranche) et le paiement repasse « à vérifier ».</p>
          <Field label="Montant de l'ajustement" hint="Négatif pour retirer (ex. -5). 0 pour annuler un ajustement."><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(payout.adjustment ?? 0)} autoFocus /></Field>
          <Field label="Motif (obligatoire)" hint="Visible dans l'historique de la paie."><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ex. vidéo supprimée par TikTok, bonus exceptionnel…" /></Field>
        </div>
      )}
    </Dialog>
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

/** Vidéo dont le bonus J+7 n'est pas dans cette semaine : relevé, à venir ou en retard. */
function D7Cell({ postedAt, views }: { postedAt: string | null; views: number | null }) {
  if (!postedAt) return <span className="text-subtle-foreground">—</span>;
  const s = d7Status(postedAt, views);
  const day = (d: string) => dateFr(`${d}T12:00:00Z`); // jour UTC, sans décalage de fuseau
  const week = `bonus sem. du ${day(s.bonusWeek)}`;
  if (s.kind === "measured") return <span className="inline-flex items-center gap-1" title={`J+7 le ${day(s.d7Day)}`}><Eye className="h-3 w-3 text-subtle-foreground" />{compact(s.views ?? 0)} <span className="text-xs text-subtle-foreground">· {week}</span></span>;
  if (s.kind === "upcoming") return <span className="text-subtle-foreground" title={week}>J+7 le {day(s.d7Day)}</span>;
  return <span className="inline-flex items-center gap-1 font-medium text-[#8a5a00]" title={`J+7 le ${day(s.d7Day)} : relevé en attente`}><AlertTriangle className="h-3.5 w-3.5" /> relevé en attente</span>;
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Megaphone, Pause, Play, Plus, RefreshCw, ShieldCheck, Upload, Wallet } from "lucide-react";
import { supabase, callFn } from "@/lib/supabase";
import { useCountries, useSetting } from "@/lib/hooks";
import { costPer } from "@shared/meta.ts";
import { LaunchChecklist } from "./campaigns/LaunchChecklist";
import { Badge, Button, Card, CardTitle, Dialog, Empty, Field, IconTile, Input, PageHeader, Spinner, Table, Td, Th, useToast } from "@/components/ui";
import { dateFr, flag } from "@/lib/utils";

const statusTone = (s: string) => (s === "ACTIVE" ? "success" : s === "PAUSED" ? "warning" : "default") as any;
const StatusBadge = ({ s }: { s: string }) => <Badge tone={statusTone(s)}><span className="h-1.5 w-1.5 rounded-full bg-current" />{s === "ACTIVE" ? "Active" : s === "PAUSED" ? "En pause" : s}</Badge>;

export default function Campaigns() {
  const qc = useQueryClient();
  const toast = useToast();
  const meta = useSetting<any>("meta");
  const landing = useSetting<any>("landing");
  const countries = useCountries();
  const cap = Number(meta.data?.max_daily_budget ?? 50);
  const globalCap = Number(meta.data?.global_daily_cap ?? 100);
  const [open, setOpen] = useState(false);
  const [adFor, setAdFor] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const camps = useQuery({
    queryKey: ["meta_campaigns"],
    queryFn: async () => (await supabase.from("meta_campaigns").select("*, meta_adsets(*, meta_ads(*))").order("created_at", { ascending: false })).data ?? [],
  });
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const insights = useQuery({
    queryKey: ["meta_insights", since],
    queryFn: async () => (await supabase.from("meta_insights").select("*").eq("level", "adset").gte("date", since)).data ?? [],
  });
  const firstCampaign = useMemo(() => (camps.data ?? []).reduce<string | null>((m, c: any) => (!m || c.created_at < m ? c.created_at : m), null), [camps.data]);
  const apps = useQuery({
    queryKey: ["apps_by_country", firstCampaign],
    enabled: !!firstCampaign,
    queryFn: async () => (await supabase.from("applications").select("country, status, utm, created_at").gte("created_at", firstCampaign!)).data ?? [],
  });

  const act = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast(ok, "success");
      qc.invalidateQueries({ queryKey: ["meta_campaigns"] });
      qc.invalidateQueries({ queryKey: ["meta_insights"] });
    } catch (e) {
      toast((e as Error).message, "danger");
    } finally {
      setBusy(null);
    }
  };

  const activate = (level: string, row: any, budget: number) => {
    if (!window.confirm(`Activer ce ${level} ?\nBudget journalier : ${budget} €\nPlafond : ${cap} €\nLa diffusion (et la dépense) démarre immédiatement.`)) return;
    act(`act-${row.id}`, async () => {
      try {
        return await callFn("meta", { action: "activate", level, id: row.id });
      } catch (e) {
        const msg = (e as Error).message;
        // Checklist incomplète : forçage admin explicite seulement (journalisé côté serveur).
        if (/Checklist de lancement incomplète/.test(msg) && window.confirm(`${msg}\n\nForcer l'activation malgré tout ? (action journalisée)`)) {
          return await callFn("meta", { action: "activate", level, id: row.id, force: true });
        }
        throw e;
      }
    }, "Activé");
  };
  const pause = (level: string, row: any) => act(`pause-${row.id}`, () => callFn("meta", { action: "pause", level, id: row.id }), "Mis en pause");

  const committed = useMemo(() => (camps.data ?? []).flatMap((c: any) => c.meta_adsets ?? [])
    .filter((a: any) => ["ACTIVE", "PAUSED"].includes(a.status)).reduce((sum: number, a: any) => sum + Number(a.daily_budget), 0), [camps.data]);
  const activeBudget = useMemo(() => (camps.data ?? []).flatMap((c: any) => c.meta_adsets ?? [])
    .filter((a: any) => a.status === "ACTIVE").reduce((sum: number, a: any) => sum + Number(a.daily_budget), 0), [camps.data]);
  const setBudget = (a: any, amount: number) => {
    if (!(amount > 0)) return toast("Budget invalide", "danger");
    if (!window.confirm(`Passer « ${a.name} » de ${a.daily_budget} € à ${amount} €/jour ?\nPlafond par ad set : ${cap} € · plafond global : ${globalCap} €/jour.`)) return;
    act(`budget-${a.id}`, () => callFn("meta", { action: "set_budget", adset_id: a.id, daily_budget: amount }), "Budget mis à jour sur Meta");
  };
  const pushCreatives = (c: any) => {
    if (!window.confirm(`Créer des pubs (PAUSED) avec les créas validées de chaque pays de « ${c.name} » ? (6 max par ad set)`)) return;
    act(`push-${c.id}`, async () => {
      const r = await callFn<any>("meta", { action: "create_ads_bulk", campaign_id: c.id });
      if (r.created === 0) throw new Error("Aucune créa validée pour les pays de cette campagne (Recrutement → Créas)");
      const failed = (r.results ?? []).filter((x: any) => x.error);
      if (failed.length) toast(`${failed.length} échec(s) : ${failed[0].error}`, "danger");
      return r;
    }, "Pubs créées en PAUSED");
  };
  /** Pubs de toutes les créas validées sans pub (aussi lancé chaque heure ; attend que l'app Meta soit en Live). */
  const createPending = () => act("pending", async () => {
    const r = await callFn<any>("meta", { action: "create_pending_ads" });
    if (r.blocked === "app_dev_mode") throw new Error("L'app Meta « Sophia Hub » est encore en mode développement : passe-la en Live, les pubs seront créées automatiquement dans l'heure.");
    if (r.created === 0) throw new Error("Aucune nouvelle pub à créer : valide d'abord des créas (Recrutement → Créas)");
    return r;
  }, "Pubs créées en PAUSED");
  const archive = (level: string, row: any) => {
    if (!window.confirm(`Archiver « ${row.name} » sur Meta ? C'est irréversible (l'objet ne pourra plus être réactivé).`)) return;
    act(`arch-${row.id}`, () => callFn("meta", { action: "archive", level, id: row.id }), "Archivé");
  };
  const pendingState = useQuery({ queryKey: ["meta-ads-pending"], queryFn: async () => (await supabase.from("settings").select("value").eq("key", "meta_ads_pending").maybeSingle()).data?.value as any });
  const adsetLabel = (a: any) => a.country ?? `Zone ${a.zone_code ?? "?"}`;
  const adsetCountries = (a: any): string[] => (a.country ? [a.country] : a.targeting?.countries ?? []);

  // Métriques par pays (ou par zone pour les ad sets de zone)
  const metrics = useMemo(() => {
    const byCountry = new Map<string, { spend: number; clicks: number; impressions: number; apps: number; metaApps: number; signed: number }>();
    const get = (c: string) => byCountry.get(c) ?? (byCountry.set(c, { spend: 0, clicks: 0, impressions: 0, apps: 0, metaApps: 0, signed: 0 }), byCountry.get(c)!);
    const adsetCountry = new Map<string, string>();
    const countryKey = new Map<string, string>();
    for (const c of camps.data ?? []) for (const a of (c as any).meta_adsets ?? []) {
      if (!a.meta_id) continue;
      adsetCountry.set(a.meta_id, adsetLabel(a));
      for (const x of adsetCountries(a)) countryKey.set(x, adsetLabel(a));
    }
    for (const r of insights.data ?? []) {
      const c = adsetCountry.get(r.meta_id);
      if (!c) continue;
      const m = get(c);
      m.spend += Number(r.spend);
      m.clicks += Number(r.clicks);
      m.impressions += Number(r.impressions);
    }
    for (const a of apps.data ?? []) {
      const key = countryKey.get(a.country);
      if (!key) continue;
      const m = get(key);
      m.apps++;
      if ((a.utm as any)?.utm_source === "meta") m.metaApps++;
      if (["signed", "active"].includes(a.status)) m.signed++;
    }
    return [...byCountry.entries()].sort((a, b) => b[1].spend - a[1].spend);
  }, [camps.data, insights.data, apps.data]);

  return (
    <div>
      <PageHeader
        title="Campagnes Meta"
        description="Campagnes de recrutement (Marketing API), catégorie spéciale Emploi."
        actions={<>
          <Button variant="secondary" loading={busy === "sync"} onClick={() => act("sync", () => callFn("meta", { action: "sync_insights" }), "Métriques synchronisées")}><RefreshCw className="h-4 w-4" /> Synchroniser les métriques</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nouvelle campagne</Button>
        </>}
      />
      <LaunchChecklist />
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="flex items-start gap-4 rounded-xl border border-[#ffe3b0] bg-tint-yellow p-5 lg:col-span-2">
          <IconTile icon={<ShieldCheck />} tint="yellow" className="bg-white" />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-foreground">Tout est créé en PAUSED</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
              Activation et budgets : clic admin uniquement, jamais automatique. Plafond <b className="text-foreground">{cap} €/jour</b> par ad set,
              <b className="text-foreground"> {globalCap} €/jour</b> au total (Réglages → Intégrations → Meta).
            </p>
          </div>
        </div>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <IconTile icon={<Wallet />} tint={committed > globalCap * 0.9 ? "red" : "blue"} />
            <div>
              <p className="text-[13px] font-medium text-muted-foreground">Budgets engagés / jour</p>
              <p className="tabular text-[22px] font-semibold leading-tight">{committed} € <span className="text-sm font-normal text-subtle-foreground">/ {globalCap} €</span></p>
            </div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f1f3f7]">
            <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, (committed / Math.max(globalCap, 1)) * 100))}%`, background: committed > globalCap * 0.9 ? "#fe504f" : "#004dff" }} />
          </div>
          <p className="mt-2 text-xs text-subtle-foreground">Actifs + en pause · dont actifs : {activeBudget} €</p>
          <Button size="sm" className="mt-3 w-full" loading={busy === "pending"} onClick={createPending}><Upload className="h-3.5 w-3.5" /> Créer les pubs</Button>
          <p className="mt-1.5 text-[11px] leading-snug text-subtle-foreground">
            {pendingState.data?.blocked === "app_dev_mode" ? "En attente : app Meta en mode développement (réessai automatique chaque heure)." : "Créas validées → pubs PAUSED, aussi automatiquement chaque heure."}
          </p>
        </Card>
      </div>

      {camps.isLoading ? <Spinner /> : (camps.data ?? []).length === 0 ? (
        <Empty title="Aucune campagne" icon={<Megaphone className="h-5 w-5" />} action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nouvelle campagne</Button>}>Crée une campagne : un ad set par pays (ou par zone A/B/C), budget réglable, tout en PAUSED. Génère d'abord des créas dans Recrutement → Créas, puis « Pousser les créas ».</Empty>
      ) : (
        <div className="space-y-4">
          {(camps.data ?? []).map((c: any) => {
            const total = (c.meta_adsets ?? []).reduce((s: number, a: any) => s + Number(a.daily_budget), 0);
            return (
              <Card key={c.id} className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <IconTile icon={<Megaphone />} tint="blue" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-[15px] font-semibold">{c.name}</h3><StatusBadge s={c.status} /></div>
                      <p className="mt-0.5 text-xs text-subtle-foreground">Meta {c.meta_id} · créée {dateFr(c.created_at)} · {c.countries.map(flag).join(" ")} · <span className="tabular">{total} €/j</span></p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" loading={busy === `push-${c.id}`} onClick={() => pushCreatives(c)}><Upload className="h-3.5 w-3.5" /> Pousser les créas</Button>
                    {c.status === "ACTIVE"
                      ? <Button size="sm" variant="secondary" loading={busy === `pause-${c.id}`} onClick={() => pause("campaign", c)}><Pause className="h-3.5 w-3.5" /> Pause</Button>
                      : <Button size="sm" variant="secondary" loading={busy === `act-${c.id}`} onClick={() => activate("campaign", c, total)}><Play className="h-3.5 w-3.5" /> Activer</Button>}
                  </div>
                </div>
                <Table className="rounded-none rounded-b-xl border-x-0 border-b-0 shadow-none">
                  <thead><tr><Th>Ad set</Th><Th>Statut</Th><Th>Zone</Th><Th>Budget / jour</Th><Th>Pubs</Th><Th /></tr></thead>
                  <tbody>
                    {(c.meta_adsets ?? []).map((a: any) => (
                      <tr key={a.id}>
                        <Td><span className="mr-1.5">{a.country ? flag(a.country) : adsetCountries(a).map(flag).join("")}</span><span className="font-medium">{a.name}</span></Td>
                        <Td><StatusBadge s={a.status} /></Td>
                        <Td className="text-muted-foreground">{a.zone_code ?? "—"}</Td>
                        <Td><BudgetEditor value={Number(a.daily_budget)} max={cap} busy={busy === `budget-${a.id}`} onApply={(v) => setBudget(a, v)} /></Td>
                        <Td>
                          {(a.meta_ads ?? []).length === 0 ? <span className="text-xs text-subtle-foreground">Aucune</span> : (
                            <div className="space-y-1">
                              {a.meta_ads.map((ad: any) => (
                                <div key={ad.id} className="flex items-center gap-2 text-xs">
                                  <span className="max-w-56 truncate">{ad.name}</span><StatusBadge s={ad.status} />
                                  {ad.status === "ACTIVE"
                                    ? <button className="text-accent hover:underline" onClick={() => pause("ad", ad)}>Pause</button>
                                    : <button className="text-accent hover:underline" onClick={() => activate("ad", ad, Number(a.daily_budget))}>Activer</button>}
                                </div>
                              ))}
                            </div>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-right">
                          <Button size="sm" variant="ghost" onClick={() => setAdFor(a)}><Plus className="h-3.5 w-3.5" /> Pub</Button>{" "}
                          {a.status === "ACTIVE"
                            ? <Button size="sm" variant="secondary" loading={busy === `pause-${a.id}`} onClick={() => pause("adset", a)}>Pause</Button>
                            : <Button size="sm" variant="secondary" loading={busy === `act-${a.id}`} onClick={() => activate("adset", a, Number(a.daily_budget))}>Activer</Button>}{" "}
                          {a.status !== "ARCHIVED" && a.status !== "ACTIVE" && <Button size="sm" variant="ghost" loading={busy === `arch-${a.id}`} onClick={() => archive("adset", a)} title="Archiver sur Meta (irréversible)">Archiver</Button>}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-8 p-0">
        <div className="px-6 pt-5"><CardTitle title="Métriques par pays" description="7 derniers jours · CPL = dépense / candidatures venues de Meta (UTM), sinon toutes les candidatures du pays · coût / signé = dépense / créateurs signés" /></div>
        <Table className="rounded-none rounded-b-xl border-x-0 border-b-0 shadow-none">
          <thead><tr><Th>Pays / zone</Th><Th num>Dépense</Th><Th num>Impressions</Th><Th num>Clics</Th><Th num>CPC</Th><Th num>Candidatures</Th><Th num>dont Meta</Th><Th num>Signés</Th><Th num>CPL</Th><Th num>Coût / signé</Th></tr></thead>
          <tbody>
            {metrics.length === 0 ? <tr><Td colSpan={10} className="text-center text-muted-foreground"><span className="inline-flex items-center gap-2 py-4"><BarChart3 className="h-4 w-4" /> Pas encore de métriques. Synchronise après diffusion.</span></Td></tr> : metrics.map(([c, m]) => (
              <tr key={c}>
                <Td className="font-medium">{/^[A-Z]{2}$/.test(c) ? `${flag(c)} ${c}` : c}</Td><Td num>{m.spend.toFixed(2)} €</Td><Td num>{m.impressions}</Td><Td num>{m.clicks}</Td>
                <Td num>{m.clicks ? (m.spend / m.clicks).toFixed(2) + " €" : "—"}</Td><Td num>{m.apps}</Td><Td num>{m.metaApps}</Td><Td num>{m.signed}</Td>
                <Td num>{costPer(m.spend, m.metaApps || m.apps) ?? "—"}{costPer(m.spend, m.metaApps || m.apps) !== null && " €"}</Td>
                <Td num>{costPer(m.spend, m.signed) ?? "—"}{costPer(m.spend, m.signed) !== null && " €"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <NewCampaignDialog open={open} onClose={() => setOpen(false)} cap={cap} countries={(countries.data ?? []).filter((c: any) => c.open)}
        defaultLanding={landing.data?.base_url || location.origin}
        onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["meta_campaigns"] }); }} />
      <AddAdDialog adset={adFor} onClose={() => setAdFor(null)} onCreated={() => { setAdFor(null); qc.invalidateQueries({ queryKey: ["meta_campaigns"] }); }} />
    </div>
  );
}

function BudgetEditor({ value, max, busy, onApply }: { value: number; max: number; busy: boolean; onApply: (v: number) => void }) {
  const [v, setV] = useState(value);
  return (
    <span className="flex items-center gap-1">
      <Input type="number" min={1} max={max} step="0.5" className="tabular h-8 w-20 text-right text-[13px]" value={v} onChange={(e) => setV(Number(e.target.value))} />
      <span className="text-xs text-subtle-foreground">€/j</span>
      <Button size="sm" variant={v === value ? "ghost" : "default"} disabled={v === value || v <= 0 || v > max} loading={busy} onClick={() => onApply(v)}>Appliquer</Button>
    </span>
  );
}

function NewCampaignDialog({ open, onClose, cap, countries, defaultLanding, onCreated }: { open: boolean; onClose: () => void; cap: number; countries: any[]; defaultLanding: string; onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("Recrutement créateurs");
  const [sel, setSel] = useState<string[]>([]);
  const [mode, setMode] = useState<"country" | "zone">("country");
  const [budget, setBudget] = useState(5);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [landing, setLanding] = useState("");
  const [busy, setBusy] = useState(false);
  const [objective, setObjective] = useState<"leads" | "traffic">("leads");
  const [q, setQ] = useState("");
  const zoneOf = (code: string) => countries.find((c) => c.code === code)?.zone_code ?? "?";
  const groups = mode === "zone" ? [...new Set(sel.map(zoneOf))].sort() : sel;
  const budgetOf = (k: string) => budgets[k] ?? budget;
  const total = groups.reduce((sum, k) => sum + budgetOf(k), 0);
  const submit = async () => {
    if (!sel.length) return toast("Choisis au moins un pays", "danger");
    const bad = groups.find((k) => budgetOf(k) <= 0 || budgetOf(k) > cap);
    if (bad) return toast(`Budget ${bad} : entre 0 et ${cap} €`, "danger");
    setBusy(true);
    try {
      await callFn("meta", {
        action: "create_campaign", name, countries: sel, daily_budget: budget, by_zone: mode === "zone",
        budgets: Object.fromEntries(groups.map((k) => [k, budgetOf(k)])), landing_base_url: landing || defaultLanding, objective,
      });
      toast("Campagne créée en PAUSED", "success");
      setSel([]);
      setBudgets({});
      onCreated();
    } catch (e) {
      toast((e as Error).message, "danger");
    } finally {
      setBusy(false);
    }
  };
  const shown = countries.filter((c) => !q || `${c.name} ${c.code}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog open={open} onClose={onClose} title="Nouvelle campagne (PAUSED)" wide footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={busy} onClick={submit}>Créer en PAUSED · {total} €/j</Button></>}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <Field label="Nom"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Objectif" hint="Prospects : Meta optimise sur les candidatures (événement Lead du pixel). Trafic : sur les vues de la landing.">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={objective === "leads"} onChange={() => setObjective("leads")} /> Prospects (Lead)</label>
              <label className="flex items-center gap-2"><input type="radio" checked={objective === "traffic"} onChange={() => setObjective("traffic")} /> Trafic</label>
            </div>
          </Field>
          <Field label="Découpage">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={mode === "country"} onChange={() => setMode("country")} /> Un ad set par pays</label>
              <label className="flex items-center gap-2"><input type="radio" checked={mode === "zone"} onChange={() => setMode("zone")} /> Un ad set par zone (A/B/C)</label>
            </div>
          </Field>
          <Field label={`Pays (${sel.length})`} hint="Catégorie Emploi : pays + langue du pays + Advantage+ audience, 18–65. Ni genre, ni intérêts, ni code postal.">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {["A", "B", "C"].map((z) => <Button key={z} size="sm" variant="outline" onClick={() => setSel([...new Set([...sel, ...countries.filter((c) => c.zone_code === z).map((c) => c.code)])])}>+ Zone {z}</Button>)}
              <Button size="sm" variant="ghost" onClick={() => setSel([])}>Aucun</Button>
            </div>
            <Input placeholder="Filtrer…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
            <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-xl border p-2 text-sm">
              {shown.map((c) => (
                <label key={c.code} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted">
                  <input type="checkbox" checked={sel.includes(c.code)} onChange={(e) => setSel(e.target.checked ? [...sel, c.code] : sel.filter((x) => x !== c.code))} />
                  {flag(c.code)} {c.name} <span className="text-xs text-muted-foreground">{c.zone_code}</span>
                </label>
              ))}
            </div>
          </Field>
        </div>
        <div className="space-y-4">
          <Field label="Budget par défaut (€/jour par ad set)" hint={`Plafond : ${cap} € par ad set`}><Input type="number" min={1} max={cap} step="0.5" value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></Field>
          <Field label={`Budget par ${mode === "zone" ? "zone" : "pays"}`}>
            {groups.length === 0 ? <p className="text-xs text-muted-foreground">Choisis des pays.</p> : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border p-2">
                {groups.map((k) => (
                  <div key={k} className="flex items-center justify-between gap-2 text-sm">
                    <span>{mode === "zone" ? `Zone ${k} (${sel.filter((x) => zoneOf(x) === k).length} pays)` : `${flag(k)} ${k}`}</span>
                    <span className="flex items-center gap-1"><Input type="number" min={1} max={cap} step="0.5" className="h-7 w-20 text-xs" value={budgetOf(k)} onChange={(e) => setBudgets({ ...budgets, [k]: Number(e.target.value) })} /> €</span>
                  </div>
                ))}
              </div>
            )}
          </Field>
          <p className="text-sm">Total : <b>{total} €/jour</b> (tout reste en PAUSED jusqu'à ton clic « Activer »)</p>
          <Field label="URL de base de la landing" hint="Les pubs pointent vers /join/<pays> avec UTM."><Input placeholder={defaultLanding} value={landing} onChange={(e) => setLanding(e.target.value)} /></Field>
        </div>
      </div>
    </Dialog>
  );
}

function AddAdDialog({ adset, onClose, onCreated }: { adset: any | null; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const creatives = useQuery({
    queryKey: ["creatives_approved", adset?.id],
    enabled: !!adset,
    queryFn: async () => {
      const list: string[] = adset.country ? [adset.country] : adset.targeting?.countries ?? [];
      return (await supabase.from("recruitment_creatives").select("*").eq("status", "approved").in("country", list)).data ?? [];
    },
  });
  const pick = async (cr: any) => {
    setBusy(cr.id);
    try {
      await callFn("meta", { action: "create_ad", adset_id: adset.id, creative_id: cr.id });
      toast("Pub créée en PAUSED", "success");
      onCreated();
    } catch (e) {
      toast((e as Error).message, "danger");
    } finally {
      setBusy(null);
    }
  };
  return (
    <Dialog open={!!adset} onClose={onClose} title={`Ajouter une pub — ${adset?.country ?? `zone ${adset?.zone_code ?? ""}`}`} wide>
      {creatives.isLoading ? <Spinner /> : (creatives.data ?? []).length === 0 ? (
        <Empty title="Aucune créa validée pour ce pays">Génère et valide des créas dans Recrutement → Créas.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(creatives.data ?? []).map((cr: any) => (
            <button key={cr.id} disabled={!!busy} onClick={() => pick(cr)} className="overflow-hidden rounded-xl border text-left transition-shadow hover:ring-2 hover:ring-accent/40">
              {cr.image_path ? <img src={supabase.storage.from("creatives").getPublicUrl(cr.image_path).data.publicUrl} className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-muted" />}
              <div className="p-2 text-xs">{cr.format} · {cr.headline}{busy === cr.id && " …"}</div>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}

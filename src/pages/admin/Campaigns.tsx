import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Plus, RefreshCw, ShieldAlert, Upload } from "lucide-react";
import { supabase, callFn } from "@/lib/supabase";
import { useCountries, useSetting } from "@/lib/hooks";
import { costPer } from "@shared/meta.ts";
import { Badge, Button, Card, Dialog, Empty, Field, Input, PageHeader, Spinner, Table, Td, Th, useToast } from "@/components/ui";
import { dateFr, flag } from "@/lib/utils";

const statusTone = (s: string) => (s === "ACTIVE" ? "success" : s === "PAUSED" ? "warning" : "default") as any;

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
    act(`act-${row.id}`, () => callFn("meta", { action: "activate", level, id: row.id }), "Activé");
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
          <Button variant="outline" loading={busy === "sync"} onClick={() => act("sync", () => callFn("meta", { action: "sync_insights" }), "Métriques synchronisées")}><RefreshCw className="h-4 w-4" /> Synchroniser les métriques</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nouvelle campagne</Button>
        </>}
      />
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Tout est créé en PAUSED. Activation et budgets : clic admin uniquement. Plafond {cap} €/jour par ad set, {globalCap} €/jour au total.</p>
          <p className="text-muted-foreground">Aucune campagne, ad set ou pub n'est jamais activé automatiquement. Les plafonds se règlent dans Réglages → Intégrations → Meta.</p>
          <div className="mt-3 max-w-xl">
            <div className="mb-1 flex justify-between text-xs"><span>Budgets engagés (ad sets actifs + en pause) : <b>{committed} €</b> / {globalCap} €/jour</span><span className="text-muted-foreground">dont actifs : {activeBudget} €</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div className={`h-full ${committed > globalCap * 0.9 ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.min(100, (committed / Math.max(globalCap, 1)) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {camps.isLoading ? <Spinner /> : (camps.data ?? []).length === 0 ? (
        <Empty title="Aucune campagne">Crée une campagne : un ad set par pays (ou par zone A/B/C), budget réglable, tout en PAUSED. Génère d'abord des créas dans Recrutement → Créas, puis « Pousser les créas ».</Empty>
      ) : (
        <div className="space-y-4">
          {(camps.data ?? []).map((c: any) => {
            const total = (c.meta_adsets ?? []).reduce((s: number, a: any) => s + Number(a.daily_budget), 0);
            return (
              <Card key={c.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><h3 className="font-semibold">{c.name}</h3><Badge tone={statusTone(c.status)}>{c.status}</Badge></div>
                    <p className="text-xs text-muted-foreground">Meta {c.meta_id} · créée {dateFr(c.created_at)} · {c.countries.map(flag).join(" ")} · budget total {total} €/j</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" loading={busy === `push-${c.id}`} onClick={() => pushCreatives(c)}><Upload className="h-3.5 w-3.5" /> Pousser les créas</Button>
                    {c.status === "ACTIVE"
                      ? <Button size="sm" variant="outline" loading={busy === `pause-${c.id}`} onClick={() => pause("campaign", c)}><Pause className="h-3.5 w-3.5" /> Pause</Button>
                      : <Button size="sm" variant="outline" loading={busy === `act-${c.id}`} onClick={() => activate("campaign", c, total)}><Play className="h-3.5 w-3.5" /> Activer</Button>}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {(c.meta_adsets ?? []).map((a: any) => (
                    <div key={a.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm"><span className="mr-1">{a.country ? flag(a.country) : adsetCountries(a).map(flag).join("")}</span><span className="font-medium">{a.name}</span> <Badge tone={statusTone(a.status)}>{a.status}</Badge> <span className="text-muted-foreground">· zone {a.zone_code ?? "?"}</span></div>
                        <div className="flex flex-wrap items-center gap-2">
                          <BudgetEditor value={Number(a.daily_budget)} max={cap} busy={busy === `budget-${a.id}`} onApply={(v) => setBudget(a, v)} />
                          <Button size="sm" variant="ghost" onClick={() => setAdFor(a)}><Plus className="h-3.5 w-3.5" /> Ajouter une pub</Button>
                          {a.status === "ACTIVE"
                            ? <Button size="sm" variant="outline" loading={busy === `pause-${a.id}`} onClick={() => pause("adset", a)}>Pause</Button>
                            : <Button size="sm" variant="outline" loading={busy === `act-${a.id}`} onClick={() => activate("adset", a, Number(a.daily_budget))}>Activer</Button>}
                        </div>
                      </div>
                      {(a.meta_ads ?? []).length > 0 && (
                        <ul className="mt-2 space-y-1 pl-6 text-sm">
                          {a.meta_ads.map((ad: any) => (
                            <li key={ad.id} className="flex items-center justify-between gap-2">
                              <span className="truncate">{ad.name} <Badge tone={statusTone(ad.status)}>{ad.status}</Badge></span>
                              {ad.status === "ACTIVE"
                                ? <Button size="sm" variant="ghost" onClick={() => pause("ad", ad)}>Pause</Button>
                                : <Button size="sm" variant="ghost" onClick={() => activate("ad", ad, Number(a.daily_budget))}>Activer</Button>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-lg font-semibold">Métriques par pays (7 derniers jours)</h2>
      <Table>
        <thead><tr><Th>Pays / zone</Th><Th>Dépense</Th><Th>Impressions</Th><Th>Clics</Th><Th>CPC</Th><Th>Candidatures</Th><Th>dont Meta (UTM)</Th><Th>Signés</Th><Th>CPL</Th><Th>Coût / signé</Th></tr></thead>
        <tbody>
          {metrics.length === 0 ? <tr><Td colSpan={10} className="text-center text-muted-foreground">Pas encore de métriques. Synchronise après diffusion.</Td></tr> : metrics.map(([c, m]) => (
            <tr key={c}>
              <Td>{/^[A-Z]{2}$/.test(c) ? `${flag(c)} ${c}` : c}</Td><Td>{m.spend.toFixed(2)} €</Td><Td>{m.impressions}</Td><Td>{m.clicks}</Td>
              <Td>{m.clicks ? (m.spend / m.clicks).toFixed(2) + " €" : "—"}</Td><Td>{m.apps}</Td><Td>{m.metaApps}</Td><Td>{m.signed}</Td>
              <Td>{costPer(m.spend, m.metaApps || m.apps) ?? "—"}{costPer(m.spend, m.metaApps || m.apps) !== null && " €"}</Td>
              <Td>{costPer(m.spend, m.signed) ?? "—"}{costPer(m.spend, m.signed) !== null && " €"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <p className="mt-2 text-xs text-muted-foreground">CPL = dépense / candidatures venues de Meta (UTM utm_source=meta), ou toutes les candidatures du pays si aucune UTM. Coût / signé = dépense / créateurs signés.</p>

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
      <Input type="number" min={1} max={max} step="0.5" className="h-8 w-20 text-xs" value={v} onChange={(e) => setV(Number(e.target.value))} />
      <span className="text-xs text-muted-foreground">€/j</span>
      <Button size="sm" variant="outline" disabled={v === value || v <= 0 || v > max} loading={busy} onClick={() => onApply(v)}>Appliquer</Button>
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
        budgets: Object.fromEntries(groups.map((k) => [k, budgetOf(k)])), landing_base_url: landing || defaultLanding,
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
          <Field label="Découpage">
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" checked={mode === "country"} onChange={() => setMode("country")} /> Un ad set par pays</label>
              <label className="flex items-center gap-2"><input type="radio" checked={mode === "zone"} onChange={() => setMode("zone")} /> Un ad set par zone (A/B/C)</label>
            </div>
          </Field>
          <Field label={`Pays (${sel.length})`} hint="Ciblage 18–65 (catégorie Emploi : âge fin et intérêts interdits par Meta).">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {["A", "B", "C"].map((z) => <Button key={z} size="sm" variant="outline" onClick={() => setSel([...new Set([...sel, ...countries.filter((c) => c.zone_code === z).map((c) => c.code)])])}>+ Zone {z}</Button>)}
              <Button size="sm" variant="ghost" onClick={() => setSel([])}>Aucun</Button>
            </div>
            <Input placeholder="Filtrer…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
            <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-2 text-sm">
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
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
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
            <button key={cr.id} disabled={!!busy} onClick={() => pick(cr)} className="overflow-hidden rounded-lg border text-left hover:ring-2 hover:ring-ring">
              {cr.image_path ? <img src={supabase.storage.from("creatives").getPublicUrl(cr.image_path).data.publicUrl} className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-muted" />}
              <div className="p-2 text-xs">{cr.format} · {cr.headline}{busy === cr.id && " …"}</div>
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}

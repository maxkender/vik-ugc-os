import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Plus, RefreshCw, ShieldAlert } from "lucide-react";
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

  // Métriques par pays
  const metrics = useMemo(() => {
    const byCountry = new Map<string, { spend: number; clicks: number; impressions: number; apps: number; metaApps: number; signed: number }>();
    const get = (c: string) => byCountry.get(c) ?? (byCountry.set(c, { spend: 0, clicks: 0, impressions: 0, apps: 0, metaApps: 0, signed: 0 }), byCountry.get(c)!);
    const adsetCountry = new Map<string, string>();
    for (const c of camps.data ?? []) for (const a of (c as any).meta_adsets ?? []) if (a.meta_id && a.country) adsetCountry.set(a.meta_id, a.country);
    for (const r of insights.data ?? []) {
      const c = adsetCountry.get(r.meta_id);
      if (!c) continue;
      const m = get(c);
      m.spend += Number(r.spend);
      m.clicks += Number(r.clicks);
      m.impressions += Number(r.impressions);
    }
    for (const a of apps.data ?? []) {
      if (!adsetCountry.size || ![...adsetCountry.values()].includes(a.country)) continue;
      const m = get(a.country);
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
          <p className="font-semibold">Tout est créé en PAUSED. Activation manuelle réservée à l'admin, plafond budget/jour : {cap} €</p>
          <p className="text-muted-foreground">Aucune campagne, ad set ou pub n'est jamais activé automatiquement. Le plafond se règle dans Réglages → Intégrations.</p>
        </div>
      </div>

      {camps.isLoading ? <Spinner /> : (camps.data ?? []).length === 0 ? (
        <Empty title="Aucune campagne">Crée une campagne : un ad set par pays, tout en PAUSED.</Empty>
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
                    {c.status === "ACTIVE"
                      ? <Button size="sm" variant="outline" loading={busy === `pause-${c.id}`} onClick={() => pause("campaign", c)}><Pause className="h-3.5 w-3.5" /> Pause</Button>
                      : <Button size="sm" variant="outline" loading={busy === `act-${c.id}`} onClick={() => activate("campaign", c, total)}><Play className="h-3.5 w-3.5" /> Activer</Button>}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {(c.meta_adsets ?? []).map((a: any) => (
                    <div key={a.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm"><span className="mr-1">{flag(a.country)}</span><span className="font-medium">{a.name}</span> <Badge tone={statusTone(a.status)}>{a.status}</Badge> <span className="text-muted-foreground">· {a.daily_budget} €/j · zone {a.zone_code ?? "?"}</span></div>
                        <div className="flex gap-2">
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
        <thead><tr><Th>Pays</Th><Th>Dépense</Th><Th>Impressions</Th><Th>Clics</Th><Th>CPC</Th><Th>Candidatures</Th><Th>dont Meta (UTM)</Th><Th>Signés</Th><Th>Coût / candidature</Th><Th>Coût / signé</Th></tr></thead>
        <tbody>
          {metrics.length === 0 ? <tr><Td colSpan={10} className="text-center text-muted-foreground">Pas encore de métriques. Synchronise après diffusion.</Td></tr> : metrics.map(([c, m]) => (
            <tr key={c}>
              <Td>{flag(c)} {c}</Td><Td>{m.spend.toFixed(2)} €</Td><Td>{m.impressions}</Td><Td>{m.clicks}</Td>
              <Td>{m.clicks ? (m.spend / m.clicks).toFixed(2) + " €" : "—"}</Td><Td>{m.apps}</Td><Td>{m.metaApps}</Td><Td>{m.signed}</Td>
              <Td>{costPer(m.spend, m.metaApps || m.apps) ?? "—"}{costPer(m.spend, m.metaApps || m.apps) !== null && " €"}</Td>
              <Td>{costPer(m.spend, m.signed) ?? "—"}{costPer(m.spend, m.signed) !== null && " €"}</Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <NewCampaignDialog open={open} onClose={() => setOpen(false)} cap={cap} countries={(countries.data ?? []).filter((c: any) => c.open)}
        defaultLanding={landing.data?.base_url || location.origin}
        onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["meta_campaigns"] }); }} />
      <AddAdDialog adset={adFor} onClose={() => setAdFor(null)} onCreated={() => { setAdFor(null); qc.invalidateQueries({ queryKey: ["meta_campaigns"] }); }} />
    </div>
  );
}

function NewCampaignDialog({ open, onClose, cap, countries, defaultLanding, onCreated }: { open: boolean; onClose: () => void; cap: number; countries: any[]; defaultLanding: string; onCreated: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("Recrutement créateurs");
  const [sel, setSel] = useState<string[]>([]);
  const [budget, setBudget] = useState(5);
  const [landing, setLanding] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const submit = async () => {
    if (!sel.length) return toast("Choisis au moins un pays", "danger");
    if (budget <= 0 || budget > cap) return toast(`Budget entre 0 et ${cap} €`, "danger");
    setBusy(true);
    try {
      await callFn("meta", { action: "create_campaign", name, countries: sel, daily_budget: budget, landing_base_url: landing || defaultLanding });
      toast("Campagne créée en PAUSED", "success");
      setSel([]);
      onCreated();
    } catch (e) {
      toast((e as Error).message, "danger");
    } finally {
      setBusy(false);
    }
  };
  const shown = countries.filter((c) => !q || `${c.name} ${c.code}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Dialog open={open} onClose={onClose} title="Nouvelle campagne (PAUSED)" footer={<><Button variant="outline" onClick={onClose}>Annuler</Button><Button loading={busy} onClick={submit}>Créer en PAUSED</Button></>}>
      <div className="space-y-4">
        <Field label="Nom"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label={`Pays (${sel.length})`} hint="Un ad set par pays, ciblage 18–65 (catégorie Emploi : âge fin et intérêts interdits par Meta).">
          <Input placeholder="Filtrer…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-2" />
          <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-2 text-sm">
            {shown.map((c) => (
              <label key={c.code} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted">
                <input type="checkbox" checked={sel.includes(c.code)} onChange={(e) => setSel(e.target.checked ? [...sel, c.code] : sel.filter((x) => x !== c.code))} />
                {flag(c.code)} {c.name} <span className="text-xs text-muted-foreground">{c.zone_code}</span>
              </label>
            ))}
          </div>
        </Field>
        <Field label="Budget journalier par pays (€)" hint={`Plafond : ${cap} €`}><Input type="number" min={1} max={cap} step="0.5" value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></Field>
        <Field label="URL de base de la landing" hint="Les pubs pointent vers /join/<pays> avec UTM."><Input placeholder={defaultLanding} value={landing} onChange={(e) => setLanding(e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}

function AddAdDialog({ adset, onClose, onCreated }: { adset: any | null; onClose: () => void; onCreated: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const creatives = useQuery({
    queryKey: ["creatives_approved", adset?.country],
    enabled: !!adset,
    queryFn: async () => (await supabase.from("recruitment_creatives").select("*").eq("status", "approved").eq("country", adset.country)).data ?? [],
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
    <Dialog open={!!adset} onClose={onClose} title={`Ajouter une pub — ${adset?.country ?? ""}`} wide>
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

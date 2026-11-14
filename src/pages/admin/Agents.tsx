import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Play, Plus, RefreshCw } from "lucide-react";
import { Badge, Button, Dialog, Field, Input, PageHeader, Select, Stat, Switch, Table, Td, Th, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useApps, useCompetitors, useSetting } from "@/lib/hooks";
import { ago, dateFr } from "@/lib/utils";

const PLATFORM: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", facebook_ads: "Meta Ad Library", views: "Relevé de vues", download: "Archivage MP4" };
const KIND: Record<string, string> = { account: "Compte", hashtag: "Hashtag", keyword: "Mot-clé", page: "Page" };
const STATUS_TONE: Record<string, any> = { succeeded: "success", failed: "danger", running: "accent", queued: "default", aborted: "warning" };

export default function Agents() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: apify } = useSetting("apify");
  const { data: apps } = useApps();
  const { data: comps } = useCompetitors();
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const { data: sources } = useQuery({ queryKey: ["sources"], queryFn: async () => (await supabase.from("sources").select("*").order("platform").order("value")).data ?? [] });
  const { data: stats } = useQuery({ queryKey: ["agent_stats"], queryFn: async () => (await supabase.rpc("agent_stats")).data ?? [], refetchInterval: 20_000 });
  const { data: runs } = useQuery({ queryKey: ["runs"], queryFn: async () => (await supabase.from("agent_runs").select("*, sources(value, platform, kind)").order("started_at", { ascending: false }).limit(40)).data ?? [], refetchInterval: 15_000 });
  const statOf = (id: string) => (stats ?? []).find((s: any) => s.source_id === id);
  const monthCost = useMemo(() => {
    const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
    return (runs ?? []).filter((r: any) => new Date(r.started_at) >= start).reduce((s: number, r: any) => s + Number(r.cost_usd ?? 0), 0);
  }, [runs]);
  const { data: totalVideos } = useQuery({ queryKey: ["videos_count"], queryFn: async () => (await supabase.from("videos").select("id", { count: "estimated", head: true })).count ?? 0 });

  const refresh = () => ["sources", "agent_stats", "runs", "videos_count"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const run = async (key: string, body: any, msg: string) => {
    setBusy(key);
    try { await callFn("collect", body); toast(msg, "success"); refresh(); }
    catch (e) { toast((e as Error).message, "danger"); }
    finally { setBusy(null); }
  };
  const toggle = async (s: any, enabled: boolean) => {
    await supabase.from("sources").update({ enabled, next_run_at: enabled ? new Date().toISOString() : null }).eq("id", s.id);
    refresh();
  };
  const list = (sources ?? []).filter((s: any) => !filter || s.platform === filter);
  const compName = (id: string | null) => comps?.find((c: any) => c.id === id)?.name ?? "—";

  return (
    <div>
      <PageHeader title="Agents de collecte" description="Chaque source est un agent Apify (TikTok, Instagram, Meta Ad Library). Désactivées par défaut : active celles à suivre, ou lance-les à la main."
        actions={<>
          <Button variant="outline" onClick={() => run("poll", { action: "poll" }, "Runs synchronisés")} loading={busy === "poll"}><RefreshCw className="h-4 w-4" /> Synchroniser les runs</Button>
          <Button variant="outline" onClick={() => run("measure", { action: "measure_due", force: true }, "Relevé des vues lancé")} loading={busy === "measure"}>Relever les vues J+2/J+7</Button>
          <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Source</Button>
        </>} />

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Vidéos en base" value={new Intl.NumberFormat("fr").format(totalVideos ?? 0)} />
        <Stat label="Sources actives" value={`${(sources ?? []).filter((s: any) => s.enabled).length} / ${(sources ?? []).length}`} />
        <Stat label="Coût Apify du mois" value={`${monthCost.toFixed(2)} $`} hint={`Budget : ${apify?.monthly_budget_usd ?? "?"} $ · plafond ${apify?.hard_cap_per_run ?? "?"} vidéos/run`} />
        <Stat label="Collecte planifiée" value={apify?.collect_cron_enabled ? "Activée" : "Désactivée"} hint={<Link className="underline" to="/admin/settings/integrations">Réglages → Intégrations</Link>} />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Select className="h-8 w-48 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Toutes les plateformes</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook_ads">Meta Ad Library</option>
        </Select>
      </div>
      <Table className="mb-10">
        <thead><tr><Th>Active</Th><Th>Plateforme</Th><Th>Source</Th><Th>Concurrent</Th><Th>Fréquence</Th><Th>Plafond</Th><Th>Vidéos</Th><Th>Dernier run</Th><Th>Coût (mois)</Th><Th /></tr></thead>
        <tbody>
          {list.map((s: any) => {
            const st = statOf(s.id);
            return (
              <tr key={s.id} className="hover:bg-muted/40">
                <Td><Switch checked={s.enabled} onChange={(v) => toggle(s, v)} /></Td>
                <Td>{PLATFORM[s.platform]}</Td>
                <Td><span className="text-xs text-muted-foreground">{KIND[s.kind]}</span> <span className="font-medium">{s.kind === "account" ? "@" : s.kind === "hashtag" ? "#" : ""}{s.value}</span> {s.languages?.length > 0 && <Badge tone="outline">{s.languages.join(", ")}</Badge>}</Td>
                <Td>{compName(s.competitor_id)}</Td>
                <Td>{s.frequency_hours} h</Td>
                <Td>{s.max_results}</Td>
                <Td>{st?.videos ?? 0}</Td>
                <Td>
                  {st?.last_run_at ? <span className="flex items-center gap-2"><Badge tone={STATUS_TONE[st.last_status]}>{st.last_status}</Badge><span className="text-xs text-muted-foreground">{ago(st.last_run_at)}</span></span> : <span className="text-xs text-muted-foreground">jamais</span>}
                  {st?.last_error && <p className="mt-1 max-w-64 truncate text-xs text-danger" title={st.last_error}>{st.last_error}</p>}
                </Td>
                <Td>{Number(st?.cost_month ?? 0).toFixed(3)} $</Td>
                <Td><Button size="sm" variant="outline" loading={busy === s.id} onClick={() => run(s.id, { action: "run_source", source_id: s.id }, "Run lancé")}><Play className="h-3.5 w-3.5" /> Lancer</Button></Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <h2 className="mb-3 text-lg font-semibold">Derniers runs</h2>
      <Table>
        <thead><tr><Th>Début</Th><Th>Agent</Th><Th>Source / paramètres</Th><Th>Déclencheur</Th><Th>Statut</Th><Th>Trouvées</Th><Th>Nouvelles</Th><Th>Coût</Th></tr></thead>
        <tbody>
          {(runs ?? []).map((r: any) => (
            <tr key={r.id}>
              <Td className="whitespace-nowrap text-xs">{dateFr(r.started_at, true)}</Td>
              <Td>{PLATFORM[r.agent] ?? r.agent}</Td>
              <Td className="max-w-72 truncate text-xs">{r.sources ? `${KIND[r.sources.kind]} ${r.sources.value}` : r.params?.spec ? `${KIND[r.params.spec.kind] ?? ""} ${r.params.spec.value}` : r.agent === "views" ? `${r.params?.targets?.length ?? 0} vidéo(s)` : "—"}</Td>
              <Td className="text-xs">{r.trigger}</Td>
              <Td><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>{r.error && <p className="max-w-64 truncate text-xs text-danger" title={r.error}>{r.error}</p>}</Td>
              <Td>{r.items_found}</Td>
              <Td>{r.items_new}</Td>
              <Td className="text-xs">{r.cost_usd !== null ? `${Number(r.cost_usd).toFixed(3)} $` : `~${Number(r.params?.estimated_cost_usd ?? 0).toFixed(3)} $`}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <AddSource open={adding} onClose={() => setAdding(false)} apps={apps ?? []} comps={comps ?? []} onSaved={refresh} />
    </div>
  );
}

function AddSource({ open, onClose, apps, comps, onSaved }: { open: boolean; onClose: () => void; apps: any[]; comps: any[]; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ app_id: "", competitor_id: "", platform: "tiktok", kind: "account", value: "", languages: "", frequency_hours: 24, max_results: 30 });
  const save = async () => {
    const { error } = await supabase.from("sources").insert({
      app_id: f.app_id || apps[0]?.id, competitor_id: f.competitor_id || null, platform: f.platform, kind: f.kind,
      value: f.value.trim().replace(/^[@#]/, ""), languages: f.languages.split(",").map((s) => s.trim()).filter(Boolean),
      frequency_hours: f.frequency_hours, max_results: f.max_results, enabled: false,
    });
    if (error) return toast(error.message, "danger");
    toast("Source ajoutée (désactivée)", "success");
    onSaved();
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} title="Nouvelle source" footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={save} disabled={!f.value.trim()}>Ajouter</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="App"><Select value={f.app_id} onChange={(e) => setF({ ...f, app_id: e.target.value })}>{apps.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
        <Field label="Concurrent"><Select value={f.competitor_id} onChange={(e) => setF({ ...f, competitor_id: e.target.value })}><option value="">—</option>{comps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field label="Plateforme"><Select value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook_ads">Meta Ad Library</option></Select></Field>
        <Field label="Type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="account">Compte</option><option value="hashtag">Hashtag</option><option value="keyword">Mot-clé</option><option value="page">Page FB</option></Select></Field>
        <Field label="Valeur" className="col-span-2"><Input value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder="knowunity.fr · studytok · app pour réviser · 102545774445089" /></Field>
        <Field label="Langues" hint="ex. fr, es"><Input value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} /></Field>
        <Field label="Fréquence (heures)"><Input type="number" min={1} value={f.frequency_hours} onChange={(e) => setF({ ...f, frequency_hours: Number(e.target.value) })} /></Field>
        <Field label="Plafond par run"><Input type="number" min={1} max={200} value={f.max_results} onChange={(e) => setF({ ...f, max_results: Number(e.target.value) })} /></Field>
      </div>
    </Dialog>
  );
}

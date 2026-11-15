import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, Bot, CalendarClock, Database, Facebook, Instagram, Music2, Play, Plus, RefreshCw, Search, Sparkles, Eye, Download } from "lucide-react";
import { Badge, Button, Card, CardTitle, Chip, Dialog, Empty, Field, IconTile, Input, PageHeader, Select, Switch, Table, Td, Th, useToast, type Tint } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useApps, useCompetitors, useSetting } from "@/lib/hooks";
import { ago, cn, dateFr } from "@/lib/utils";

/** Plan de backfill par défaut (copie de scripts/backfill-plan.json) : marques, hashtags de marque, mots-clés « study app » en ~30 langues, Ad Library. */
type PlanItem = { platform: "tiktok" | "instagram" | "facebook_ads"; kind: string; value: string; max_results: number; competitor?: string; lang?: string };
const BACKFILL_PLAN: PlanItem[] = [{"platform": "tiktok", "kind": "keyword", "value": "knowunity", "max_results": 50, "competitor": "Knowunity"}, {"platform": "tiktok", "kind": "keyword", "value": "astra ai app", "max_results": 50, "competitor": "Astra AI"}, {"platform": "tiktok", "kind": "keyword", "value": "gizmo ai flashcards", "max_results": 50, "competitor": "Gizmo"}, {"platform": "tiktok", "kind": "keyword", "value": "flashka", "max_results": 50, "competitor": "Flashka"}, {"platform": "tiktok", "kind": "keyword", "value": "diane app flashcards", "max_results": 50, "competitor": "Diane"}, {"platform": "tiktok", "kind": "keyword", "value": "studyflash", "max_results": 50, "competitor": "Studyflash"}, {"platform": "tiktok", "kind": "hashtag", "value": "knowunity", "max_results": 40, "competitor": "Knowunity"}, {"platform": "tiktok", "kind": "hashtag", "value": "astraai", "max_results": 40, "competitor": "Astra AI"}, {"platform": "tiktok", "kind": "hashtag", "value": "gizmoai", "max_results": 40, "competitor": "Gizmo"}, {"platform": "tiktok", "kind": "hashtag", "value": "flashka", "max_results": 40, "competitor": "Flashka"}, {"platform": "tiktok", "kind": "hashtag", "value": "dianeapp", "max_results": 40, "competitor": "Diane"}, {"platform": "tiktok", "kind": "hashtag", "value": "studyflash", "max_results": 40, "competitor": "Studyflash"}, {"platform": "instagram", "kind": "hashtag", "value": "knowunity", "max_results": 30, "competitor": "Knowunity"}, {"platform": "instagram", "kind": "hashtag", "value": "astraai", "max_results": 30, "competitor": "Astra AI"}, {"platform": "instagram", "kind": "hashtag", "value": "gizmoai", "max_results": 30, "competitor": "Gizmo"}, {"platform": "instagram", "kind": "hashtag", "value": "studyflash", "max_results": 30, "competitor": "Studyflash"}, {"platform": "tiktok", "kind": "keyword", "value": "ai study app", "max_results": 35, "lang": "en"}, {"platform": "tiktok", "kind": "keyword", "value": "ai homework app", "max_results": 35, "lang": "en"}, {"platform": "tiktok", "kind": "keyword", "value": "flashcards app", "max_results": 35, "lang": "en"}, {"platform": "tiktok", "kind": "keyword", "value": "application pour réviser", "max_results": 35, "lang": "fr"}, {"platform": "tiktok", "kind": "keyword", "value": "ia devoirs", "max_results": 35, "lang": "fr"}, {"platform": "tiktok", "kind": "keyword", "value": "app para estudiar", "max_results": 35, "lang": "es"}, {"platform": "tiktok", "kind": "keyword", "value": "ia para hacer deberes", "max_results": 35, "lang": "es"}, {"platform": "tiktok", "kind": "keyword", "value": "lern app ki", "max_results": 35, "lang": "de"}, {"platform": "tiktok", "kind": "keyword", "value": "karteikarten app", "max_results": 35, "lang": "de"}, {"platform": "tiktok", "kind": "keyword", "value": "app per studiare", "max_results": 35, "lang": "it"}, {"platform": "tiktok", "kind": "keyword", "value": "app para estudar", "max_results": 35, "lang": "pt"}, {"platform": "tiktok", "kind": "keyword", "value": "studie app ai", "max_results": 35, "lang": "nl"}, {"platform": "tiktok", "kind": "keyword", "value": "aplikacja do nauki", "max_results": 35, "lang": "pl"}, {"platform": "tiktok", "kind": "keyword", "value": "aplicatie pentru invatat", "max_results": 35, "lang": "ro"}, {"platform": "tiktok", "kind": "keyword", "value": "aplikace na učení", "max_results": 35, "lang": "cs"}, {"platform": "tiktok", "kind": "keyword", "value": "aplikácia na učenie", "max_results": 35, "lang": "sk"}, {"platform": "tiktok", "kind": "keyword", "value": "tanulós app", "max_results": 35, "lang": "hu"}, {"platform": "tiktok", "kind": "keyword", "value": "εφαρμογή για διάβασμα", "max_results": 35, "lang": "el"}, {"platform": "tiktok", "kind": "keyword", "value": "приложение за учене", "max_results": 35, "lang": "bg"}, {"platform": "tiktok", "kind": "keyword", "value": "aplikacija za učenje", "max_results": 35, "lang": "hr"}, {"platform": "tiktok", "kind": "keyword", "value": "aplikacija za učenje", "max_results": 35, "lang": "sl"}, {"platform": "tiktok", "kind": "keyword", "value": "aplikacija za učenje", "max_results": 35, "lang": "sr"}, {"platform": "tiktok", "kind": "keyword", "value": "додаток для навчання", "max_results": 35, "lang": "uk"}, {"platform": "tiktok", "kind": "keyword", "value": "ders çalışma uygulaması", "max_results": 35, "lang": "tr"}, {"platform": "tiktok", "kind": "keyword", "value": "تطبيق للمذاكرة", "max_results": 35, "lang": "ar"}, {"platform": "tiktok", "kind": "keyword", "value": "אפליקציה ללמידה", "max_results": 35, "lang": "he"}, {"platform": "tiktok", "kind": "keyword", "value": "勉強アプリ", "max_results": 35, "lang": "ja"}, {"platform": "tiktok", "kind": "keyword", "value": "공부 앱", "max_results": 35, "lang": "ko"}, {"platform": "tiktok", "kind": "keyword", "value": "plugg app", "max_results": 35, "lang": "sv"}, {"platform": "tiktok", "kind": "keyword", "value": "app for å studere", "max_results": 35, "lang": "no"}, {"platform": "tiktok", "kind": "keyword", "value": "app til at studere", "max_results": 35, "lang": "da"}, {"platform": "tiktok", "kind": "keyword", "value": "opiskelu sovellus", "max_results": 35, "lang": "fi"}, {"platform": "tiktok", "kind": "keyword", "value": "õppimise äpp", "max_results": 35, "lang": "et"}, {"platform": "tiktok", "kind": "keyword", "value": "mācību lietotne", "max_results": 35, "lang": "lv"}, {"platform": "tiktok", "kind": "keyword", "value": "mokymosi programėlė", "max_results": 35, "lang": "lt"}, {"platform": "facebook_ads", "kind": "page", "value": "Astra AI", "max_results": 30, "competitor": "Astra AI"}, {"platform": "facebook_ads", "kind": "page", "value": "Gizmo AI", "max_results": 30, "competitor": "Gizmo"}, {"platform": "facebook_ads", "kind": "page", "value": "Flashka", "max_results": 30, "competitor": "Flashka"}, {"platform": "facebook_ads", "kind": "page", "value": "Diane app", "max_results": 30, "competitor": "Diane"}, {"platform": "facebook_ads", "kind": "page", "value": "Studyflash", "max_results": 30, "competitor": "Studyflash"}];
const UNIT: Record<string, number> = { tiktok: 0.0037, instagram: 0.0027, facebook_ads: 0.0058 };
const planCost = (p: PlanItem[]) => p.reduce((s, x) => s + UNIT[x.platform] * x.max_results, 0);

function Budget({ label, spent, cap, hint, tint = "blue" }: { label: string; spent: number; cap?: number; hint?: React.ReactNode; tint?: Tint }) {
  const ratio = cap ? Math.min(1, spent / cap) : 0;
  const bar = ratio > 0.9 ? "#fe504f" : ratio > 0.7 ? "#ffbb43" : ({ blue: "#004dff", violet: "#8c43ff", cyan: "#1fafff", yellow: "#ffbb43", red: "#fe504f", green: "#12a150" } as const)[tint];
  return (
    <Card className="p-5">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em]">{spent.toFixed(2)} $
        {cap ? <span className="ml-1 text-sm font-normal text-subtle-foreground">/ {cap} $</span> : null}</p>
      {cap ? (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#f1f3f7]"><div className="h-full rounded-full transition-all" style={{ width: `${Math.max(ratio * 100, 2)}%`, background: bar }} /></div>
      ) : <div className="mt-4 h-1.5" />}
      {hint && <p className="mt-2.5 text-xs text-subtle-foreground">{hint}</p>}
    </Card>
  );
}

/** Pastille de plateforme (icône teintée + libellé). */
function PlatformCell({ p }: { p: string }) {
  const meta: Record<string, { icon: React.ReactNode; tint: Tint }> = {
    tiktok: { icon: <Music2 />, tint: "violet" }, instagram: { icon: <Instagram />, tint: "red" }, facebook_ads: { icon: <Facebook />, tint: "blue" },
    views: { icon: <Eye />, tint: "cyan" }, download: { icon: <Download />, tint: "green" },
  };
  const m = meta[p] ?? { icon: <Bot />, tint: "blue" as Tint };
  return <span className="flex items-center gap-2.5"><IconTile icon={m.icon} tint={m.tint} className="h-7 w-7 rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5" /><span className="whitespace-nowrap">{PLATFORM[p] ?? p}</span></span>;
}

const STATUS_LABEL: Record<string, string> = { succeeded: "Terminé", failed: "Échec", running: "En cours", queued: "En file", aborted: "Interrompu" };
function StatusPill({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status]}><span className={cn("h-1.5 w-1.5 rounded-full bg-current", status === "running" && "animate-pulse")} />{STATUS_LABEL[status] ?? status}</Badge>;
}
const TRIGGER_LABEL: Record<string, string> = { manual: "Manuel", cron: "Planifié", adhoc: "À la demande", backfill: "Backfill" };

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
  const [trigger, setTrigger] = useState("");
  const [backfill, setBackfill] = useState(false);

  const { data: sources } = useQuery({ queryKey: ["sources"], queryFn: async () => (await supabase.from("sources").select("*").order("platform").order("value")).data ?? [] });
  const { data: stats } = useQuery({ queryKey: ["agent_stats"], queryFn: async () => (await supabase.rpc("agent_stats")).data ?? [], refetchInterval: 20_000 });
  const { data: runs } = useQuery({
    queryKey: ["runs", trigger],
    queryFn: async () => {
      let q = supabase.from("agent_runs").select("*, sources(value, platform, kind)").order("started_at", { ascending: false }).limit(100);
      if (trigger) q = q.eq("trigger", trigger);
      return (await q).data ?? [];
    },
    refetchInterval: 15_000,
  });
  // Dépense : coût réel des runs terminés, estimation pour ceux en cours.
  const { data: spend } = useQuery({
    queryKey: ["runs", "spend"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase.from("agent_runs").select("started_at, cost_usd, status, params, trigger").limit(10000);
      const day = new Date(); day.setUTCHours(0, 0, 0, 0);
      const month = new Date(day); month.setUTCDate(1);
      const c = (r: any) => Number(r.cost_usd ?? (["running", "queued"].includes(r.status) ? r.params?.estimated_cost_usd ?? 0 : 0));
      const rows = data ?? [];
      return {
        today: rows.filter((r) => new Date(r.started_at) >= day).reduce((s, r) => s + c(r), 0),
        month: rows.filter((r) => new Date(r.started_at) >= month).reduce((s, r) => s + c(r), 0),
        total: rows.reduce((s, r) => s + c(r), 0),
        backfill: rows.filter((r) => r.trigger === "backfill").reduce((s, r) => s + c(r), 0),
        running: rows.filter((r) => ["running", "queued"].includes(r.status)).length,
      };
    },
  });
  const statOf = (id: string) => (stats ?? []).find((s: any) => s.source_id === id);
  const { data: totalVideos } = useQuery({ queryKey: ["videos_count"], queryFn: async () => (await supabase.from("videos").select("id", { count: "exact", head: true })).count ?? 0 });

  const refresh = () => ["sources", "agent_stats", "runs", "videos_count"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const run = async (key: string, body: any, msg: string) => {
    setBusy(key);
    try {
      const r = await callFn("collect", body);
      toast(body.action === "discover" ? `${r.created} nouvelle(s) source(s) créée(s) sur ${r.candidates} créateur(s) repéré(s) (désactivées : à activer ci-dessous)` : msg, "success");
      refresh();
    }
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
          <Button variant="secondary" onClick={() => run("poll", { action: "poll" }, "Runs synchronisés")} loading={busy === "poll"}><RefreshCw className="h-4 w-4" /> Synchroniser</Button>
          <Button variant="secondary" onClick={() => run("measure", { action: "measure_due", force: true }, "Relevé des vues lancé")} loading={busy === "measure"}><Eye className="h-4 w-4" /> Relever les vues</Button>
          <Button variant="secondary" onClick={() => run("discover", { action: "discover" }, "Découverte terminée")} loading={busy === "discover"} title="Crée une source « compte » (désactivée) pour chaque créateur UGC repéré (≥ 2 vidéos qui citent un concurrent, ou une vidéo ≥ 100 k vues)"><Sparkles className="h-4 w-4" /> Découvrir des UGC</Button>
          <Button variant="secondary" onClick={() => setBackfill(true)}><Database className="h-4 w-4" /> Backfill</Button>
          <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Source</Button>
        </>} />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniKpi icon={<Database />} tint="blue" label="Vidéos en base" value={new Intl.NumberFormat("fr").format(totalVideos ?? 0)} />
        <MiniKpi icon={<Search />} tint="violet" label="Sources actives" value={<>{(sources ?? []).filter((s: any) => s.enabled).length}<span className="text-base font-medium text-subtle-foreground"> / {(sources ?? []).length}</span></>} />
        <MiniKpi icon={<Activity />} tint="cyan" label="Runs en cours" value={spend?.running ?? 0} hint="Ingérés toutes les 2 min" />
        <MiniKpi icon={<CalendarClock />} tint={apify?.collect_cron_enabled ? "green" : "yellow"} label="Collecte planifiée" value={apify?.collect_cron_enabled ? "Activée" : "Désactivée"}
          hint={<Link className="text-accent hover:underline" to="/admin/settings/integrations">Réglages → Intégrations</Link>} />
      </div>
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Budget label="Apify aujourd'hui" spent={spend?.today ?? 0} cap={Number(apify?.daily_budget_usd ?? 30)} hint="Plafond quotidien (UTC)" tint="blue" />
        <Budget label="Apify ce mois" spent={spend?.month ?? 0} cap={Number(apify?.monthly_budget_usd ?? 300)} hint={`Plafond dur : ${apify?.hard_cap_per_run ?? 200} vidéos / run`} tint="violet" />
        <Budget label="Backfill (cumul)" spent={spend?.backfill ?? 0} cap={Number(apify?.backfill_budget_usd ?? 50)} hint="Budget du backfill initial" tint="cyan" />
        <Budget label="Depuis le début" spent={spend?.total ?? 0} hint="Coût réel des runs terminés + estimation des runs en cours" tint="green" />
      </div>

      <Card className="mb-8 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
          <CardTitle title="Sources" description={`${list.length} source(s) · coût estimé par run selon le plafond`} />
          <div className="mb-5 flex flex-wrap gap-2">
            {[["", "Toutes"], ["tiktok", "TikTok"], ["instagram", "Instagram"], ["facebook_ads", "Meta Ad Library"]].map(([v, l]) => (
              <Chip key={v} active={filter === v} onClick={() => setFilter(v)}>{l}</Chip>
            ))}
          </div>
        </div>
        <Table className="rounded-none border-x-0 border-b-0 shadow-none">
          <thead><tr><Th>Active</Th><Th>Plateforme</Th><Th>Source</Th><Th>Concurrent</Th><Th num>Fréquence</Th><Th num>Plafond</Th><Th num>Vidéos</Th><Th>Dernier run</Th><Th num>Coût (mois)</Th><Th /></tr></thead>
          <tbody>
            {list.map((s: any) => {
              const st = statOf(s.id);
              return (
                <tr key={s.id}>
                  <Td><Switch checked={s.enabled} onChange={(v) => toggle(s, v)} label="Activer la source" /></Td>
                  <Td><PlatformCell p={s.platform} /></Td>
                  <Td><span className="font-medium text-foreground">{s.kind === "account" ? "@" : s.kind === "hashtag" ? "#" : ""}{s.value}</span>
                    <span className="ml-2 text-xs text-subtle-foreground">{KIND[s.kind]}</span> {s.languages?.length > 0 && <Badge tone="outline" className="ml-1">{s.languages.join(", ")}</Badge>}</Td>
                  <Td className="text-muted-foreground">{compName(s.competitor_id)}</Td>
                  <Td num className="text-muted-foreground">{s.frequency_hours} h</Td>
                  <Td num className="text-muted-foreground">{s.max_results}</Td>
                  <Td num>{st?.videos ?? 0}</Td>
                  <Td>
                    {st?.last_run_at ? <span className="flex items-center gap-2"><StatusPill status={st.last_status} /><span className="text-xs text-subtle-foreground">{ago(st.last_run_at)}</span></span> : <span className="text-xs text-subtle-foreground">Jamais lancé</span>}
                    {st?.last_error && <p className="mt-1 max-w-64 truncate text-xs text-danger" title={st.last_error}>{st.last_error}</p>}
                  </Td>
                  <Td num className="text-muted-foreground">{Number(st?.cost_month ?? 0).toFixed(3)} $</Td>
                  <Td className="text-right"><Button size="sm" variant="secondary" loading={busy === s.id} onClick={() => run(s.id, { action: "run_source", source_id: s.id }, "Run lancé")}><Play className="h-3.5 w-3.5" /> Lancer</Button></Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {list.length === 0 && <div className="p-6"><Empty title="Aucune source" icon={<Search className="h-5 w-5" />} action={<Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Ajouter une source</Button>}>Ajoute un compte, un hashtag ou un mot-clé à surveiller.</Empty></div>}
      </Card>

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5">
          <CardTitle title="Derniers runs" description="100 derniers, rafraîchis toutes les 15 s" />
          <div className="mb-5 flex flex-wrap gap-2">
            {[["", "Tous"], ["manual", "Manuel"], ["cron", "Planifié"], ["adhoc", "À la demande"], ["backfill", "Backfill"]].map(([v, l]) => (
              <Chip key={v} active={trigger === v} onClick={() => setTrigger(v)}>{l}</Chip>
            ))}
          </div>
        </div>
        <Table className="rounded-none border-x-0 border-b-0 shadow-none">
          <thead><tr><Th>Début</Th><Th>Agent</Th><Th>Source / paramètres</Th><Th>Déclencheur</Th><Th>Statut</Th><Th num>Trouvées</Th><Th num>Nouvelles</Th><Th num>Coût</Th></tr></thead>
          <tbody>
            {(runs ?? []).map((r: any) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap text-xs text-muted-foreground">{dateFr(r.started_at, true)}</Td>
                <Td><PlatformCell p={r.agent} /></Td>
                <Td className="max-w-72 truncate">{r.sources ? `${KIND[r.sources.kind]} ${r.sources.value}` : r.params?.spec ? `${KIND[r.params.spec.kind] ?? ""} ${r.params.spec.value}` : r.agent === "views" ? `${r.params?.targets?.length ?? 0} vidéo(s)` : "—"}</Td>
                <Td><Badge tone="outline">{TRIGGER_LABEL[r.trigger] ?? r.trigger}</Badge></Td>
                <Td><StatusPill status={r.status} />{r.error && <p className="mt-1 max-w-64 truncate text-xs text-danger" title={r.error}>{r.error}</p>}</Td>
                <Td num>{r.items_found}</Td>
                <Td num className="font-medium">{r.items_new}</Td>
                <Td num className="text-xs text-muted-foreground">{r.cost_usd !== null ? `${Number(r.cost_usd).toFixed(3)} $` : `~${Number(r.params?.estimated_cost_usd ?? 0).toFixed(3)} $`}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {(runs ?? []).length === 0 && <div className="p-6"><Empty title="Aucun run" icon={<Activity className="h-5 w-5" />}>{trigger ? "Aucun run pour ce déclencheur." : "Lance une source ou un backfill."}</Empty></div>}
      </Card>
      <AddSource open={adding} onClose={() => setAdding(false)} apps={apps ?? []} comps={comps ?? []} onSaved={refresh} />
      <BackfillDialog open={backfill} onClose={() => setBackfill(false)} comps={comps ?? []} spent={spend?.backfill ?? 0} budget={Number(apify?.backfill_budget_usd ?? 50)} onDone={refresh} />
    </div>
  );
}

function MiniKpi({ icon, tint, label, value, hint }: { icon: React.ReactNode; tint: Tint; label: string; value: React.ReactNode; hint?: React.ReactNode }) {
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

function BackfillDialog({ open, onClose, comps, spent, budget, onDone }: { open: boolean; onClose: () => void; comps: any[]; spent: number; budget: number; onDone: () => void }) {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<number>>(() => new Set(BACKFILL_PLAN.map((_, i) => i)));
  const [busy, setBusy] = useState(false);
  const chosen = BACKFILL_PLAN.filter((_, i) => selected.has(i));
  const est = planCost(chosen);
  const remaining = Math.max(0, budget - spent);
  const launch = async () => {
    setBusy(true);
    try {
      const plan = chosen.map((p) => ({ ...p, competitor_id: p.competitor ? comps.find((c) => c.name === p.competitor)?.id ?? null : null }));
      let started = 0;
      for (let i = 0; i < plan.length; i += 60) {
        const r = await callFn("collect", { action: "backfill", plan: plan.slice(i, i + 60) });
        started += r.started;
        const err = (r.results ?? []).find((x: any) => x.error);
        if (err) { toast(`Arrêt : ${err.error}`, "danger"); break; }
      }
      toast(`${started} run(s) lancé(s) : les vidéos arrivent dans les prochaines minutes`, "success");
      onDone();
      onClose();
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(false); }
  };
  const label = (p: PlanItem) => `${PLATFORM[p.platform]} · ${KIND[p.kind] ?? p.kind} « ${p.value} »${p.competitor ? ` · ${p.competitor}` : ""}${p.lang ? ` · ${p.lang}` : ""} · ${p.max_results}`;
  return (
    <Dialog open={open} onClose={onClose} title="Backfill : collecte massive" wide
      footer={<><span className="mr-auto text-sm text-muted-foreground">{chosen.length} run(s) · ≈ {est.toFixed(2)} $ · reste {remaining.toFixed(2)} $ sur le budget backfill</span>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button onClick={launch} loading={busy} disabled={!chosen.length || est > remaining + 0.01}>Lancer</Button></>}>
      <p className="mb-3 text-sm text-muted-foreground">Recherches de marque, hashtags de marque, mots-clés « study app » dans ~30 langues et Meta Ad Library. Chaque vidéo est rattachée au concurrent qu'elle cite (UGC) ou au compte officiel. Plafonné par le budget backfill (Réglages → Intégrations).</p>
      <div className="mb-2 flex gap-3 text-xs">
        <button className="underline" onClick={() => setSelected(new Set(BACKFILL_PLAN.map((_, i) => i)))}>Tout cocher</button>
        <button className="underline" onClick={() => setSelected(new Set())}>Tout décocher</button>
      </div>
      <div className="max-h-96 space-y-0.5 overflow-y-auto rounded-xl border p-2">
        {BACKFILL_PLAN.map((p, i) => (
          <label key={i} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
            <input type="checkbox" checked={selected.has(i)} onChange={() => setSelected((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })} />
            <span className="flex-1">{label(p)}</span>
            <span className="text-xs text-muted-foreground">≈ {(UNIT[p.platform] * p.max_results).toFixed(2)} $</span>
          </label>
        ))}
      </div>
    </Dialog>
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

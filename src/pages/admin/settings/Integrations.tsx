import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { callFn } from "@/lib/supabase";
import { saveSetting, useSetting } from "@/lib/hooks";
import { Badge, Button, Card, Field, Input, PageHeader, Select, Spinner, Switch, useToast } from "@/components/ui";

const SECRETS = [
  ["APIFY_TOKEN", "Apify : agents de collecte, relevé des vues, archivage MP4"],
  ["META_ACCESS_TOKEN", "Meta Marketing API (token système « sophia-hub »)"],
  ["BREVO_API_KEY", "Brevo : envoi des emails"],
  ["ELEVENLABS_API_KEY", "ElevenLabs : fonds IA des créas (plan Pro requis pour les images)"],
  ["APP_URL", "URL du front (Vercel), pour les liens des emails — non secret"],
];

function useDraft<T extends Record<string, any>>(key: string, defaults: T) {
  const { data, isLoading } = useSetting<T>(key);
  const [draft, setDraft] = useState<T | null>(null);
  useEffect(() => { if (data) setDraft({ ...defaults, ...data }); }, [data]);
  return { draft, setDraft, isLoading };
}

function Section({ title, settingKey, defaults, children, description }: { title: string; settingKey: string; defaults: Record<string, any>; description?: ReactNode; children: (d: any, set: (k: string | Record<string, any>, v?: any) => void) => ReactNode }) {
  const { draft, setDraft, isLoading } = useDraft(settingKey, defaults);
  const qc = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (isLoading || !draft) return <Card><Spinner /></Card>;
  const set = (k: string | Record<string, any>, v?: any) => setDraft({ ...draft, ...(typeof k === "string" ? { [k]: v } : k) });
  const save = async () => {
    setBusy(true);
    try {
      await saveSetting(settingKey, draft);
      qc.invalidateQueries({ queryKey: ["setting", settingKey] });
      toast(`${title} : enregistré`, "success");
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(false); }
  };
  return (
    <Card>
      <div className="mb-4"><h2 className="font-semibold">{title}</h2>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
      <div className="grid gap-4 sm:grid-cols-2">{children(draft, set)}</div>
      <div className="mt-4"><Button size="sm" onClick={save} loading={busy}>Enregistrer</Button></div>
    </Card>
  );
}

const num = (v: string) => (v === "" ? "" : Number(v));

export default function Integrations() {
  const toast = useToast();
  const [meta, setMeta] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);
  const testMeta = async () => {
    setTesting(true);
    try { setMeta(await callFn("meta", { action: "status" })); } catch (e) { toast((e as Error).message, "danger"); } finally { setTesting(false); }
  };
  return (
    <>
      <PageHeader title="Intégrations" description="Apify, Meta, landing, briefs, créas, société, paie. Les clés API ne sont jamais stockées ici : elles vivent dans les secrets Supabase." />
      <Card className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Secrets à poser dans Supabase</h2>
          <a className="inline-flex items-center gap-1 text-sm text-accent hover:underline" href="https://supabase.com/dashboard/project/lnytuhsgzkqrkehemasu/functions/secrets" target="_blank" rel="noreferrer">Ouvrir Edge Functions → Secrets <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
        <ul className="divide-y text-sm">{SECRETS.map(([k, d]) => <li key={k} className="flex items-center gap-3 py-2"><code className="w-48 font-mono text-xs">{k}</code><span className="text-muted-foreground">{d}</span></li>)}</ul>
        <p className="mt-2 text-xs text-muted-foreground">CRON_SECRET est déjà posé (appels planifiés pg_cron → fonctions). Détails dans SETUP.md.</p>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Apify (collecte)" settingKey="apify" defaults={{ hard_cap_per_run: 200, default_max_results: 30, monthly_budget_usd: 300, daily_budget_usd: 30, backfill_budget_usd: 50, collect_cron_enabled: false, views_cron_enabled: true, actors: {} }}
          description="Plafonds de coût. Aucun run ne dépasse le plafond dur ; au-delà du plafond du jour ou du budget du mois, les nouveaux runs sont refusés.">
          {(d, set) => <>
            <Field label="Plafond dur par run (résultats)"><Input type="number" value={d.hard_cap_per_run} onChange={(e) => set("hard_cap_per_run", num(e.target.value))} /></Field>
            <Field label="Résultats par défaut"><Input type="number" value={d.default_max_results} onChange={(e) => set("default_max_results", num(e.target.value))} /></Field>
            <Field label="Budget mensuel (USD)"><Input type="number" value={d.monthly_budget_usd} onChange={(e) => set("monthly_budget_usd", num(e.target.value))} /></Field>
            <Field label="Plafond quotidien (USD)" hint="Dépense Apify max. par jour (UTC), tous runs confondus. Défaut : 30 $."><Input type="number" value={d.daily_budget_usd ?? 30} onChange={(e) => set("daily_budget_usd", num(e.target.value))} /></Field>
            <Field label="Budget backfill (USD)" hint="Plafond du jour quand on lance un backfill (collecte massive initiale). Défaut : 50 $."><Input type="number" value={d.backfill_budget_usd ?? 50} onChange={(e) => set("backfill_budget_usd", num(e.target.value))} /></Field>
            <div className="sm:col-span-2 space-y-2">
              <label className="flex items-center gap-3 text-sm"><Switch checked={!!d.collect_cron_enabled} onChange={(v) => set("collect_cron_enabled", v)} /> Collecte planifiée des sources activées (toutes les heures, selon leur fréquence)</label>
              {d.collect_cron_enabled && <p className="flex items-center gap-2 text-xs text-warning"><AlertTriangle className="h-3.5 w-3.5" /> Coûts récurrents : vérifiez les sources activées et le budget mensuel.</p>}
              <label className="flex items-center gap-3 text-sm"><Switch checked={!!d.views_cron_enabled} onChange={(v) => set("views_cron_enabled", v)} /> Relevé quotidien des vues J+2 / J+7 des vidéos postées</label>
            </div>
            {(["tiktok", "instagram", "facebook_ads"] as const).map((p) => (
              <Field key={p} label={`Acteur ${p}`}><Input value={d.actors?.[p] ?? ""} onChange={(e) => set("actors", { ...d.actors, [p]: e.target.value })} /></Field>
            ))}
          </>}
        </Section>

        <Section title="Meta Ads" settingKey="meta" defaults={{ ad_account_id: "", page_id: "", page_name: "", api_version: "v21.0", max_daily_budget: 50, beneficiary: "Vik Studios", insights_cron_enabled: true }}
          description="Tout est créé en PAUSED. L'activation (admin) refuse un budget au-dessus du plafond journalier.">
          {(d, set) => <>
            <Field label="Compte pub"><Input value={d.ad_account_id} onChange={(e) => set("ad_account_id", e.target.value)} /></Field>
            <Field label="Version API"><Input value={d.api_version} onChange={(e) => set("api_version", e.target.value)} /></Field>
            <Field label="Page Facebook (id)"><Input value={d.page_id} onChange={(e) => set("page_id", e.target.value)} /></Field>
            <Field label="Nom de la page"><Input value={d.page_name ?? ""} onChange={(e) => set("page_name", e.target.value)} /></Field>
            <Field label="Plafond budget journalier (devise du compte)"><Input type="number" value={d.max_daily_budget} onChange={(e) => set("max_daily_budget", num(e.target.value))} /></Field>
            <Field label="Bénéficiaire / payeur (DSA)"><Input value={d.beneficiary ?? ""} onChange={(e) => set("beneficiary", e.target.value)} /></Field>
            <div className="sm:col-span-2 space-y-2">
              <Button size="sm" variant="outline" loading={testing} onClick={testMeta}>Tester la connexion</Button>
              {meta && <div className="rounded-md bg-muted p-3 text-sm">
                <p><b>{meta.account?.name}</b> · {meta.account?.currency} · statut {meta.account?.account_status} · budget min. {(meta.account?.min_daily_budget ?? 0) / 100}</p>
                <p className="mt-2 text-xs text-muted-foreground">Pages disponibles (cliquer pour choisir) :</p>
                <div className="mt-1 flex flex-wrap gap-2">{(meta.pages ?? []).map((p: any) => (
                  <button key={p.id} onClick={() => set({ page_id: p.id, page_name: p.name })} className="rounded border bg-card px-2 py-1 text-xs hover:bg-background">
                    {p.name} <span className="text-muted-foreground">{p.id}</span> {p.id === d.page_id && <Badge tone="success">choisie</Badge>}
                  </button>))}</div>
              </div>}
            </div>
          </>}
        </Section>

        <Section title="Landing" settingKey="landing" defaults={{ base_url: "", default_country: "US" }} description="URL publique utilisée dans les liens des pubs (UTM).">
          {(d, set) => <>
            <Field label="URL de base" hint="ex. https://creators.vikstudios.com"><Input value={d.base_url} onChange={(e) => set("base_url", e.target.value)} /></Field>
            <Field label="Pays par défaut"><Input value={d.default_country} onChange={(e) => set("default_country", e.target.value.toUpperCase())} /></Field>
          </>}
        </Section>

        <Section title="Briefs" settingKey="briefs" defaults={{ per_day: 2, dispatch_cron_enabled: true }} description="Répartition automatique chaque matin (5 h UTC).">
          {(d, set) => <>
            <Field label="Briefs par posteur et par jour"><Input type="number" value={d.per_day} onChange={(e) => set("per_day", num(e.target.value))} /></Field>
            <label className="flex items-center gap-3 pt-6 text-sm"><Switch checked={!!d.dispatch_cron_enabled} onChange={(v) => set("dispatch_cron_enabled", v)} /> Répartition planifiée</label>
          </>}
        </Section>

        <Section title="Créas" settingKey="creatives" defaults={{ provider: "elevenlabs", model: "gemini-3.1-flash-image", max_images_per_run: 4 }} description="Fond IA (ElevenLabs, plan Pro requis) ; le texte est toujours posé par template.">
          {(d, set) => <>
            <Field label="Fournisseur de fond"><Select value={d.provider} onChange={(e) => set("provider", e.target.value)}><option value="elevenlabs">ElevenLabs (images)</option><option value="none">Aucun (fond dégradé)</option></Select></Field>
            <Field label="Modèle"><Select value={d.model} onChange={(e) => set("model", e.target.value)}>
              {["gemini-3.1-flash-image", "gemini-3.1-flash-lite-image", "gemini-3-pro-image", "gpt-image-1", "gpt-image-2", "bytedance-seedream-5-lite"].map((m) => <option key={m}>{m}</option>)}
            </Select></Field>
            <Field label="Images max par génération"><Input type="number" value={d.max_images_per_run} onChange={(e) => set("max_images_per_run", num(e.target.value))} /></Field>
          </>}
        </Section>

        <Section title="Société" settingKey="company" defaults={{ name: "Vik Studios SAS", brand: "Vik Studios", legal_address: "" }} description="Utilisé dans les contrats et les emails.">
          {(d, set) => <>
            <Field label="Raison sociale"><Input value={d.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Marque"><Input value={d.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
            <Field label="Adresse légale" className="sm:col-span-2"><Input value={d.legal_address} onChange={(e) => set("legal_address", e.target.value)} /></Field>
          </>}
        </Section>

        <Section title="Paie" settingKey="payroll" defaults={{ rpm_views: 1000, min_views_for_bonus: 0, bonus_on: "views_d7", week_starts: "monday" }} description="Le tarif et le RPM se règlent par zone (Pays & zones).">
          {(d, set) => <>
            <Field label="Vues par tranche de RPM (info)"><Input type="number" value={d.rpm_views} onChange={(e) => set("rpm_views", num(e.target.value))} /></Field>
            <Field label="Vues minimum pour un bonus"><Input type="number" value={d.min_views_for_bonus} onChange={(e) => set("min_views_for_bonus", num(e.target.value))} /></Field>
          </>}
        </Section>
      </div>
    </>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApps, useCompetitors } from "@/lib/hooks";
import { UNIT_COST_USD } from "@shared/apifyInput";
import { Badge, Button, Card, Dialog, Empty, Field, Input, PageHeader, Select, Spinner, Switch, Textarea, useToast } from "@/components/ui";

type Source = { id?: string; app_id: string; competitor_id: string | null; platform: "tiktok" | "instagram" | "facebook_ads"; kind: "account" | "hashtag" | "keyword" | "page"; value: string; languages: string[]; countries: string[]; frequency_hours: number; max_results: number; enabled: boolean };
const PLATFORM_LABEL: Record<string, string> = { tiktok: "TikTok", instagram: "Instagram", facebook_ads: "FB Ads Library" };
const KIND_LABEL: Record<string, string> = { account: "Compte", hashtag: "Hashtag", keyword: "Mot-clé", page: "Page FB" };
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const cost = (s: { platform: string; max_results: number }) => (UNIT_COST_USD[s.platform as keyof typeof UNIT_COST_USD] * s.max_results);

export default function Competitors() {
  const { data: apps } = useApps();
  const [appId, setAppId] = useState<string>("");
  const app = appId || apps?.[0]?.id || "";
  const { data: comps, isLoading } = useCompetitors(app || null);
  const sources = useQuery({
    queryKey: ["sources", app],
    enabled: !!app,
    queryFn: async () => (await supabase.from("sources").select("*").eq("app_id", app).order("platform")).data ?? [],
  });
  const qc = useQueryClient();
  const toast = useToast();
  const [comp, setComp] = useState<any | null>(null);
  const [src, setSrc] = useState<(Source & { _langs: string; _countries: string }) | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["competitors"] });
    qc.invalidateQueries({ queryKey: ["sources"] });
  };
  const saveComp = async () => {
    if (!comp.name?.trim()) return toast("Nom obligatoire", "danger");
    const row = { app_id: app, name: comp.name.trim(), website: comp.website || null, notes: comp.notes || null, verified: !!comp.verified, active: comp.active !== false };
    const { error } = comp.id ? await supabase.from("competitors").update(row).eq("id", comp.id) : await supabase.from("competitors").insert(row);
    if (error) return toast(error.message, "danger");
    toast("Concurrent enregistré", "success");
    setComp(null);
    refresh();
  };
  const delComp = async (c: any) => {
    if (!confirm(`Supprimer ${c.name} ? Ses sources restent, sans concurrent.`)) return;
    const { error } = await supabase.from("competitors").delete().eq("id", c.id);
    if (error) return toast(error.message, "danger");
    refresh();
  };
  const saveSrc = async () => {
    if (!src) return;
    if (!src.value.trim()) return toast("Valeur obligatoire", "danger");
    const { _langs, _countries, ...rest } = src;
    const row = { ...rest, value: src.value.trim(), languages: list(_langs), countries: list(_countries).map((c) => c.toUpperCase()), max_results: Math.max(1, Math.min(1000, Number(src.max_results))), frequency_hours: Math.max(1, Number(src.frequency_hours)) };
    const { error } = src.id ? await supabase.from("sources").update(row).eq("id", src.id) : await supabase.from("sources").insert(row);
    if (error) return toast(error.message, "danger");
    toast("Source enregistrée", "success");
    setSrc(null);
    refresh();
  };
  const toggle = async (s: any, enabled: boolean) => {
    const { error } = await supabase.from("sources").update({ enabled }).eq("id", s.id);
    if (error) return toast(error.message, "danger");
    refresh();
  };
  const delSrc = async (s: any) => {
    if (!confirm("Supprimer cette source ?")) return;
    await supabase.from("sources").delete().eq("id", s.id);
    refresh();
  };
  const newSrc = (competitor_id: string | null) =>
    setSrc({ app_id: app, competitor_id, platform: "tiktok", kind: "account", value: "", languages: [], countries: [], frequency_hours: 24, max_results: 30, enabled: false, _langs: "", _countries: "" });
  const editSrc = (s: any) => setSrc({ ...s, _langs: (s.languages ?? []).join(", "), _countries: (s.countries ?? []).join(", ") });

  const groups = [...(comps ?? []).map((c: any) => ({ c, items: (sources.data ?? []).filter((s: any) => s.competitor_id === c.id) })),
    { c: null as any, items: (sources.data ?? []).filter((s: any) => !s.competitor_id) }];

  return (
    <>
      <PageHeader title="Concurrents" description="Concurrents de chaque app et leurs sources de collecte (comptes TikTok / Instagram, pages FB, hashtags, mots-clés)."
        actions={<>
          <Select value={app} onChange={(e) => setAppId(e.target.value)} className="w-48">{apps?.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
          <Button onClick={() => setComp({ name: "", verified: false, active: true })}><Plus className="h-4 w-4" /> Concurrent</Button>
        </>} />
      <p className="mb-6 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
        Les sources sont <b>désactivées par défaut</b> (coût Apify). Coût estimé par run = coût unitaire × résultats max
        (TikTok {UNIT_COST_USD.tiktok} $, Instagram {UNIT_COST_USD.instagram} $, FB Ads {UNIT_COST_USD.facebook_ads} $ par résultat). Le plafond dur par run et le budget mensuel se règlent dans Intégrations.
      </p>
      {isLoading ? <Spinner /> : (
        <div className="space-y-5">
          {groups.map(({ c, items }) => (c || items.length > 0) && (
            <Card key={c?.id ?? "none"}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    {c ? c.name : "Sources sans concurrent (hashtags, mots-clés)"}
                    {c?.verified ? <Badge tone="success">Vérifié</Badge> : c ? <Badge tone="warning">À vérifier</Badge> : null}
                    {c && !c.active && <Badge>Inactif</Badge>}
                  </div>
                  {c?.website && <a className="text-xs text-accent hover:underline" href={c.website} target="_blank" rel="noreferrer">{c.website}</a>}
                  {c?.notes && <p className="mt-1 max-w-2xl text-xs text-muted-foreground">{c.notes}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => newSrc(c?.id ?? null)}><Plus className="h-3.5 w-3.5" /> Source</Button>
                  {c && <Button size="sm" variant="ghost" onClick={() => setComp(c)}>Modifier</Button>}
                  {c && <Button size="sm" variant="ghost" className="text-danger" onClick={() => delComp(c)}>Supprimer</Button>}
                </div>
              </div>
              {items.length === 0 ? <p className="text-sm text-muted-foreground">Aucune source.</p> : (
                <div className="divide-y rounded-md border">
                  {items.map((s: any) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                      <Switch checked={s.enabled} onChange={(v) => toggle(s, v)} label="Activer" />
                      <Badge tone="outline">{PLATFORM_LABEL[s.platform]}</Badge>
                      <span className="text-xs text-muted-foreground">{KIND_LABEL[s.kind]}</span>
                      <span className="font-medium">{s.kind === "hashtag" ? "#" : s.kind === "account" ? "@" : ""}{s.value}</span>
                      {s.languages?.length > 0 && <span className="text-xs text-muted-foreground">{s.languages.join(", ")}</span>}
                      {s.countries?.length > 0 && <span className="text-xs text-muted-foreground">{s.countries.join(", ")}</span>}
                      <span className="ml-auto text-xs text-muted-foreground">toutes les {s.frequency_hours} h · {s.max_results} max · ≈ {cost(s).toFixed(2)} $ / run</span>
                      <Button size="sm" variant="ghost" onClick={() => editSrc(s)}>Modifier</Button>
                      <button onClick={() => delSrc(s)} className="rounded p-1 text-muted-foreground hover:text-danger" aria-label="Supprimer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
          {!comps?.length && !sources.data?.length && <Empty title="Aucun concurrent pour cette app" />}
        </div>
      )}

      <Dialog open={!!comp} onClose={() => setComp(null)} title={comp?.id ? "Modifier le concurrent" : "Nouveau concurrent"}
        footer={<><Button variant="outline" onClick={() => setComp(null)}>Annuler</Button><Button onClick={saveComp}>Enregistrer</Button></>}>
        {comp && (
          <div className="space-y-4">
            <Field label="Nom"><Input value={comp.name ?? ""} onChange={(e) => setComp({ ...comp, name: e.target.value })} /></Field>
            <Field label="Site web"><Input value={comp.website ?? ""} onChange={(e) => setComp({ ...comp, website: e.target.value })} /></Field>
            <Field label="Notes"><Textarea value={comp.notes ?? ""} onChange={(e) => setComp({ ...comp, notes: e.target.value })} /></Field>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!comp.verified} onChange={(v) => setComp({ ...comp, verified: v })} /> Comptes vérifiés</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={comp.active !== false} onChange={(v) => setComp({ ...comp, active: v })} /> Actif</label>
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!src} onClose={() => setSrc(null)} title={src?.id ? "Modifier la source" : "Nouvelle source"}
        footer={<><Button variant="outline" onClick={() => setSrc(null)}>Annuler</Button><Button onClick={saveSrc}>Enregistrer</Button></>}>
        {src && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plateforme"><Select value={src.platform} onChange={(e) => setSrc({ ...src, platform: e.target.value as any, kind: e.target.value === "facebook_ads" ? "page" : src.kind === "page" ? "account" : src.kind })}>
              <option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook_ads">Facebook Ads Library</option></Select></Field>
            <Field label="Type"><Select value={src.kind} onChange={(e) => setSrc({ ...src, kind: e.target.value as any })}>
              {src.platform === "facebook_ads" ? <><option value="page">Page (id ou nom)</option><option value="keyword">Mot-clé</option></> : <><option value="account">Compte</option><option value="hashtag">Hashtag</option><option value="keyword">Mot-clé</option></>}
            </Select></Field>
            <Field label="Valeur" className="sm:col-span-2" hint={src.platform === "facebook_ads" ? "Id numérique de la page (recommandé, sinon recherche par mot-clé, plus bruitée)" : "Sans @ ni #"}>
              <Input value={src.value} onChange={(e) => setSrc({ ...src, value: e.target.value })} /></Field>
            <Field label="Langues" hint="codes séparés par des virgules (en, fr…)"><Input value={src._langs} onChange={(e) => setSrc({ ...src, _langs: e.target.value })} /></Field>
            <Field label="Pays" hint="codes ISO (FR, ES…)"><Input value={src._countries} onChange={(e) => setSrc({ ...src, _countries: e.target.value })} /></Field>
            <Field label="Fréquence (heures)"><Input type="number" min={1} value={src.frequency_hours} onChange={(e) => setSrc({ ...src, frequency_hours: Number(e.target.value) })} /></Field>
            <Field label="Résultats max par run" hint={`≈ ${cost(src).toFixed(2)} $ par run`}><Input type="number" min={1} max={1000} value={src.max_results} onChange={(e) => setSrc({ ...src, max_results: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-2 text-sm"><Switch checked={src.enabled} onChange={(v) => setSrc({ ...src, enabled: v })} /> Activée (collecte planifiée)</label>
          </div>
        )}
      </Dialog>
    </>
  );
}

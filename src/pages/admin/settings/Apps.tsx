import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { Card } from "@/components/ui";
import { callFn } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApps } from "@/lib/hooks";
import { OfferCodes } from "./OfferCodes";
import { Badge, Button, Dialog, Empty, Field, Input, PageHeader, Spinner, Switch, Table, Td, Textarea, Th, useToast } from "@/components/ui";
import { bioFor, displayNameFor, generateHandles } from "@shared/handles.ts";

type App = {
  id?: string; slug: string; name: string; description: string | null; audience?: string | null; website: string | null; ios_url: string | null; android_url: string | null; active: boolean;
  handle_patterns: string[]; bio_templates: Record<string, string>; display_name_pattern: string; link_in_bio: string | null; profile_photo_tips: string | null;
};
const blank: App = {
  slug: "", name: "", description: "", audience: "", website: "", ios_url: "", android_url: "", active: true,
  handle_patterns: ["{app}.{first}", "{first}.studies", "{first}{app}", "{first}.{last1}.{app}"], bio_templates: { en: "{App} ambassador 📚 Study smarter with AI ✨" },
  display_name_pattern: "{First} | {App}", link_in_bio: "", profile_photo_tips: "",
};
const BIO_LANGS = ["en", "fr", "es", "de", "it", "pt"];

export default function Apps() {
  const { data: apps, isLoading } = useApps();
  const qc = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState<App | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!edit) return;
    if (!edit.name.trim() || !/^[a-z0-9-]+$/.test(edit.slug)) return toast("Nom et slug (minuscules, chiffres, tirets) obligatoires", "danger");
    setBusy(true);
    const row = {
      ...edit, description: edit.description || null, audience: edit.audience || null, website: edit.website || null, ios_url: edit.ios_url || null, android_url: edit.android_url || null,
      link_in_bio: edit.link_in_bio || null, profile_photo_tips: edit.profile_photo_tips || null,
      handle_patterns: edit.handle_patterns.map((x) => x.trim()).filter(Boolean),
      bio_templates: Object.fromEntries(Object.entries(edit.bio_templates).filter(([, v]) => v.trim())),
    };
    const { error } = edit.id ? await supabase.from("apps").update(row).eq("id", edit.id) : await supabase.from("apps").insert(row);
    setBusy(false);
    if (error) return toast(error.message, "danger");
    toast("App enregistrée", "success");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["apps"] });
  };
  const remove = async (a: App) => {
    if (!confirm(`Supprimer ${a.name} ? Ses concurrents et sources seront supprimés.`)) return;
    const { error } = await supabase.from("apps").delete().eq("id", a.id!);
    if (error) return toast(error.message, "danger");
    qc.invalidateQueries({ queryKey: ["apps"] });
  };
  const set = (k: keyof App, v: any) => setEdit((e) => (e ? { ...e, [k]: v } : e));

  return (
    <>
      <PageHeader title="Apps" description="Les apps que nos posteurs promeuvent. Micabo d'abord, multi-apps prévu." actions={<Button onClick={() => setEdit({ ...blank })}><Plus className="h-4 w-4" /> Nouvelle app</Button>} />
      <RescoreCard />
      {isLoading ? <Spinner /> : !apps?.length ? <Empty title="Aucune app" /> : (
        <Table>
          <thead><tr><Th>Nom</Th><Th>Slug</Th><Th>Liens</Th><Th>Statut</Th><Th /></tr></thead>
          <tbody>
            {apps.map((a: any) => (
              <tr key={a.id}>
                <Td><div className="font-medium">{a.name}</div><div className="max-w-md truncate text-xs text-muted-foreground">{a.description}</div></Td>
                <Td className="font-mono text-xs">{a.slug}</Td>
                <Td className="space-x-2 text-xs">
                  {a.website && <a className="text-accent hover:underline" href={a.website} target="_blank" rel="noreferrer">Site</a>}
                  {a.ios_url && <a className="text-accent hover:underline" href={a.ios_url} target="_blank" rel="noreferrer">iOS</a>}
                  {a.android_url && <a className="text-accent hover:underline" href={a.android_url} target="_blank" rel="noreferrer">Android</a>}
                </Td>
                <Td>{a.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => setEdit({ ...blank, ...a, bio_templates: a.bio_templates ?? {}, handle_patterns: a.handle_patterns ?? blank.handle_patterns })}>Modifier</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(a)}>Supprimer</Button></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Modifier l'app" : "Nouvelle app"} wide
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button><Button loading={busy} onClick={save}>Enregistrer</Button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom"><Input value={edit.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Slug" hint="minuscules, ex. micabo"><Input value={edit.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea value={edit.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
            <Field label="Cible (pour le score de pertinence IA)" hint="Qui utilise l'app, pour quoi faire. L'IA s'en sert pour noter chaque vidéo de 0 à 100." className="sm:col-span-2"><Textarea value={edit.audience ?? ""} onChange={(e) => set("audience" as any, e.target.value)} /></Field>
            <Field label="Site web"><Input value={edit.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
            <Field label="App Store (iOS)"><Input value={edit.ios_url ?? ""} onChange={(e) => set("ios_url", e.target.value)} /></Field>
            <Field label="Google Play"><Input value={edit.android_url ?? ""} onChange={(e) => set("android_url", e.target.value)} /></Field>
            <div className="flex items-center gap-3 pt-6"><Switch checked={edit.active} onChange={(v) => set("active", v)} /> <span className="text-sm">Active</span></div>
            <HandleSettings app={edit} set={set} />
          </div>
        )}
      </Dialog>
      <OfferCodes />
    </>
  );
}

/** Réglages de l'étape « Ton compte » du créateur : handles, nom affiché, bio par langue, lien, photo. */
function HandleSettings({ app, set }: { app: App; set: (k: keyof App, v: any) => void }) {
  const [sample, setSample] = useState("Zoé Martin");
  const [newLang, setNewLang] = useState("");
  const [first, ...rest] = sample.trim().split(/\s+/);
  const ctx = { app: app.name || "App", first: first || "zoe", last: rest.join(" ") };
  const preview = generateHandles(app.handle_patterns, ctx, 6);
  const langs = [...new Set([...BIO_LANGS, ...Object.keys(app.bio_templates ?? {})])];
  return (
    <div className="space-y-4 border-t pt-4 sm:col-span-2">
      <div>
        <p className="font-medium">Étape « Ton compte » du créateur</p>
        <p className="text-xs text-muted-foreground">On ne crée jamais de compte TikTok/Instagram (interdit par leurs CGU) : on propose des handles libres, le nom, la bio et le lien, puis on vérifie les comptes créés par le créateur (la bio doit citer {app.name || "l'app"}).</p>
      </div>
      <Field label="Modèles de handles (un par ligne)" hint="Variables : {app} {first} {last} {last1} · nettoyés automatiquement (a-z, 0-9, . _ ; 24 caractères max)">
        <Textarea rows={4} value={app.handle_patterns.join("\n")} onChange={(e) => set("handle_patterns", e.target.value.split("\n"))} className="font-mono text-xs" />
      </Field>
      <div className="rounded-lg bg-muted p-3">
        <div className="mb-2 flex items-center gap-2 text-xs"><span className="text-muted-foreground">Aperçu pour</span><Input className="h-7 w-44 text-xs" value={sample} onChange={(e) => setSample(e.target.value)} /></div>
        <div className="flex flex-wrap gap-1.5">{preview.map((h) => <Badge key={h} tone="outline">@{h}</Badge>)}</div>
        <p className="mt-2 text-xs">Nom affiché : <span className="font-medium">{displayNameFor(app.display_name_pattern, ctx)}</span></p>
        <p className="text-xs">Bio (fr) : <span className="font-medium">{bioFor(app.bio_templates, "fr", ctx) || "—"}</span></p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom affiché" hint="{First} {App} {last1}"><Input value={app.display_name_pattern} onChange={(e) => set("display_name_pattern", e.target.value)} /></Field>
        <Field label="Lien en bio"><Input value={app.link_in_bio ?? ""} onChange={(e) => set("link_in_bio", e.target.value)} placeholder="https://…" /></Field>
        <Field label="Consignes photo de profil" className="sm:col-span-2"><Textarea rows={2} value={app.profile_photo_tips ?? ""} onChange={(e) => set("profile_photo_tips", e.target.value)} /></Field>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Bio par langue <span className="text-xs font-normal text-muted-foreground">(langue du créateur, sinon anglais · variables {"{App}"} {"{first}"})</span></p>
        {langs.map((l) => (
          <div key={l} className="flex items-start gap-2">
            <span className="mt-2 w-8 font-mono text-xs uppercase text-muted-foreground">{l}</span>
            <Textarea rows={2} className="text-sm" value={app.bio_templates[l] ?? ""} onChange={(e) => set("bio_templates", { ...app.bio_templates, [l]: e.target.value })} />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Input className="h-8 w-24 text-xs" placeholder="ex. nl" value={newLang} onChange={(e) => setNewLang(e.target.value.toLowerCase().slice(0, 5))} />
          <Button size="sm" variant="outline" disabled={!newLang} onClick={() => { set("bio_templates", { ...app.bio_templates, [newLang]: app.bio_templates[newLang] ?? "" }); setNewLang(""); }}>+ Langue</Button>
        </div>
      </div>
    </div>
  );
}

/**
 * « Recalculer la pertinence » : après avoir modifié la description ou la cible d'une app, relance le score IA
 * de toute la bibliothèque (fal, Gemini flash). Coût estimé affiché avant ; corrections manuelles conservées ; s'arrête au plafond mensuel.
 */
function RescoreCard() {
  const toast = useToast();
  const status = useQuery({ queryKey: ["ai-status"], queryFn: () => callFn("ai", { action: "status" }) });
  const [run, setRun] = useState<{ done: number; total: number; cost: number } | null>(null);
  const d = status.data;
  if (!d) return null;
  const go = async () => {
    if (!window.confirm(`Recalculer la pertinence de ${d.total} vidéos ?\nCoût estimé : ≈ ${d.rescore_estimate_usd.toFixed(2)} $ (plafond mensuel ${d.settings.monthly_cap_usd} $, déjà ${d.month_spent_usd.toFixed(2)} $ ce mois).\nLes corrections manuelles sont conservées.`)) return;
    try {
      const r = await callFn("ai", { action: "reset_scores" });
      let state = { done: 0, total: r.queued as number, cost: 0 };
      setRun(state);
      for (let i = 0; i < 100; i++) {
        const x = await callFn("ai", { action: "classify_pending", limit: 60 });
        if (x.skipped) { toast(x.skipped === "monthly_cap_reached" ? "Plafond mensuel atteint : le reste sera traité le mois prochain ou après hausse du plafond" : `Arrêt : ${x.skipped}`, "danger"); break; }
        state = { ...state, done: state.done + x.scored, cost: state.cost + x.cost_usd };
        setRun(state);
        if (!x.scored) break;
      }
      toast(`Pertinence recalculée : ${state.done} vidéos, ${state.cost.toFixed(2)} $`, "success");
      status.refetch();
    } catch (e) { toast((e as Error).message, "danger"); } finally { setRun(null); }
  };
  return (
    <Card className="mb-6 flex flex-wrap items-center gap-4 p-5">
      <Target className="h-5 w-5 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">Pertinence IA des vidéos</p>
        <p className="text-[13px] text-muted-foreground">
          Après avoir modifié la description ou la cible d'une app, recalcule le score de toute la bibliothèque ({d.total} vidéos, ≈ {d.rescore_estimate_usd.toFixed(2)} $).
          Ce mois : {d.month_spent_usd.toFixed(2)} $ / {d.settings.monthly_cap_usd} $. Seuil « compatible » : {d.settings.compat_threshold}/100.
          {!d.fal_configured && <span className="text-[#c42a2d]"> FAL_KEY absente : rien ne peut tourner.</span>}
        </p>
        {run && (
          <div className="mt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, (100 * run.done) / Math.max(1, run.total))}%` }} /></div>
            <p className="tabular mt-1 text-xs text-subtle-foreground">{run.done} / {run.total} · {run.cost.toFixed(3)} $</p>
          </div>
        )}
      </div>
      <Button onClick={go} loading={!!run} disabled={!d.fal_configured}>Recalculer la pertinence</Button>
    </Card>
  );
}

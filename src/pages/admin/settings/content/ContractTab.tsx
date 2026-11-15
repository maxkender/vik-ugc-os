import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, History, Plus } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useCountries, useSetting, useZones } from "@/lib/hooks";
import { cn, dateFr, flag } from "@/lib/utils";
import { missingVariables, renderContract } from "@shared/contract";
import { composeContract } from "@shared/contractSummary.ts";
import { formatMoney } from "@shared/zones.ts";
import { Markdown } from "@/pages/public/Sign";

const VARIABLES = ["company_name", "full_name", "birthdate", "country_name", "date", "videos_per_day", "price_per_video", "rpm", "rpm_views", "zone_code", "currency", "country_clauses"];
interface Tpl { id: string; country_code: string | null; language: string; title: string; body_md: string; version: number; active: boolean; created_at: string }
const scopeKey = (t: { country_code: string | null; language: string }) => `${t.country_code ?? ""}|${t.language}`;

/**
 * Modèles de contrat par pays (ou par défaut) avec aperçu en direct sur un créateur fictif.
 * Le rendu reprend exactement createContract (_shared/contracts.ts) : même choix de modèle, mêmes variables, même résumé.
 */
export function ContractTab() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: countries } = useCountries();
  const { data: zones } = useZones();
  const { data: company } = useSetting("company");
  const tpls = useQuery({ queryKey: ["contract_templates"], queryFn: async () => ((await supabase.from("contract_templates").select("*").order("version", { ascending: false })).data ?? []) as Tpl[] });

  // Créateur fictif
  const [person, setPerson] = useState({ full_name: "Léa Martin", birthdate: "2004-03-12", country: "FR" });
  // Portée éditée (pays + langue) et version sélectionnée
  const [scope, setScope] = useState<string>("|en");
  const [selId, setSelId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body_md: "" });
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"full" | "summary">("summary");

  const scopes = useMemo(() => {
    const m = new Map<string, Tpl[]>();
    for (const t of tpls.data ?? []) m.set(scopeKey(t), [...(m.get(scopeKey(t)) ?? []), t]);
    return m;
  }, [tpls.data]);
  const versions = scopes.get(scope) ?? [];
  const selected = versions.find((v) => v.id === selId) ?? versions.find((v) => v.active) ?? versions[0] ?? null;
  useEffect(() => { if (selected) setForm({ title: selected.title, body_md: selected.body_md }); }, [selected?.id]);
  useEffect(() => { setSelId(null); }, [scope]);

  // Le modèle que createContract choisirait pour ce pays (actif, pays exact sinon défaut EN).
  const active = (tpls.data ?? []).filter((t) => t.active);
  const used = active.find((t) => t.country_code === person.country) ?? active.find((t) => !t.country_code && t.language === "en") ?? active[0];
  const country = (countries ?? []).find((c: any) => c.code === person.country);
  const zone = (zones ?? []).find((z: any) => z.code === (country?.zone_code ?? "A"));
  const cur = zone?.currency ?? "USD";
  const companyName = company?.name ?? "Vik Studios SAS";
  // Si on édite la portée qui s'applique à ce pays, l'aperçu montre le texte en cours d'édition.
  const body = selected && used && scopeKey(selected) === scopeKey(used) ? form.body_md : used?.body_md ?? form.body_md;
  const vars = {
    company_name: companyName, full_name: person.full_name, birthdate: person.birthdate, country_name: country?.name ?? person.country,
    date: new Date().toISOString().slice(0, 10), videos_per_day: zone?.videos_per_day ?? 2,
    price_per_video: formatMoney(Number(zone?.price_per_video ?? 0), cur), rpm: formatMoney(Number(zone?.rpm ?? 0), cur),
    rpm_views: new Intl.NumberFormat("en").format(zone?.rpm_views ?? 1000), zone_code: zone?.code ?? "?", currency: cur,
    country_clauses: country?.contract_clauses ?? "",
  };
  const full = renderContract(body, vars);
  const composed = composeContract(country?.language, {
    price: vars.price_per_video, rpm: vars.rpm, rpmViews: vars.rpm_views, videosPerDay: vars.videos_per_day, zone: vars.zone_code, companyName,
  }, full);
  const missing = missingVariables(form.body_md).filter((v) => !VARIABLES.includes(v));
  const dirty = !!selected && (form.body_md !== selected.body_md || form.title !== selected.title);

  const saveNew = async (publish: boolean) => {
    if (!form.title.trim() || !form.body_md.trim()) return toast("Titre et texte obligatoires", "danger");
    const [cc, language] = scope.split("|");
    setBusy(true);
    const version = Math.max(0, ...versions.map((v) => v.version)) + 1;
    if (publish && versions.length) await supabase.from("contract_templates").update({ active: false }).in("id", versions.map((v) => v.id));
    const { data, error } = await supabase.from("contract_templates").insert({ country_code: cc || null, language, title: form.title, body_md: form.body_md, version, active: publish }).select("id").single();
    setBusy(false);
    if (error) return toast(error.message, "danger");
    toast(publish ? `Version ${version} publiée : les nouveaux contrats l'utilisent` : `Brouillon v${version} enregistré`, "success");
    await qc.invalidateQueries({ queryKey: ["contract_templates"] });
    setSelId(data.id);
  };
  const publish = async (t: Tpl) => {
    setBusy(true);
    await supabase.from("contract_templates").update({ active: false }).in("id", versions.map((v) => v.id));
    const { error } = await supabase.from("contract_templates").update({ active: true }).eq("id", t.id);
    setBusy(false);
    if (error) return toast(error.message, "danger");
    toast(`Version ${t.version} publiée`, "success");
    qc.invalidateQueries({ queryKey: ["contract_templates"] });
  };
  const newScope = (cc: string) => {
    const k = `${cc}|en`;
    if (!scopes.has(k)) setForm({ title: selected?.title ?? "Independent Creator Agreement", body_md: (scopes.get("|en") ?? [])[0]?.body_md ?? form.body_md });
    setScope(k);
  };

  if (tpls.isLoading) return null;
  const scopeList = [...scopes.keys()].sort();
  const [scopeCc] = scope.split("|");

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold">Modèle</h2>
            {selected?.active ? <Badge tone="success">Publié · v{selected.version}</Badge> : selected ? <Badge>Inactif · v{selected.version}</Badge> : <Badge tone="warning">Nouveau</Badge>}
            {dirty && <Badge tone="warning">Modifié</Badge>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {scopeList.map((k) => {
              const [cc, l] = k.split("|");
              const isActive = (scopes.get(k) ?? []).some((t) => t.active);
              return (
                <button key={k} onClick={() => setScope(k)} className={cn("rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors", k === scope ? "bg-accent-soft text-[#0040d6]" : "bg-[#f1f3f7] text-muted-foreground hover:text-foreground")}>
                  {cc ? `${flag(cc)} ${cc}` : "Défaut"} · {l.toUpperCase()}{!isActive && " (inactif)"}
                </button>
              );
            })}
            <Select className="h-8 w-auto text-[13px]" value="" onChange={(e) => e.target.value && newScope(e.target.value)}>
              <option value="">+ Modèle pour un pays…</option>
              {(countries ?? []).filter((c: any) => !scopes.has(`${c.code}|en`)).map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            {scopeCc ? `S'applique aux candidats de ${countries?.find((c: any) => c.code === scopeCc)?.name ?? scopeCc}.` : "S'applique à tous les pays sans modèle propre."} Le texte juridique reste en anglais ; le résumé en tête est traduit automatiquement.
          </p>
          <Field label="Titre"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Texte (Markdown)">
            <Textarea rows={18} value={form.body_md} onChange={(e) => setForm({ ...form, body_md: e.target.value })} className="font-mono text-[12px] leading-relaxed" />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES.map((v) => (
              <button key={v} onClick={() => setForm({ ...form, body_md: form.body_md + `{{${v}}}` })} className={cn("rounded-md px-2 py-1 font-mono text-[12px]", form.body_md.includes(`{{${v}}}`) ? "bg-tint-blue text-[#0040d6]" : "bg-[#f1f3f7] text-muted-foreground hover:text-foreground")} title={String((vars as any)[v])}>
                {`{{${v}}}`}
              </button>
            ))}
          </div>
          {missing.length > 0 && <p className="text-xs text-[#c42a2d]">Variable inconnue : {missing.map((v) => `{{${v}}}`).join(", ")}</p>}
          <div className="flex flex-wrap gap-2 border-t border-separator pt-4">
            <Button onClick={() => saveNew(true)} loading={busy}><CheckCircle2 className="h-4 w-4" /> Publier comme nouvelle version</Button>
            <Button variant="secondary" onClick={() => saveNew(false)} disabled={busy}><Plus className="h-4 w-4" /> Brouillon</Button>
          </div>
          <p className="text-xs text-subtle-foreground">Les contrats déjà envoyés gardent leur texte (figé + empreinte SHA-256). Seuls les nouveaux contrats utilisent la version publiée.</p>
        </Card>

        <Card>
          <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold"><History className="h-4 w-4 text-muted-foreground" /> Versions</p>
          <div className="divide-y divide-separator rounded-lg border">
            {versions.map((v) => (
              <div key={v.id} className={cn("flex items-center gap-3 px-3 py-2", v.id === selected?.id && "bg-muted")}>
                <button className="min-w-0 flex-1 text-left" onClick={() => setSelId(v.id)}>
                  <p className="truncate text-[13px] font-medium">v{v.version} · {v.title}</p>
                  <p className="text-[11px] text-subtle-foreground">{dateFr(v.created_at, true)}</p>
                </button>
                {v.active ? <Badge tone="success">Publiée</Badge> : <Button size="sm" variant="ghost" onClick={() => publish(v)} disabled={busy}>Publier</Button>}
              </div>
            ))}
            {!versions.length && <p className="px-3 py-3 text-xs text-subtle-foreground">Aucune version pour cette portée : « Publier » crée la v1.</p>}
          </div>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-6 xl:h-fit">
        <Card className="space-y-3">
          <p className="text-[15px] font-semibold">Créateur fictif</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Nom"><Input value={person.full_name} onChange={(e) => setPerson({ ...person, full_name: e.target.value })} /></Field>
            <Field label="Naissance"><Input type="date" value={person.birthdate} onChange={(e) => setPerson({ ...person, birthdate: e.target.value })} /></Field>
            <Field label="Pays">
              <Select value={person.country} onChange={(e) => setPerson({ ...person, country: e.target.value })}>
                {(countries ?? []).map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Badge tone="accent">Zone {vars.zone_code}</Badge>
            <Badge>{vars.price_per_video}/vidéo</Badge>
            <Badge>{vars.rpm} / {vars.rpm_views} vues</Badge>
            <Badge>{vars.videos_per_day} vidéos/jour</Badge>
            <Badge tone="violet">Modèle utilisé : {used ? `${used.country_code ? used.country_code : "défaut"} v${used.version}` : "aucun"}</Badge>
          </div>
        </Card>
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-separator px-5 py-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold"><FileText className="h-4 w-4 text-muted-foreground" /> Ce que le créateur verra</p>
            <div className="inline-flex rounded-lg bg-[#f1f3f7] p-1 text-[12px]">
              {(["summary", "full"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={cn("rounded-md px-2.5 py-1", view === v ? "bg-white font-medium shadow-xs" : "text-muted-foreground")}>{v === "summary" ? "Résumé" : "Contrat complet"}</button>
              ))}
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <Markdown text={view === "summary" ? composed.summary : full} />
          </div>
        </Card>
      </div>
    </div>
  );
}

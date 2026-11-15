import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Monitor, RefreshCw, RotateCcw, Smartphone } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useCountries } from "@/lib/hooks";
import i18n, { LANGS, uiLangForCountry } from "@/i18n";
import { cn, flag } from "@/lib/utils";

const FIELDS: { key: string; label: string; long?: boolean; hint?: string }[] = [
  { key: "landing.badge", label: "Badge (au-dessus du titre)" },
  { key: "landing.title", label: "Titre", long: true, hint: "{{brand}} = nom de la marque" },
  { key: "landing.subtitle", label: "Sous-titre", long: true, hint: "{{price}} = prix par vidéo de la zone" },
  { key: "landing.cta", label: "Bouton" },
];

/** Textes de la page job (/join/<pays>) surchargés par pays et par langue, avec la vraie page en aperçu. */
export function LandingTab() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: countries } = useCountries();
  const open = (countries ?? []).filter((c: any) => c.open && c.zone_code);
  const [cc, setCc] = useState("FR");
  const [lang, setLang] = useState("fr");
  const [device, setDevice] = useState<"mobile" | "desktop">("desktop");
  const [reload, setReload] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const ovr = useQuery({
    queryKey: ["landing-overrides-admin", cc, lang],
    queryFn: async () => Object.fromEntries(((await supabase.from("landing_overrides").select("key, value").eq("country_code", cc).eq("language", lang)).data ?? []).map((r: any) => [r.key, r.value])) as Record<string, string>,
  });
  useEffect(() => { if (ovr.data) setForm(ovr.data); }, [ovr.data]);

  // Textes par défaut (traductions i18n) pour la langue choisie.
  const tl = i18n.getFixedT(lang);
  const defaults = useMemo(() => {
    const d: Record<string, string> = {};
    for (const f of FIELDS) d[f.key] = String(tl(f.key, { brand: "{{brand}}", price: "{{price}}", interpolation: { skipOnVariables: true } } as any));
    const faqs = (tl("landing.faqs", { returnObjects: true }) as unknown as string[][]) ?? [];
    (Array.isArray(faqs) ? faqs : []).forEach(([q, a], i) => { d[`landing.faq.${i}.q`] = q; d[`landing.faq.${i}.a`] = a; });
    return d;
  }, [lang]);
  const faqCount = Object.keys(defaults).filter((k) => k.endsWith(".q")).length;
  const dirty = JSON.stringify(Object.fromEntries(Object.entries(form).filter(([, v]) => v?.trim()))) !== JSON.stringify(Object.fromEntries(Object.entries(ovr.data ?? {}).filter(([, v]) => v?.trim())));
  const count = Object.values(ovr.data ?? {}).filter(Boolean).length;

  const pickCountry = (code: string) => {
    setCc(code);
    const c = open.find((x: any) => x.code === code);
    if (c) setLang(uiLangForCountry(c.language));
  };
  const save = async () => {
    setBusy(true);
    const rows = Object.entries(form).filter(([k, v]) => v?.trim() && v.trim() !== defaults[k]).map(([key, value]) => ({ country_code: cc, language: lang, key, value: value.trim() }));
    const { error: delErr } = await supabase.from("landing_overrides").delete().eq("country_code", cc).eq("language", lang);
    const { error } = rows.length ? await supabase.from("landing_overrides").insert(rows) : { error: null };
    setBusy(false);
    if (delErr || error) return toast((delErr ?? error)!.message, "danger");
    toast(rows.length ? `${rows.length} texte(s) personnalisé(s) pour ${cc} · ${lang.toUpperCase()}` : "Textes par défaut rétablis", "success");
    qc.invalidateQueries({ queryKey: ["landing-overrides-admin"] });
    qc.invalidateQueries({ queryKey: ["landing-overrides"] });
    setReload((n) => n + 1);
  };
  const field = (key: string, label: string, long?: boolean, hint?: string) => {
    const custom = !!form[key]?.trim() && form[key].trim() !== defaults[key];
    return (
      <Field key={key} label={label} hint={hint}>
        <div className="relative">
          {long
            ? <Textarea rows={2} value={form[key] ?? ""} placeholder={defaults[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={cn(custom && "ring-1 ring-[#2f6bff]/40")} />
            : <Input value={form[key] ?? ""} placeholder={defaults[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={cn(custom && "ring-1 ring-[#2f6bff]/40")} />}
          {custom && <button onClick={() => setForm({ ...form, [key]: "" })} title="Revenir au texte par défaut" className="absolute right-2 top-2 rounded p-1 text-subtle-foreground hover:bg-muted hover:text-foreground"><RotateCcw className="h-3.5 w-3.5" /></button>}
        </div>
      </Field>
    );
  };
  const src = `/join/${cc.toLowerCase()}?lang=${lang}&preview=1&r=${reload}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Card className="h-fit space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pays">
            <Select value={cc} onChange={(e) => pickCountry(e.target.value)}>
              {open.map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
            </Select>
          </Field>
          <Field label="Langue">
            <Select value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {count ? <Badge tone="accent">{count} texte(s) personnalisé(s)</Badge> : <Badge>Textes par défaut</Badge>}
          <span>Champ vide = traduction standard (en gris).</span>
        </div>
        {FIELDS.map((f) => field(f.key, f.label, f.long, f.hint))}
        <details className="group rounded-lg border border-separator">
          <summary className="cursor-pointer select-none px-3 py-2 text-[13px] font-medium">FAQ ({faqCount} questions)</summary>
          <div className="space-y-3 border-t border-separator p-3">
            {Array.from({ length: faqCount }, (_, i) => (
              <div key={i} className="space-y-2">
                {field(`landing.faq.${i}.q`, `Question ${i + 1}`)}
                {field(`landing.faq.${i}.a`, "Réponse", true)}
              </div>
            ))}
          </div>
        </details>
        <div className="flex gap-2 border-t border-separator pt-4">
          <Button onClick={save} loading={busy} disabled={!dirty}>Enregistrer</Button>
          <Button variant="ghost" onClick={() => setForm(ovr.data ?? {})} disabled={!dirty}>Annuler</Button>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[15px] font-semibold">Aperçu en direct</p>
            <p className="font-mono text-xs text-subtle-foreground">/join/{cc.toLowerCase()}?lang={lang}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-[#f1f3f7] p-1">
              {(["desktop", "mobile"] as const).map((d) => (
                <button key={d} onClick={() => setDevice(d)} className={cn("rounded-md p-1.5", device === d ? "bg-white text-foreground shadow-xs" : "text-muted-foreground")} aria-label={d}>
                  {d === "desktop" ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                </button>
              ))}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setReload((n) => n + 1)}><RefreshCw className="h-3.5 w-3.5" /></Button>
            <a href={`/join/${cc.toLowerCase()}?lang=${lang}`} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><ExternalLink className="h-3.5 w-3.5" /> Ouvrir</Button></a>
          </div>
        </div>
        {dirty && <p className="text-xs text-[#8a5a00]">Modifications non enregistrées : l'aperçu montre la version en ligne.</p>}
        <div className="flex justify-center rounded-xl bg-[#f4f4f5] p-3">
          <iframe key={src} title="Aperçu landing" src={src} className={cn("rounded-lg border-0 bg-white", device === "desktop" ? "h-[760px] w-full" : "h-[760px] w-[390px]")} />
        </div>
      </Card>
    </div>
  );
}

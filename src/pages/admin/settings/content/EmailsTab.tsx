import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Mail, RotateCcw, Send, Monitor, Smartphone } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useCountries, useSetting, useZones } from "@/lib/hooks";
import { cn, dateFr, flag } from "@/lib/utils";
import { fillTemplate, renderEmail } from "@shared/template.ts";
import { formatMoney } from "@shared/zones.ts";

/** Libellés et moment d'envoi de chaque email (ordre du parcours créateur). */
export const EMAIL_META: Record<string, { label: string; when: string }> = {
  application_received: { label: "Candidature reçue", when: "Juste après l'envoi du formulaire" },
  contract_to_sign: { label: "Contrat à signer", when: "Quand un recruteur accepte la candidature" },
  contract_reminder: { label: "Relance contrat", when: "J+1, J+3 et J+6 sans signature (même modèle pour les 3 relances)" },
  contract_signed: { label: "Contrat signé", when: "Juste après la signature (lien vers le PDF)" },
  access: { label: "Tes accès", when: "Juste après la signature (lien de connexion)" },
  application_rejected: { label: "Refus", when: "Après un refus, si l'email de refus est activé (délai réglable)" },
  handles_reminder: { label: "Relance comptes TikTok / IG", when: "Relance manuelle depuis l'onboarding" },
  ruul_invite: { label: "Invitation Ruul", when: "Quand l'admin clique « Ajouté sur Ruul »" },
  ruul_reminder: { label: "Relance Ruul", when: "J+1 et J+3 sans « It's done »" },
  first_post_reminder: { label: "Relance premier post", when: "Relance manuelle depuis l'onboarding" },
  payout_paid: { label: "Paiement envoyé", when: "Quand l'admin clique « Payé sur Ruul »" },
  payroll_recap: { label: "Récap paie (admin)", when: "Chaque lundi matin, à l'équipe" },
};
const ORDER = Object.keys(EMAIL_META);
const LANG_LABEL: Record<string, string> = { en: "English", fr: "Français", es: "Español", de: "Deutsch", it: "Italiano", pt: "Português" };

interface Tpl { key: string; language: string; subject: string; body: string; button_label: string | null; updated_at: string }

/** Variables d'exemple pour l'aperçu (calculées avec le tarif de la zone du pays choisi). */
function sampleVars(country: any, zone: any, lang: string, brand: string): Record<string, string> {
  const cur = zone?.currency ?? "USD";
  const money = (n: number) => formatMoney(n, cur, lang);
  const in7 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  return {
    brand, first_name: "Léa", last_name: "Martin", country: country?.name ?? "France",
    expires_on: in7, price_per_video: money(Number(zone?.price_per_video ?? 5)), rpm: money(Number(zone?.rpm ?? 1)),
    rpm_views: new Intl.NumberFormat(lang).format(zone?.rpm_views ?? 1000),
    ruul_email: "lea.martin@example.com", total: money(58.25), week: "9 Nov", videos: "10", base: money(10 * Number(zone?.price_per_video ?? 5)), bonus: money(8.25),
    app: "Micabo", handle: "micabo.lea", step: "TikTok", count: "3", week_start: "2026-11-09", total_due: money(1240), creators: "24", link: "https://vik-ugc-os.vercel.app/admin/payroll",
  };
}
const varsIn = (...texts: (string | null | undefined)[]) => [...new Set(texts.join(" ").match(/\{(\w+)\}/g)?.map((m) => m.slice(1, -1)) ?? [])];

export function EmailsTab() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: countries } = useCountries();
  const { data: zones } = useZones();
  const { data: emailCfg } = useSetting("email");
  const { data: company } = useSetting("company");
  const [key, setKey] = useState("contract_to_sign");
  const [lang, setLang] = useState("fr");
  const [cc, setCc] = useState("FR");
  const [form, setForm] = useState({ subject: "", body: "", button_label: "" });
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [focus, setFocus] = useState<"subject" | "body" | "button_label">("body");

  const tpls = useQuery({ queryKey: ["email_templates"], queryFn: async () => ((await supabase.from("email_templates").select("*").order("key")).data ?? []) as Tpl[] });
  const versions = useQuery({
    queryKey: ["email_template_versions", key, lang],
    queryFn: async () => (await supabase.from("email_template_versions").select("*").eq("key", key).eq("language", lang).order("created_at", { ascending: false }).limit(20)).data ?? [],
  });
  const keys = useMemo(() => {
    const ks = [...new Set((tpls.data ?? []).map((t) => t.key))];
    return ks.sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
  }, [tpls.data]);
  const langsFor = (k: string) => (tpls.data ?? []).filter((t) => t.key === k).map((t) => t.language);
  const current = (tpls.data ?? []).find((t) => t.key === key && t.language === lang) ?? null;
  useEffect(() => {
    if (current) setForm({ subject: current.subject, body: current.body, button_label: current.button_label ?? "" });
    else setForm({ subject: "", body: "", button_label: "" });
  }, [current?.key, current?.language, current?.updated_at]);
  useEffect(() => { if (tpls.data && !langsFor(key).includes(lang)) setLang(langsFor(key)[0] ?? "en"); }, [key, tpls.data]);

  const country = (countries ?? []).find((c: any) => c.code === cc);
  const zone = (zones ?? []).find((z: any) => z.code === country?.zone_code);
  const brand = company?.brand ?? "Vik Studios";
  const vars = sampleVars(country, zone, lang, brand);
  const preview = useMemo(() => renderEmail({
    subject: fillTemplate(form.subject, vars), body: fillTemplate(form.body, vars), brand,
    button: form.button_label ? { label: fillTemplate(form.button_label, vars), url: "https://vik-ugc-os.vercel.app/" } : null,
    logoUrl: `${location.origin}/brand/vik-studios-logo.png`,
  }), [form, cc, lang, brand, zones, countries]);
  const used = varsIn(form.subject, form.body, form.button_label);
  const unknown = used.filter((v) => !(v in vars));
  const dirty = !!current && (form.subject !== current.subject || form.body !== current.body || (form.button_label || "") !== (current.button_label ?? ""));

  const insertVar = (v: string) => {
    const token = `{${v}}`;
    if (focus === "body" && bodyRef.current) {
      const el = bodyRef.current, s = el.selectionStart ?? form.body.length, e = el.selectionEnd ?? s;
      const body = form.body.slice(0, s) + token + form.body.slice(e);
      setForm({ ...form, body });
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
    } else setForm({ ...form, [focus]: (form as any)[focus] + token });
  };
  const save = async () => {
    setBusy("save");
    // L'ancienne version est archivée automatiquement (trigger email_templates_archive).
    const { error } = await supabase.from("email_templates").update({ subject: form.subject, body: form.body, button_label: form.button_label || null }).eq("key", key).eq("language", lang);
    setBusy(null);
    if (error) return toast(error.message, "danger");
    toast("Modèle enregistré · version précédente archivée", "success");
    qc.invalidateQueries({ queryKey: ["email_templates"] });
    qc.invalidateQueries({ queryKey: ["email_template_versions"] });
  };
  const restore = (v: any) => setForm({ subject: v.subject, body: v.body, button_label: v.button_label ?? "" });
  const sendTest = async () => {
    setBusy("test");
    try {
      if (dirty) await save();
      const r = await callFn("emails", { action: "send_test", key, language: lang, vars });
      toast(r.status === "sent" ? `Test envoyé à ${r.to}` : `Test mis en file pour ${r.to} (${r.hold_reason ?? r.status})`, r.status === "sent" ? "success" : "default");
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(null); }
  };

  if (tpls.isLoading) return null;
  if (!keys.length) return <Empty title="Aucun modèle d'email" icon={<Mail className="h-5 w-5" />}>Les modèles sont créés par les migrations.</Empty>;

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
      {/* Liste des emails */}
      <Card className="h-fit p-2">
        <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">Parcours créateur</p>
        {keys.map((k) => (
          <button key={k} onClick={() => setKey(k)} className={cn("block w-full rounded-lg px-3 py-2 text-left transition-colors", k === key ? "bg-accent-soft" : "hover:bg-muted")}>
            <span className={cn("block text-[13px] font-medium", k === key ? "text-[#0040d6]" : "text-foreground")}>{EMAIL_META[k]?.label ?? k}</span>
            <span className="mt-0.5 flex gap-1">{langsFor(k).map((l) => <span key={l} className="text-[10px] uppercase text-subtle-foreground">{l}</span>)}</span>
          </button>
        ))}
      </Card>

      {/* Éditeur */}
      <Card className="space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold">{EMAIL_META[key]?.label ?? key}</h2>
            <Badge tone="outline">{key}</Badge>
            {dirty && <Badge tone="warning">Modifié</Badge>}
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">{EMAIL_META[key]?.when ?? "—"}</p>
          {key === "contract_reminder" && (
            <div className="mt-2 flex gap-1.5">{["J+1", "J+3", "J+6"].map((d) => <Badge key={d} tone="violet">Relance {d}</Badge>)}<Badge tone="danger">Expiration J+7</Badge></div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Langue">
            <Select value={lang} onChange={(e) => setLang(e.target.value)}>
              {langsFor(key).map((l) => <option key={l} value={l}>{LANG_LABEL[l] ?? l}</option>)}
            </Select>
          </Field>
          <Field label="Pays de l'aperçu" hint={zone ? `Zone ${zone.code} · ${formatMoney(Number(zone.price_per_video), zone.currency, lang)}/vidéo` : undefined}>
            <Select value={cc} onChange={(e) => setCc(e.target.value)}>
              {(countries ?? []).filter((c: any) => c.zone_code).map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Objet"><Input value={form.subject} onFocus={() => setFocus("subject")} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
        <Field label="Texte" hint="Paragraphes séparés par une ligne vide.">
          <Textarea ref={bodyRef} rows={11} value={form.body} onFocus={() => setFocus("body")} onChange={(e) => setForm({ ...form, body: e.target.value })} className="font-mono text-[13px] leading-relaxed" />
        </Field>
        <Field label="Bouton (vide = pas de bouton)"><Input value={form.button_label} onFocus={() => setFocus("button_label")} onChange={(e) => setForm({ ...form, button_label: e.target.value })} /></Field>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Variables (clic = insérer à l'endroit du curseur)</p>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set([...used, "first_name", "brand"])].map((v) => (
              <button key={v} onClick={() => insertVar(v)} className={cn("rounded-md px-2 py-1 font-mono text-[12px] transition-colors", unknown.includes(v) ? "bg-tint-red text-[#c42a2d]" : used.includes(v) ? "bg-tint-blue text-[#0040d6] hover:bg-[#e2eaff]" : "bg-[#f1f3f7] text-muted-foreground hover:text-foreground")} title={vars[v] ? `Exemple : ${vars[v]}` : "Variable inconnue : elle restera telle quelle"}>
                {`{${v}}`}
              </button>
            ))}
          </div>
          {unknown.length > 0 && <p className="mt-2 text-xs text-[#c42a2d]">Variable inconnue : {unknown.map((v) => `{${v}}`).join(", ")}. Elle s'affichera telle quelle.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-separator pt-5">
          <Button onClick={save} loading={busy === "save"} disabled={!dirty}>Enregistrer</Button>
          <Button variant="secondary" onClick={sendTest} loading={busy === "test"} title={emailCfg?.test_recipient ? `Envoi à ${emailCfg.test_recipient}` : "Renseigne l'email admin de test dans Réglages → Emails"}>
            <Send className="h-4 w-4" /> M'envoyer un test
          </Button>
          <span className="text-xs text-subtle-foreground">{emailCfg?.test_recipient ? `→ ${emailCfg.test_recipient}` : "Email admin de test non renseigné"}</span>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><History className="h-3.5 w-3.5" /> Versions précédentes</p>
          {(versions.data ?? []).length === 0 ? <p className="text-xs text-subtle-foreground">Aucune version archivée : chaque enregistrement garde la précédente ici.</p> : (
            <div className="divide-y divide-separator rounded-lg border">
              {(versions.data ?? []).map((v: any) => (
                <div key={v.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-foreground">{v.subject}</p>
                    <p className="text-[11px] text-subtle-foreground">{dateFr(v.created_at, true)}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => restore(v)}><RotateCcw className="h-3.5 w-3.5" /> Restaurer</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Aperçu */}
      <Card className="h-fit space-y-3 xl:sticky xl:top-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] font-semibold">Aperçu</p>
            <p className="text-xs text-subtle-foreground">Rendu identique à l'envoi · {LANG_LABEL[lang] ?? lang} · {country?.name}</p>
          </div>
          <div className="inline-flex rounded-lg bg-[#f1f3f7] p-1">
            {(["desktop", "mobile"] as const).map((d) => (
              <button key={d} onClick={() => setDevice(d)} className={cn("rounded-md p-1.5", device === d ? "bg-white text-foreground shadow-xs" : "text-muted-foreground")} aria-label={d}>
                {d === "desktop" ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-separator bg-muted px-3 py-2 text-[13px]">
          <span className="text-subtle-foreground">Objet : </span><span className="font-medium text-foreground">{fillTemplate(form.subject, vars)}</span>
        </div>
        <div className="flex justify-center rounded-xl bg-[#f4f4f5] p-3">
          <iframe title="Aperçu email" sandbox="" srcDoc={preview.html} className={cn("rounded-lg border-0 bg-white transition-all", device === "desktop" ? "h-[620px] w-full" : "h-[620px] w-[375px]")} />
        </div>
      </Card>
    </div>
  );
}

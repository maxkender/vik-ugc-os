import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { callFn, supabase } from "@/lib/supabase";
import { saveSetting, useSetting } from "@/lib/hooks";
import { dateFr } from "@/lib/utils";
import { Badge, Button, Card, Dialog, Field, Input, PageHeader, Select, Spinner, Switch, Table, Tabs, Td, Textarea, Th, useToast } from "@/components/ui";

interface EmailCfg { test_mode: boolean; test_recipient: string; sender_name: string; sender_email: string; reply_to: string; send_rejection_emails: boolean; rejection_delay_hours: number }
const STATUS_TONE: Record<string, any> = { queued: "accent", held: "warning", sent: "success", failed: "danger", cancelled: "default" };
const STATUS_LABEL: Record<string, string> = { queued: "En file", held: "Retenu", sent: "Envoyé", failed: "Échec", cancelled: "Annulé" };
const HOLD_LABEL: Record<string, string> = { no_sender: "Pas d'expéditeur configuré", test_mode_no_recipient: "Mode test sans email de test", invalid_recipient: "Destinataire invalide" };
const VARS: Record<string, string> = {
  application_received: "{first_name}, {brand}",
  contract_to_sign: "{first_name}, {price_per_video}, {rpm}, {rpm_views}, {expires_on}, {brand}",
  contract_reminder: "{first_name}, {expires_on}, {brand}",
  contract_signed: "{first_name}, {brand}",
  access: "{first_name}, {brand}",
  application_rejected: "{first_name}, {brand}",
  ruul_invite: "{first_name}, {ruul_email}, {brand}",
  ruul_reminder: "{first_name}, {ruul_email}, {brand}",
  payout_paid: "{first_name}, {total}, {week}, {videos}, {base}, {bonus}, {brand}",
};

export default function Emails() {
  const [tab, setTab] = useState<"settings" | "outbox" | "templates">("settings");
  return (
    <>
      <PageHeader title="Emails" description="Envoi via Brevo, derrière un garde-fou : mode test activé par défaut." />
      <div className="mb-6"><Tabs value={tab} onChange={setTab} items={[{ value: "settings", label: "Réglages & Brevo" }, { value: "outbox", label: "Boîte d'envoi" }, { value: "templates", label: "Modèles" }]} /></div>
      {tab === "settings" && <SettingsTab />}
      {tab === "outbox" && <OutboxTab />}
      {tab === "templates" && <TemplatesTab />}
    </>
  );
}

function SettingsTab() {
  const { data, isLoading } = useSetting<Partial<EmailCfg>>("email");
  const qc = useQueryClient();
  const toast = useToast();
  const [cfg, setCfg] = useState<EmailCfg | null>(null);
  const [busy, setBusy] = useState(false);
  const brevo = useQuery({ queryKey: ["brevo_check"], queryFn: () => callFn("emails", { action: "brevo_check" }), retry: false });
  useEffect(() => { if (data) setCfg({ test_mode: true, test_recipient: "", sender_name: "Vik Studios", sender_email: "", reply_to: "", send_rejection_emails: false, rejection_delay_hours: 24, ...data }); }, [data]);
  if (isLoading || !cfg) return <Spinner />;
  const set = (k: keyof EmailCfg, v: any) => setCfg({ ...cfg, [k]: v });
  const save = async () => {
    if (!cfg.test_mode && !confirm("Désactiver le mode test : les emails partiront aux VRAIS destinataires (candidats, posteurs). Confirmer ?")) return;
    setBusy(true);
    try {
      await saveSetting("email", { ...cfg, rejection_delay_hours: Number(cfg.rejection_delay_hours) });
      qc.invalidateQueries({ queryKey: ["setting", "email"] });
      toast("Réglages enregistrés", "success");
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(false); }
  };
  const blocked = cfg.test_mode && !cfg.test_recipient.trim();
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <Card className={cfg.test_mode ? "border-warning/50" : "border-danger/50"}>
          <div className="mb-4 flex items-center gap-3">
            {cfg.test_mode ? <ShieldCheck className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-danger" />}
            <div className="flex-1">
              <p className="font-semibold">Mode test {cfg.test_mode ? "activé" : "DÉSACTIVÉ"}</p>
              <p className="text-sm text-muted-foreground">{cfg.test_mode ? "Tous les emails sont redirigés vers l'email admin de test (objet préfixé « [TEST → destinataire] »)." : "Les emails partent aux vrais destinataires."}</p>
            </div>
            <Switch checked={cfg.test_mode} onChange={(v) => set("test_mode", v)} label="Mode test" />
          </div>
          <Field label="Email admin de test" hint={blocked ? <span className="font-medium text-warning">Tant que l'email de test est vide, aucun email ne part : ils restent dans la boîte d'envoi.</span> : "Reçoit tous les emails tant que le mode test est actif."}>
            <Input type="email" value={cfg.test_recipient} onChange={(e) => set("test_recipient", e.target.value)} placeholder="max@…" />
          </Field>
        </Card>
        <Card className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'expéditeur"><Input value={cfg.sender_name} onChange={(e) => set("sender_name", e.target.value)} /></Field>
          <Field label="Email de l'expéditeur" hint="Doit être un expéditeur validé dans Brevo (cliquer à droite). Vide = aucun envoi."><Input type="email" value={cfg.sender_email} onChange={(e) => set("sender_email", e.target.value)} /></Field>
          <Field label="Reply-to (optionnel)"><Input type="email" value={cfg.reply_to} onChange={(e) => set("reply_to", e.target.value)} /></Field>
          <div />
          <label className="flex items-center gap-3 text-sm"><Switch checked={cfg.send_rejection_emails} onChange={(v) => set("send_rejection_emails", v)} /> Envoyer un email poli aux candidats refusés</label>
          <Field label="Délai avant l'email de refus (heures)"><Input type="number" min={0} value={cfg.rejection_delay_hours} onChange={(e) => set("rejection_delay_hours", e.target.value)} /></Field>
        </Card>
        <Button onClick={save} loading={busy}>Enregistrer</Button>
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between"><p className="font-semibold">Brevo</p><Button size="sm" variant="ghost" onClick={() => brevo.refetch()}><RefreshCw className="h-3.5 w-3.5" /></Button></div>
        {brevo.isLoading ? <Spinner /> : brevo.error ? <p className="text-sm text-danger">{(brevo.error as Error).message}</p> : (
          <div className="space-y-4 text-sm">
            <div><p className="text-xs uppercase text-muted-foreground">Compte</p><p>{brevo.data?.account?.company ?? "—"} · {brevo.data?.account?.email ?? brevo.data?.account?.error}</p>
              {(brevo.data?.account?.plan ?? []).map((p: any, i: number) => <p key={i} className="text-xs text-muted-foreground">{p.type} : {p.credits} crédits</p>)}</div>
            <div><p className="mb-1 text-xs uppercase text-muted-foreground">Expéditeurs</p>
              {(brevo.data?.senders ?? []).length === 0 && <p className="text-muted-foreground">Aucun expéditeur.</p>}
              {(brevo.data?.senders ?? []).map((s: any) => (
                <button key={s.id} disabled={!s.active} onClick={() => setCfg({ ...cfg, sender_email: s.email, sender_name: cfg.sender_name || s.name })}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-muted disabled:opacity-50">
                  <span>{s.name} &lt;{s.email}&gt;</span>{s.active ? <Badge tone="success">validé</Badge> : <Badge>non validé</Badge>}
                </button>))}</div>
            <div><p className="mb-1 text-xs uppercase text-muted-foreground">Templates Brevo</p>
              {(brevo.data?.templates ?? []).length === 0 ? <p className="text-muted-foreground">Aucun (on utilise nos modèles internes).</p> : (brevo.data?.templates ?? []).map((t: any) => <p key={t.id} className="text-xs">#{t.id} {t.name}</p>)}</div>
          </div>
        )}
      </Card>
    </div>
  );
}

function OutboxTab() {
  const [status, setStatus] = useState("");
  const qc = useQueryClient();
  const toast = useToast();
  const [preview, setPreview] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["outbox", status],
    queryFn: async () => {
      let q = supabase.from("email_outbox").select("*").order("created_at", { ascending: false }).limit(100);
      if (status) q = q.eq("status", status);
      return (await q).data ?? [];
    },
  });
  const act = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      const r = await callFn("emails", body);
      toast(body.action === "process" ? `Traité : ${r.sent} envoyé(s), ${r.held} retenu(s), ${r.failed} échec(s)` : msg, "success");
      qc.invalidateQueries({ queryKey: ["outbox"] });
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(false); }
  };
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select className="w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Button variant="outline" loading={busy} onClick={() => act({ action: "process" }, "")}>Traiter la file maintenant</Button>
        <Button variant="ghost" loading={busy} onClick={() => act({ action: "requeue" }, "Emails retenus remis en file")}>Remettre en file les retenus</Button>
      </div>
      {isLoading ? <Spinner /> : (
        <Table>
          <thead><tr><Th>Créé</Th><Th>Modèle</Th><Th>Destinataire</Th><Th>Objet</Th><Th>Statut</Th><Th /></tr></thead>
          <tbody>
            {data?.length === 0 && <tr><Td colSpan={6} className="text-center text-muted-foreground">Boîte d'envoi vide.</Td></tr>}
            {data?.map((m: any) => (
              <tr key={m.id}>
                <Td className="whitespace-nowrap text-xs">{dateFr(m.created_at, true)}</Td>
                <Td className="font-mono text-xs">{m.template_key}</Td>
                <Td className="text-xs">{m.to_email}{m.delivered_to && m.delivered_to !== m.to_email && <div className="text-muted-foreground">→ {m.delivered_to}</div>}</Td>
                <Td className="max-w-xs truncate">{m.subject}</Td>
                <Td><Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status] ?? m.status}</Badge>
                  {m.hold_reason && <div className="mt-0.5 text-xs text-muted-foreground">{HOLD_LABEL[m.hold_reason] ?? m.hold_reason}</div>}
                  {m.error && <div className="mt-0.5 max-w-xs truncate text-xs text-danger">{m.error}</div>}</Td>
                <Td className="whitespace-nowrap text-right">
                  <Button size="sm" variant="ghost" onClick={() => setPreview(m)}>Voir</Button>
                  {["held", "failed"].includes(m.status) && <Button size="sm" variant="ghost" onClick={() => act({ action: "requeue", id: m.id }, "Remis en file")}>Relancer</Button>}
                  {!["sent", "cancelled"].includes(m.status) && <Button size="sm" variant="ghost" className="text-danger" onClick={() => act({ action: "cancel", id: m.id }, "Annulé")}>Annuler</Button>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog open={!!preview} onClose={() => setPreview(null)} title={preview?.subject ?? ""} wide>
        {preview && <>
          <p className="mb-3 text-xs text-muted-foreground">À : {preview.to_email} · {dateFr(preview.created_at, true)}</p>
          <iframe title="Aperçu" sandbox="" srcDoc={preview.html} className="h-[60vh] w-full rounded border bg-white" />
        </>}
      </Dialog>
    </>
  );
}

function TemplatesTab() {
  const qc = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState<any | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["email_templates"], queryFn: async () => (await supabase.from("email_templates").select("*").order("key").order("language")).data ?? [] });
  const save = async () => {
    if (!edit.key?.trim() || !edit.language?.trim() || !edit.subject?.trim() || !edit.body?.trim()) return toast("Clé, langue, objet et texte obligatoires", "danger");
    const { error } = await supabase.from("email_templates").upsert({ key: edit.key.trim(), language: edit.language.trim().toLowerCase(), subject: edit.subject, body: edit.body, button_label: edit.button_label || null, updated_at: new Date().toISOString() });
    if (error) return toast(error.message, "danger");
    toast("Modèle enregistré", "success");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["email_templates"] });
  };
  if (isLoading) return <Spinner />;
  const keys = [...new Set((data ?? []).map((t: any) => t.key))];
  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">Les variables s'écrivent entre accolades : {"{first_name}"}, {"{brand}"}… Paragraphes séparés par une ligne vide. Si la langue du destinataire manque, l'anglais est utilisé.</p>
      <div className="space-y-3">
        {keys.map((k) => (
          <Card key={k} className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div><span className="font-mono text-sm font-medium">{k}</span><span className="ml-3 text-xs text-muted-foreground">variables : {VARS[k] ?? "{first_name}, {brand}"}</span></div>
              <Button size="sm" variant="outline" onClick={() => { const en = data!.find((t: any) => t.key === k && t.language === "en"); setEdit({ ...(en ?? {}), key: k, language: "", _new: true }); }}>+ Langue</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {data!.filter((t: any) => t.key === k).map((t: any) => (
                <button key={t.language} onClick={() => setEdit(t)} className="rounded-md border px-3 py-1.5 text-left text-sm hover:bg-muted">
                  <span className="mr-2 font-semibold uppercase">{t.language}</span><span className="text-muted-foreground">{t.subject}</span>
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?._new ? `Nouvelle langue — ${edit?.key}` : `${edit?.key} (${edit?.language})`} wide
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button><Button onClick={save}>Enregistrer</Button></>}>
        {edit && <div className="space-y-4">
          {edit._new && <Field label="Code langue" hint="ex. de, it, pt"><Input value={edit.language} onChange={(e) => setEdit({ ...edit, language: e.target.value })} /></Field>}
          <p className="text-xs text-muted-foreground">Variables : {VARS[edit.key] ?? "{first_name}, {brand}"}</p>
          <Field label="Objet"><Input value={edit.subject ?? ""} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></Field>
          <Field label="Texte"><Textarea className="min-h-56" value={edit.body ?? ""} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
          <Field label="Libellé du bouton (optionnel)"><Input value={edit.button_label ?? ""} onChange={(e) => setEdit({ ...edit, button_label: e.target.value })} /></Field>
        </div>}
      </Dialog>
    </>
  );
}

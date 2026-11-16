import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Check, Clock, FileSignature, Mail, MailOpen, MousePointerClick, Rocket, Send, UserPlus, Users, X } from "lucide-react";
import { Badge, Button, Card, Chip, Drawer, Empty, KpiCard, PageHeader, Select, Spinner, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useCountries } from "@/lib/hooks";
import { cn, dateFr, flag } from "@/lib/utils";

/** Étapes du parcours d'un créateur, dans l'ordre. */
const STEPS = [
  { key: "applied", label: "Candidature" },
  { key: "accepted", label: "Acceptée" },
  { key: "contract_email_sent", label: "Email contrat" },
  { key: "email_opened", label: "Email ouvert" },
  { key: "link_clicked", label: "Lien cliqué" },
  { key: "signed", label: "Signé" },
  { key: "access_sent", label: "Accès envoyé" },
  { key: "first_login", label: "1re connexion" },
  { key: "handles_submitted", label: "Handles soumis" },
  { key: "handles_ok", label: "Handles OK" },
  { key: "warmup_started", label: "Warm-up commencé" },
  { key: "warmup_done", label: "Warm-up validé (24 h)" },
  { key: "ruul_connected", label: "Ruul connecté" },
  { key: "first_post", label: "1er post" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

/** Étape bloquante → relance possible (null = décision interne, pas de relance au créateur). */
const REMIND: Record<StepKey, "contract" | "access" | "handles" | "ruul" | "first_post" | null> = {
  applied: null, accepted: null,
  contract_email_sent: "contract", email_opened: "contract", link_clicked: "contract", signed: "contract",
  access_sent: "access", first_login: "access",
  handles_submitted: "handles", handles_ok: "handles", warmup_started: "handles", warmup_done: "handles",
  ruul_connected: "ruul", first_post: "first_post",
};
const REMIND_LABEL: Record<string, string> = { contract: "contrat", access: "accès", handles: "comptes", ruul: "Ruul", first_post: "1er post" };
const CONTRACT_TEMPLATES = ["contract_to_sign", "contract_reminder"];
const DAY = 86_400_000;

interface Row {
  app: any;
  done: Partial<Record<StepKey, string>>;
  current: StepKey | null;
  since: string | null;
  blockedDays: number;
}

function computeRow(app: any, events: any[], lastSignIn: string | null): Row {
  const done: Partial<Record<StepKey, string>> = {};
  const first = (step: string, pred: (e: any) => boolean = () => true) => events.find((e) => e.step === step && pred(e))?.at as string | undefined;
  const contractMail = (e: any) => !e.meta?.template || CONTRACT_TEMPLATES.includes(e.meta.template);
  const p = app.posters;
  const later = (s: string[]) => s.includes(app.status);
  done.applied = first("applied") ?? app.created_at;
  done.accepted = first("accepted") ?? (later(["accepted", "contract_sent", "signed", "active"]) ? app.decided_at ?? app.updated_at : undefined);
  done.contract_email_sent = first("contract_email_sent") ?? (later(["contract_sent", "signed", "active"]) ? app.contracts?.[0]?.sent_at : undefined);
  done.email_opened = first("email_opened", contractMail);
  done.link_clicked = first("link_clicked", contractMail);
  done.signed = first("signed") ?? app.contracts?.find((c: any) => c.signed_at)?.signed_at;
  // Un contrat signé prouve l'ouverture et le clic (images bloquées, etc.).
  if (done.signed) { done.email_opened ??= done.signed; done.link_clicked ??= done.signed; }
  done.access_sent = first("access_sent") ?? (done.signed && app.poster_id ? done.signed : undefined);
  done.first_login = lastSignIn ?? undefined;
  done.handles_submitted = first("handles_submitted") ?? (p && ["submitted", "verified"].includes(p.handles_status) ? p.handles_checked_at ?? undefined : undefined);
  done.handles_ok = first("handles_ok") ?? (p?.handles_status === "verified" ? p.handles_checked_at ?? undefined : undefined);
  done.warmup_started = first("warmup_started") ?? p?.warmup_started_at ?? undefined;
  done.warmup_done = first("warmup_done") ?? (p?.warmup_status === "validated" ? p.warmup_validated_at ?? undefined : undefined);
  done.ruul_connected = first("ruul_connected") ?? (p?.ruul_status === "done" ? p.ruul_done_at ?? undefined : undefined);
  done.first_post = first("first_post") ?? (app.status === "active" ? app.updated_at : undefined);
  const current = STEPS.find((s) => !done[s.key])?.key ?? null;
  const idx = current ? STEPS.findIndex((s) => s.key === current) : STEPS.length;
  const since = [...STEPS.slice(0, idx)].reverse().map((s) => done[s.key]).find(Boolean) ?? app.created_at;
  return { app, done, current, since, blockedDays: current && since ? (Date.now() - new Date(since).getTime()) / DAY : 0 };
}

/** Initiale colorée (avatar) déterministe. */
const AVATAR_TINTS = ["bg-tint-blue text-accent", "bg-tint-violet text-vik-violet", "bg-tint-cyan text-[#0a95e0]", "bg-tint-green text-success", "bg-tint-yellow text-[#b97800]", "bg-tint-red text-vik-red"];
function Avatar({ name, className }: { name: string; className?: string }) {
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length;
  return <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold uppercase", AVATAR_TINTS[i], className)}>{name.trim().charAt(0) || "?"}</span>;
}

const fmtSince = (days: number) => (days < 1 ? `${Math.max(1, Math.floor(days * 24))} h` : `${Math.floor(days)} j`);

/** Stepper horizontal : 12 points reliés par un trait fin. */
function Stepper({ r }: { r: Row }) {
  const late = !!r.current && r.blockedDays >= 2;
  const curIdx = r.current ? STEPS.findIndex((s) => s.key === r.current) : STEPS.length;
  const doneCount = STEPS.filter((s) => r.done[s.key]).length;
  return (
    <div className="flex w-full min-w-[300px] items-center gap-3">
      <div className="flex flex-1 items-center">
        {STEPS.map((s, i) => {
          const at = r.done[s.key];
          const isCurrent = s.key === r.current;
          return (
            <div key={s.key} className={cn("flex items-center", i > 0 && "flex-1")}>
              {i > 0 && <span className={cn("h-px min-w-1.5 flex-1", i <= curIdx ? "bg-[#9ad7b2]" : "bg-border-strong")} />}
              <span title={`${s.label}${at ? ` · ${dateFr(at, true)}` : isCurrent ? ` · en attente depuis ${fmtSince(r.blockedDays)}` : ""}`}
                className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  at ? "bg-tint-green text-success"
                    : isCurrent ? (late ? "bg-tint-yellow text-[#b97800] ring-2 ring-[#ffbb43]/60" : "bg-white text-accent ring-2 ring-accent")
                    : "bg-white ring-1 ring-border-strong")}>
                {at ? <Check className="h-3 w-3" strokeWidth={3} /> : isCurrent ? <span className={cn("h-1.5 w-1.5 rounded-full", late ? "bg-[#ffbb43]" : "bg-accent")} /> : null}
              </span>
            </div>
          );
        })}
      </div>
      <span className="tabular w-10 shrink-0 text-right text-xs text-subtle-foreground">{doneCount}/{STEPS.length}</span>
    </div>
  );
}

export default function Onboarding() {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: countries } = useCountries();
  const [country, setCountry] = useState("");
  const [stepFilter, setStepFilter] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<Row | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding"],
    queryFn: async () => {
      const [apps, events, signIns, tests] = await Promise.all([
        supabase.from("applications").select("id, first_name, last_name, email, country, status, created_at, updated_at, decided_at, poster_id, posters(handles_status, handles_checked_at, ruul_status, ruul_done_at, tiktok_handle, instagram_handle, warmup_status, warmup_started_at, warmup_validated_at), contracts(sent_at, signed_at, status)")
          .neq("status", "rejected").order("created_at", { ascending: false }).limit(1000),
        supabase.from("onboarding_events").select("application_id, poster_id, step, at, meta").order("at").limit(20000),
        supabase.rpc("posters_last_sign_in"),
        supabase.from("profiles").select("id, email").eq("is_test", true),
      ]);
      if (apps.error) throw apps.error;
      const byApp = new Map<string, any[]>();
      for (const e of events.data ?? []) if (e.application_id) byApp.set(e.application_id, [...(byApp.get(e.application_id) ?? []), e]);
      const login = new Map<string, string | null>(((signIns.data ?? []) as any[]).map((r) => [r.poster_id, r.last_sign_in_at]));
      // Comptes de test (QA, démo) : hors pipeline et hors compteurs.
      const testIds = new Set((tests.data ?? []).map((t: any) => t.id));
      const testEmails = new Set((tests.data ?? []).map((t: any) => String(t.email).toLowerCase()));
      const isTest = (a: any) => String(a.email).toLowerCase().endsWith("@vik-qa.test") || testEmails.has(String(a.email).toLowerCase()) || (a.poster_id && testIds.has(a.poster_id));
      return (apps.data ?? []).filter((a: any) => !isTest(a)).map((a: any) => computeRow(a, byApp.get(a.id) ?? [], a.poster_id ? login.get(a.poster_id) ?? null : null));
    },
  });

  const rows = useMemo(() => (data ?? []).filter((r) =>
    (!country || r.app.country === country) && (!stepFilter || r.current === stepFilter) && (!blockedOnly || (r.current && r.blockedDays >= 2))), [data, country, stepFilter, blockedOnly]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data ?? []) if (r.current) m.set(r.current, (m.get(r.current) ?? 0) + 1);
    return m;
  }, [data]);
  const kpi = useMemo(() => {
    const all = data ?? [];
    const weekAgo = Date.now() - 7 * DAY;
    return {
      pipeline: all.filter((r) => r.current).length,
      blocked: all.filter((r) => r.current && r.blockedDays >= 2).length,
      signedWeek: all.filter((r) => r.done.signed && new Date(r.done.signed).getTime() >= weekAgo).length,
      active: all.filter((r) => r.done.first_post).length,
    };
  }, [data]);
  const usedCountries = useMemo(() => [...new Set((data ?? []).map((r) => r.app.country))], [data]);

  const remind = async (r: Row) => {
    const step = r.current ? REMIND[r.current] : null;
    if (!step) return;
    setBusy(r.app.id);
    try {
      const res = await callFn("recruit", { action: "remind", application_id: r.app.id, step });
      toast(res.action === "new_contract" ? "Contrat expiré : nouveau contrat envoyé" : `Relance « ${REMIND_LABEL[step]} » mise en file`, "success");
      qc.invalidateQueries({ queryKey: ["onboarding"] });
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(null); }
  };
  const remindBulk = async () => {
    const chosen = rows.filter((r) => selected.includes(r.app.id) && r.current && REMIND[r.current]);
    const byStep = new Map<string, string[]>();
    for (const r of chosen) byStep.set(REMIND[r.current!]!, [...(byStep.get(REMIND[r.current!]!) ?? []), r.app.id]);
    setBusy("bulk");
    try {
      let sent = 0;
      for (const [step, ids] of byStep) sent += (await callFn("recruit", { action: "remind_bulk", step, application_ids: ids })).sent;
      toast(`${sent} relance(s) mise(s) en file`, "success");
      setSelected([]);
      qc.invalidateQueries({ queryKey: ["onboarding"] });
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(null); }
  };
  const remindable = rows.filter((r) => selected.includes(r.app.id) && r.current && REMIND[r.current]).length;
  const allChecked = rows.length > 0 && selected.length === rows.length;

  return (
    <div>
      <PageHeader
        title="Onboarding"
        description="Où en est chaque créateur, de la candidature au premier post. Une étape en jaune bloque depuis plus de 48 h."
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="En cours" value={kpi.pipeline} icon={<Users />} tint="blue" hint="Créateurs dans le parcours" />
        <KpiCard label="Bloqués > 48 h" value={kpi.blocked} icon={<AlertTriangle />} tint="yellow" hint={kpi.blocked ? "À relancer" : "Personne ne bloque"} />
        <KpiCard label="Signés (7 j)" value={kpi.signedWeek} icon={<FileSignature />} tint="violet" hint="Contrats signés cette semaine" />
        <KpiCard label="Actifs" value={kpi.active} icon={<Rocket />} tint="green" hint="Premier post publié" />
      </div>

      {/* Filtres */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Chip active={!stepFilter && !blockedOnly} onClick={() => { setStepFilter(""); setBlockedOnly(false); }}>Tous <span className="tabular text-subtle-foreground">{data?.length ?? 0}</span></Chip>
        <Chip active={blockedOnly} onClick={() => setBlockedOnly(!blockedOnly)} onClear={() => setBlockedOnly(false)}>
          <AlertTriangle className="h-3.5 w-3.5" /> Bloqués &gt; 48 h <span className="tabular text-subtle-foreground">{kpi.blocked}</span>
        </Chip>
        {STEPS.filter((s) => counts.get(s.key)).map((s) => (
          <Chip key={s.key} active={stepFilter === s.key} onClick={() => setStepFilter(stepFilter === s.key ? "" : s.key)} onClear={() => setStepFilter("")}>
            {s.label} <span className="tabular text-subtle-foreground">{counts.get(s.key)}</span>
          </Chip>
        ))}
        <Select className="ml-auto h-8 w-44 rounded-full py-0 text-[13px]" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Tous les pays</option>
          {(countries ?? []).filter((c: any) => usedCountries.includes(c.code)).map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
        </Select>
      </div>

      {/* Barre d'action groupée */}
      {selected.length > 0 && (
        <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#cddcff] bg-accent-soft px-4 py-3 shadow-xs">
          <span className="text-[13px] font-medium text-[#0040d6]">{selected.length} sélectionné(s)</span>
          <span className="text-xs text-muted-foreground">{remindable} relançable(s) à leur étape actuelle</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}><X className="h-3.5 w-3.5" /> Annuler</Button>
            <Button size="sm" onClick={remindBulk} loading={busy === "bulk"} disabled={remindable === 0}><Send className="h-3.5 w-3.5" /> Relancer la sélection</Button>
          </div>
        </div>
      )}

      {isLoading ? <div className="flex justify-center py-20"><Spinner /></div>
        : rows.length === 0 ? (
          <Empty title={data?.length ? "Aucun créateur pour ces filtres" : "Aucun créateur en cours d'onboarding"} icon={<UserPlus className="h-5 w-5" />}
            action={!data?.length ? <Link to="/admin/recruitment/candidates"><Button variant="secondary">Voir les candidats</Button></Link> : <Button variant="secondary" onClick={() => { setStepFilter(""); setBlockedOnly(false); setCountry(""); }}>Réinitialiser les filtres</Button>}>
            {data?.length ? "Élargis les filtres pour voir les autres créateurs." : "Dès qu'une candidature est acceptée, le créateur apparaît ici avec ses 12 étapes, de l'email de contrat au premier post."}
          </Empty>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="hidden items-center gap-4 border-b px-5 py-3 text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground md:flex">
              <input type="checkbox" className="h-4 w-4 accent-[#004dff]" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.app.id) : [])} />
              <span className="w-56">Créateur</span><span className="flex-1">Parcours</span><span className="w-44">Étape en cours</span><span className="w-40 text-right">Action</span>
            </div>
            <ul>
              {rows.map((r) => {
                const late = !!r.current && r.blockedDays >= 2;
                const step = r.current ? REMIND[r.current] : null;
                const name = `${r.app.first_name} ${r.app.last_name}`;
                return (
                  <li key={r.app.id} onClick={() => setOpen(r)}
                    className="flex cursor-pointer flex-col gap-3 border-b border-separator px-5 py-4 transition-colors last:border-b-0 hover:bg-muted md:flex-row md:items-center md:gap-4">
                    <div className="flex w-full items-center gap-3 md:w-56 md:shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="h-4 w-4 accent-[#004dff]" checked={selected.includes(r.app.id)} onChange={(e) => setSelected((s) => e.target.checked ? [...s, r.app.id] : s.filter((x) => x !== r.app.id))} />
                      <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => setOpen(r)}>
                        <Avatar name={name} />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-medium text-foreground">{name}</span>
                          <span className="block truncate text-xs text-subtle-foreground">{flag(r.app.country)} {countries?.find((c: any) => c.code === r.app.country)?.name ?? r.app.country}</span>
                        </span>
                      </button>
                    </div>
                    <div className="flex-1 overflow-x-auto"><Stepper r={r} /></div>
                    <div className="md:w-44">
                      {r.current ? (
                        <div>
                          <p className={cn("text-[13px] font-medium", late ? "text-[#8a5a00]" : "text-foreground")}>{STEPS.find((s) => s.key === r.current)!.label}</p>
                          <p className={cn("flex items-center gap-1 text-xs", late ? "text-[#b97800]" : "text-subtle-foreground")}><Clock className="h-3 w-3" /> depuis {fmtSince(r.blockedDays)}</p>
                        </div>
                      ) : <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Terminé</Badge>}
                    </div>
                    <div className="md:w-40 md:text-right" onClick={(e) => e.stopPropagation()}>
                      {step ? <Button size="sm" variant={late ? "default" : "secondary"} loading={busy === r.app.id} onClick={() => remind(r)}><Send className="h-3.5 w-3.5" /> Relancer</Button>
                        : r.current === "accepted" ? <Link to="/admin/recruitment/candidates"><Button size="sm" variant="secondary">Décider</Button></Link> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      <OnboardingDrawer row={open} onClose={() => setOpen(null)} onRemind={remind} busy={busy} />
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  ...Object.fromEntries(STEPS.map((s) => [s.key, s.label])),
  reminder: "Relance envoyée", rejected: "Refusée", applied: "Candidature reçue",
};
const EVENT_ICON: Record<string, any> = {
  applied: UserPlus, accepted: CheckCircle2, contract_email_sent: Mail, email_opened: MailOpen, link_clicked: MousePointerClick,
  signed: FileSignature, access_sent: Send, reminder: Send, first_post: Rocket, rejected: X,
};

function MailStatus({ m }: { m: any }) {
  if (m.clicked_at) return <Badge tone="violet"><MousePointerClick className="h-3 w-3" /> Cliqué{m.click_count > 1 ? ` ×${m.click_count}` : ""}</Badge>;
  if (m.opened_at) return <Badge tone="cyan"><MailOpen className="h-3 w-3" /> Ouvert{m.open_count > 1 ? ` ×${m.open_count}` : ""}</Badge>;
  if (m.status === "sent") return <Badge tone="success"><Check className="h-3 w-3" /> Envoyé</Badge>;
  if (m.status === "failed") return <Badge tone="danger">Échec</Badge>;
  if (m.status === "held") return <Badge tone="warning">En attente</Badge>;
  if (m.status === "cancelled") return <Badge>Annulé</Badge>;
  return <Badge tone="accent">En file</Badge>;
}

function OnboardingDrawer({ row, onClose, onRemind, busy }: { row: Row | null; onClose: () => void; onRemind: (r: Row) => void; busy: string | null }) {
  const { data } = useQuery({
    queryKey: ["onboarding", "detail", row?.app.id],
    enabled: !!row,
    queryFn: async () => {
      const [ev, mails] = await Promise.all([
        supabase.from("onboarding_events").select("step, at, meta").eq("application_id", row!.app.id).order("at"),
        supabase.from("email_outbox").select("id, template_key, subject, status, hold_reason, created_at, sent_at, opened_at, clicked_at, open_count, click_count")
          .or(`application_id.eq.${row!.app.id},to_email.eq.${row!.app.email}`).order("created_at", { ascending: false }).limit(100),
      ]);
      return { events: ev.data ?? [], mails: mails.data ?? [] };
    },
  });
  if (!row) return null;
  const step = row.current ? REMIND[row.current] : null;
  const name = `${row.app.first_name} ${row.app.last_name}`;
  const late = !!row.current && row.blockedDays >= 2;
  return (
    <Drawer open onClose={onClose} title={<span className="flex items-center gap-3"><Avatar name={name} className="h-8 w-8" /><span>{name} <span className="font-normal text-subtle-foreground">{flag(row.app.country)}</span></span></span>}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{row.app.email}</span>
          {row.app.posters?.tiktok_handle && <Badge tone="outline">TikTok @{row.app.posters.tiktok_handle}</Badge>}
          {row.app.posters?.instagram_handle && <Badge tone="outline">Instagram @{row.app.posters.instagram_handle}</Badge>}
        </div>

        {row.current && (
          <div className={cn("flex flex-wrap items-center gap-3 rounded-xl px-4 py-3", late ? "bg-tint-yellow" : "bg-accent-soft")}>
            <Clock className={cn("h-4 w-4", late ? "text-[#b97800]" : "text-accent")} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">En attente : {STEPS.find((s) => s.key === row.current)!.label}</p>
              <p className="text-xs text-muted-foreground">depuis {fmtSince(row.blockedDays)}</p>
            </div>
            {step && <Button size="sm" loading={busy === row.app.id} onClick={() => onRemind(row)}><Send className="h-3.5 w-3.5" /> Relancer ({REMIND_LABEL[step]})</Button>}
          </div>
        )}

        <section>
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">Étapes</h3>
          <ol className="relative space-y-0">
            {STEPS.map((s, i) => {
              const at = row.done[s.key];
              const isCurrent = s.key === row.current;
              return (
                <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < STEPS.length - 1 && <span className={cn("absolute left-[11px] top-6 h-[calc(100%-16px)] w-px", at ? "bg-[#9ad7b2]" : "bg-border-strong")} />}
                  <span className={cn("relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    at ? "bg-tint-green text-success" : isCurrent ? (late ? "bg-tint-yellow text-[#b97800] ring-2 ring-[#ffbb43]/60" : "bg-white text-accent ring-2 ring-accent") : "bg-white ring-1 ring-border-strong")}>
                    {at ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : isCurrent ? <span className={cn("h-2 w-2 rounded-full", late ? "bg-[#ffbb43]" : "bg-accent")} /> : null}
                  </span>
                  <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3 pt-0.5">
                    <span className={cn("text-[13px]", at || isCurrent ? "font-medium text-foreground" : "text-subtle-foreground")}>{s.label}</span>
                    <span className="tabular shrink-0 text-xs text-subtle-foreground">{at ? dateFr(at, true) : isCurrent ? `en attente · ${fmtSince(row.blockedDays)}` : ""}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">Historique</h3>
          {!data ? <Spinner /> : data.events.length === 0 ? <p className="text-sm text-muted-foreground">Aucun événement enregistré.</p> : (
            <ul className="space-y-3">
              {data.events.map((e: any, i: number) => {
                const Icon = EVENT_ICON[e.step] ?? Check;
                return (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f1f3f7] text-muted-foreground"><Icon className="h-3.5 w-3.5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-foreground">{EVENT_LABEL[e.step] ?? e.step}{e.meta?.step ? <span className="text-muted-foreground"> · {REMIND_LABEL[e.meta.step] ?? e.meta.step}</span> : null}</p>
                      <p className="tabular text-xs text-subtle-foreground">{dateFr(e.at, true)}{e.meta?.template ? ` · ${e.meta.template}` : ""}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">Emails</h3>
          {!data ? <Spinner /> : data.mails.length === 0 ? <p className="text-sm text-muted-foreground">Aucun email pour ce créateur.</p> : (
            <ul className="divide-y divide-separator rounded-xl border">
              {data.mails.map((m: any) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <Mail className="h-4 w-4 shrink-0 text-subtle-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{m.subject}</p>
                    <p className="tabular text-xs text-subtle-foreground">{dateFr(m.created_at, true)}{m.hold_reason ? ` · ${m.hold_reason}` : ""}</p>
                  </div>
                  <MailStatus m={m} />
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-subtle-foreground">Ouvertures et clics suivis par nos propres liens (pixel et redirection), même en mode test. « En attente » = resté dans la boîte d'envoi (mode test sans destinataire ou pas d'expéditeur).</p>
        </section>
      </div>
    </Drawer>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Check, Circle, Clock, Mail, MousePointerClick, Send } from "lucide-react";
import { Badge, Button, Drawer, Empty, PageHeader, Select, Spinner, Table, Td, Th, useToast } from "@/components/ui";
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
  { key: "ruul_connected", label: "Ruul connecté" },
  { key: "first_post", label: "1er post" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

/** Étape bloquante → relance possible (null = décision interne, pas de relance au créateur). */
const REMIND: Record<StepKey, "contract" | "access" | "handles" | "ruul" | "first_post" | null> = {
  applied: null, accepted: null,
  contract_email_sent: "contract", email_opened: "contract", link_clicked: "contract", signed: "contract",
  access_sent: "access", first_login: "access",
  handles_submitted: "handles", handles_ok: "handles",
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
  done.ruul_connected = first("ruul_connected") ?? (p?.ruul_status === "done" ? p.ruul_done_at ?? undefined : undefined);
  done.first_post = first("first_post") ?? (app.status === "active" ? app.updated_at : undefined);
  const current = STEPS.find((s) => !done[s.key])?.key ?? null;
  const idx = current ? STEPS.findIndex((s) => s.key === current) : STEPS.length;
  const since = [...STEPS.slice(0, idx)].reverse().map((s) => done[s.key]).find(Boolean) ?? app.created_at;
  return { app, done, current, since, blockedDays: current && since ? (Date.now() - new Date(since).getTime()) / DAY : 0 };
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
      const [apps, events, signIns] = await Promise.all([
        supabase.from("applications").select("id, first_name, last_name, email, country, status, created_at, updated_at, decided_at, poster_id, posters(handles_status, handles_checked_at, ruul_status, ruul_done_at, tiktok_handle, instagram_handle), contracts(sent_at, signed_at, status)")
          .neq("status", "rejected").order("created_at", { ascending: false }).limit(1000),
        supabase.from("onboarding_events").select("application_id, poster_id, step, at, meta").order("at").limit(20000),
        supabase.rpc("posters_last_sign_in"),
      ]);
      if (apps.error) throw apps.error;
      const byApp = new Map<string, any[]>();
      for (const e of events.data ?? []) if (e.application_id) byApp.set(e.application_id, [...(byApp.get(e.application_id) ?? []), e]);
      const login = new Map<string, string | null>(((signIns.data ?? []) as any[]).map((r) => [r.poster_id, r.last_sign_in_at]));
      return (apps.data ?? []).map((a: any) => computeRow(a, byApp.get(a.id) ?? [], a.poster_id ? login.get(a.poster_id) ?? null : null));
    },
  });

  const rows = useMemo(() => (data ?? []).filter((r) =>
    (!country || r.app.country === country) && (!stepFilter || r.current === stepFilter) && (!blockedOnly || (r.current && r.blockedDays >= 2))), [data, country, stepFilter, blockedOnly]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of data ?? []) if (r.current) m.set(r.current, (m.get(r.current) ?? 0) + 1);
    return m;
  }, [data]);

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

  return (
    <div>
      <PageHeader
        title="Suivi d'onboarding"
        description="Où en est chaque créateur, de la candidature au premier post. Une étape en orange bloque depuis plus de 48 h."
        actions={selected.length > 0 && <Button onClick={remindBulk} loading={busy === "bulk"} disabled={remindable === 0}><Send className="h-4 w-4" /> Relancer la sélection ({remindable})</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select className="h-8 w-44 text-xs" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Tous les pays</option>
          {(countries ?? []).map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
        </Select>
        <Select className="h-8 w-52 text-xs" value={stepFilter} onChange={(e) => setStepFilter(e.target.value)}>
          <option value="">Toutes les étapes en cours</option>
          {STEPS.map((s) => <option key={s.key} value={s.key}>{s.label} ({counts.get(s.key) ?? 0})</option>)}
        </Select>
        <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={blockedOnly} onChange={(e) => setBlockedOnly(e.target.checked)} /> Bloqués &gt; 48 h</label>
        <span className="ml-auto text-xs text-muted-foreground">{rows.length} créateur(s)</span>
      </div>

      {isLoading ? <div className="flex justify-center py-20"><Spinner /></div>
        : rows.length === 0 ? (
          <Empty title={data?.length ? "Aucun créateur pour ces filtres" : "Aucun créateur en cours d'onboarding"}>
            {data?.length ? "Élargis les filtres." : <>Les candidatures acceptées apparaissent ici, étape par étape. <Link className="underline" to="/admin/recruitment/candidates">Voir les candidats</Link>.</>}
          </Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-8"><input type="checkbox" checked={selected.length > 0 && selected.length === rows.length} onChange={(e) => setSelected(e.target.checked ? rows.map((r) => r.app.id) : [])} /></Th>
                <Th>Créateur</Th><Th>Parcours</Th><Th>Bloque sur</Th><Th>Depuis</Th><Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const late = !!r.current && r.blockedDays >= 2;
                const step = r.current ? REMIND[r.current] : null;
                return (
                  <tr key={r.app.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpen(r)}>
                    <Td><input type="checkbox" onClick={(e) => e.stopPropagation()} checked={selected.includes(r.app.id)} onChange={(e) => setSelected((s) => e.target.checked ? [...s, r.app.id] : s.filter((x) => x !== r.app.id))} /></Td>
                    <Td><p className="font-medium">{flag(r.app.country)} {r.app.first_name} {r.app.last_name}</p><p className="text-xs text-muted-foreground">{r.app.email}</p></Td>
                    <Td>
                      <div className="flex items-center gap-1">
                        {STEPS.map((s) => {
                          const at = r.done[s.key];
                          const isCurrent = s.key === r.current;
                          return (
                            <span key={s.key} title={`${s.label}${at ? ` · ${dateFr(at, true)}` : isCurrent ? " · en attente" : ""}`}
                              className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                                at ? "border-success bg-success text-white" : isCurrent ? (late ? "border-warning bg-warning/20" : "border-accent bg-accent/10") : "border-border")}>
                              {at ? <Check className="h-3 w-3" /> : isCurrent ? <Clock className="h-3 w-3" /> : null}
                            </span>
                          );
                        })}
                      </div>
                    </Td>
                    <Td>{r.current ? <Badge tone={late ? "warning" : "accent"}>{STEPS.find((s) => s.key === r.current)!.label}</Badge> : <Badge tone="success">Terminé</Badge>}</Td>
                    <Td className={cn("whitespace-nowrap text-xs", late && "font-medium text-[color-mix(in_oklch,var(--warning),black_35%)]")}>{r.current ? `${Math.floor(r.blockedDays)} j ${Math.floor((r.blockedDays % 1) * 24)} h` : "—"}</Td>
                    <Td className="whitespace-nowrap" >
                      {step ? <Button size="sm" variant="outline" loading={busy === r.app.id} onClick={(e) => { e.stopPropagation(); remind(r); }}><Send className="h-3.5 w-3.5" /> Relancer ({REMIND_LABEL[step]})</Button>
                        : r.current === "accepted" ? <Link to="/admin/recruitment/candidates" onClick={(e) => e.stopPropagation()} className="text-xs text-accent underline">Décider</Link> : null}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      <OnboardingDrawer row={open} onClose={() => setOpen(null)} onRemind={remind} busy={busy} />
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  ...Object.fromEntries(STEPS.map((s) => [s.key, s.label])),
  reminder: "Relance", rejected: "Refusée", applied: "Candidature reçue",
};

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
  return (
    <Drawer open onClose={onClose} title={`${flag(row.app.country)} ${row.app.first_name} ${row.app.last_name}`}>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{row.app.email}</span>
          {row.app.posters?.tiktok_handle && <Badge tone="outline">TT @{row.app.posters.tiktok_handle}</Badge>}
          {row.app.posters?.instagram_handle && <Badge tone="outline">IG @{row.app.posters.instagram_handle}</Badge>}
          {step && <Button size="sm" className="ml-auto" loading={busy === row.app.id} onClick={() => onRemind(row)}><Send className="h-3.5 w-3.5" /> Relancer ({REMIND_LABEL[step]})</Button>}
        </div>

        <section>
          <h3 className="mb-3 text-sm font-semibold">Étapes</h3>
          <ol className="space-y-2">
            {STEPS.map((s) => {
              const at = row.done[s.key];
              const isCurrent = s.key === row.current;
              return (
                <li key={s.key} className="flex items-center gap-3 text-sm">
                  {at ? <Check className="h-4 w-4 text-success" /> : isCurrent ? <Clock className="h-4 w-4 text-accent" /> : <Circle className="h-4 w-4 text-border" />}
                  <span className={cn(!at && !isCurrent && "text-muted-foreground")}>{s.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{at ? dateFr(at, true) : isCurrent ? `en attente depuis ${Math.floor(row.blockedDays)} j` : ""}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold">Historique</h3>
          {!data ? <Spinner /> : data.events.length === 0 ? <p className="text-sm text-muted-foreground">Aucun événement enregistré.</p> : (
            <ul className="space-y-1.5 border-l pl-4 text-sm">
              {data.events.map((e: any, i: number) => (
                <li key={i} className="flex gap-3"><span className="w-32 shrink-0 text-xs text-muted-foreground">{dateFr(e.at, true)}</span>
                  <span>{EVENT_LABEL[e.step] ?? e.step}{e.meta?.step ? ` · ${REMIND_LABEL[e.meta.step] ?? e.meta.step}` : ""}{e.meta?.template ? <span className="text-muted-foreground"> · {e.meta.template}</span> : null}</span></li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold">Emails</h3>
          {!data ? <Spinner /> : data.mails.length === 0 ? <p className="text-sm text-muted-foreground">Aucun email pour ce créateur.</p> : (
            <Table>
              <thead><tr><Th>Créé</Th><Th>Objet</Th><Th>Statut</Th><Th>Ouvert</Th><Th>Cliqué</Th></tr></thead>
              <tbody>
                {data.mails.map((m: any) => (
                  <tr key={m.id}>
                    <Td className="whitespace-nowrap text-xs">{dateFr(m.created_at, true)}</Td>
                    <Td className="max-w-56 truncate text-xs" >{m.subject}</Td>
                    <Td><Badge tone={m.status === "sent" ? "success" : m.status === "failed" ? "danger" : m.status === "held" ? "warning" : "default"}>{m.status}</Badge>{m.hold_reason && <p className="text-[11px] text-muted-foreground">{m.hold_reason}</p>}</Td>
                    <Td className="text-xs">{m.opened_at ? <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {m.open_count}×</span> : "—"}</Td>
                    <Td className="text-xs">{m.clicked_at ? <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {m.click_count}×</span> : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Ouvertures et clics suivis par nos propres liens (pixel et redirection), même en mode test. Un email « held » est resté dans la boîte d'envoi (mode test sans destinataire ou pas d'expéditeur).</p>
        </section>
      </div>
    </Drawer>
  );
}

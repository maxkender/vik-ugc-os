import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity as Activity2, ExternalLink, Search, UserPlus, Users, Wallet } from "lucide-react";
import { supabase, callFn } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useCountries, usePools, usePosters } from "@/lib/hooks";
import { Badge, Button, Chip, Drawer, Empty, Field, Input, KpiCard, PageHeader, Select, Spinner, Table, Td, Th, useToast } from "@/components/ui";
import { cn, compact, dateFr, flag } from "@/lib/utils";

const RUUL_LABEL: Record<string, string> = { none: "Pas commencé", email_given: "À ajouter sur Ruul", added: "Invité sur Ruul", done: "Prêt (It's done)", stopped: "Arrêté" };
const ruulTone = (s: string) => (s === "done" ? "success" : s === "email_given" ? "warning" : s === "added" ? "accent" : "default") as any;
const statusTone = (s: string) => (s === "active" ? "success" : s === "paused" ? "warning" : "default") as any;

const AVATAR_TINTS = ["bg-tint-blue text-accent", "bg-tint-violet text-vik-violet", "bg-tint-cyan text-[#0a95e0]", "bg-tint-green text-success", "bg-tint-yellow text-[#b97800]", "bg-tint-red text-vik-red"];
function Avatar({ name, className }: { name: string; className?: string }) {
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length;
  return <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold uppercase", AVATAR_TINTS[i], className)}>{name.trim().charAt(0) || "?"}</span>;
}
const STATUS_LABEL: Record<string, string> = { active: "Actif", paused: "En pause", offboarded: "Sorti" };

/** Activité 7 jours : barre segmentée validés / postés / à faire. */
function Activity({ s }: { s: { posted: number; validated: number; total: number } }) {
  const total = Math.max(s.total, 1);
  return (
    <div className="w-36">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-[#f1f3f7]">
        <div className="bg-success" style={{ width: `${(s.validated / total) * 100}%` }} />
        <div className="bg-accent" style={{ width: `${((s.posted - s.validated) / total) * 100}%` }} />
      </div>
      <p className="tabular mt-1.5 text-xs text-subtle-foreground">{s.total ? `${s.posted}/${s.total} postés · ${s.validated} validés` : "Aucun brief"}</p>
    </div>
  );
}

export default function Posters() {
  const posters = usePosters();
  const countries = useCountries();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<any | null>(null);
  const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const counts = useQuery({
    queryKey: ["poster_counts", since],
    queryFn: async () => (await supabase.from("brief_assignments").select("poster_id, status").gte("due_date", since)).data ?? [],
  });
  const stats = useMemo(() => {
    const m = new Map<string, { posted: number; validated: number; total: number }>();
    for (const a of counts.data ?? []) {
      const s = m.get(a.poster_id) ?? { posted: 0, validated: 0, total: 0 };
      s.total++;
      if (a.status === "posted" || a.status === "validated") s.posted++;
      if (a.status === "validated") s.validated++;
      m.set(a.poster_id, s);
    }
    return m;
  }, [counts.data]);
  const all = posters.data ?? [];
  const rows = all.filter((p: any) =>
    (!country || p.country === country) && (!status || p.status === status) &&
    (!q || `${p.display_name} ${p.profiles?.email} ${p.tiktok_handle ?? ""} ${p.instagram_handle ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const countryName = (c: string) => (countries.data ?? []).find((x: any) => x.code === c)?.name ?? c;
  const n = (st: string) => all.filter((p: any) => p.status === st).length;

  return (
    <div>
      <PageHeader title="Posteurs" description="Les créateurs sous contrat : statut, paiement Ruul, comptes et activité des 7 derniers jours." />
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Posteurs" value={all.length} icon={<Users />} tint="blue" hint="Sous contrat" />
        <KpiCard label="Actifs" value={n("active")} icon={<Activity2 />} tint="green" hint="Reçoivent des briefs" />
        <KpiCard label="Prêts à être payés" value={all.filter((p: any) => p.ruul_status === "done").length} icon={<Wallet />} tint="violet" hint="Ruul « It's done »" />
        <KpiCard label="À ajouter sur Ruul" value={all.filter((p: any) => p.ruul_status === "email_given").length} icon={<UserPlus />} tint="yellow" hint="Email Ruul fourni" />
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Chip active={!status} onClick={() => setStatus("")}>Tous <span className="tabular text-subtle-foreground">{all.length}</span></Chip>
        {(["active", "paused", "offboarded"] as const).map((st) => (
          <Chip key={st} active={status === st} onClick={() => setStatus(status === st ? "" : st)} onClear={() => setStatus("")}>{STATUS_LABEL[st]} <span className="tabular text-subtle-foreground">{n(st)}</span></Chip>
        ))}
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Select className="h-8 w-44 rounded-full py-0 text-[13px]" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Tous les pays</option>
            {(countries.data ?? []).map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
          </Select>
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-2 h-4 w-4 text-subtle-foreground" /><Input className="h-8 w-56 rounded-full pl-9 text-[13px]" placeholder="Nom, email, handle…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
      </div>
      {posters.isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : rows.length === 0 ? (
        <Empty title={all.length ? "Aucun posteur pour ces filtres" : "Aucun posteur pour l'instant"} icon={<Users className="h-5 w-5" />}>
          {all.length ? "Élargis les filtres." : "Un posteur est créé automatiquement quand un candidat accepté signe son contrat."}
        </Empty>
      ) : (
        <Table>
          <thead><tr><Th>Posteur</Th><Th>Pays</Th><Th>Statut</Th><Th>Ruul</Th><Th>Comptes</Th><Th>Activité 7 j</Th></tr></thead>
          <tbody>
            {rows.map((p: any) => {
              const s = stats.get(p.id) ?? { posted: 0, validated: 0, total: 0 };
              const name = p.profiles?.full_name ?? p.display_name;
              return (
                <tr key={p.id} className="cursor-pointer" onClick={() => setOpen(p)}>
                  <Td><div className="flex items-center gap-3"><Avatar name={name} className="h-8 w-8 text-xs" /><div className="min-w-0"><p className="truncate font-medium text-foreground">{name}</p><p className="truncate text-xs text-subtle-foreground">{p.profiles?.email}</p></div></div></Td>
                  <Td className="whitespace-nowrap">{flag(p.country)} {countryName(p.country)} {p.zone_code && <Badge tone="outline" className="ml-1">Zone {p.zone_code}</Badge>}</Td>
                  <Td><Badge tone={statusTone(p.status)}>{STATUS_LABEL[p.status] ?? p.status}</Badge></Td>
                  <Td><Badge tone={ruulTone(p.ruul_status)}>{RUUL_LABEL[p.ruul_status] ?? p.ruul_status}</Badge></Td>
                  <Td className="text-[13px]">
                    {p.tiktok_handle || p.instagram_handle ? (
                      <div className="space-y-0.5">{p.tiktok_handle && <p><span className="text-subtle-foreground">TT</span> @{p.tiktok_handle}</p>}{p.instagram_handle && <p><span className="text-subtle-foreground">IG</span> @{p.instagram_handle}</p>}</div>
                    ) : <span className="text-subtle-foreground">Pas encore</span>}
                  </Td>
                  <Td><Activity s={s} /></Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      {open && <PosterDrawer poster={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PosterDrawer({ poster, onClose }: { poster: any; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const pools = usePools();
  const [quota, setQuota] = useState(poster.daily_quota);
  const [busy, setBusy] = useState<string | null>(null);
  const assignments = useQuery({
    queryKey: ["poster_assignments", poster.id],
    queryFn: async () => (await supabase.from("brief_assignments").select("*, briefs(title)").eq("poster_id", poster.id).order("due_date", { ascending: false }).limit(30)).data ?? [],
  });
  const app = useQuery({
    queryKey: ["poster_app", poster.application_id],
    enabled: !!poster.application_id,
    queryFn: async () => (await supabase.from("applications").select("id, created_at, status, tiktok_url, instagram_url").eq("id", poster.application_id).maybeSingle()).data,
  });
  const reload = () => { qc.invalidateQueries({ queryKey: ["posters"] }); qc.invalidateQueries({ queryKey: ["pools"] }); qc.invalidateQueries({ queryKey: ["poster_assignments", poster.id] }); };
  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try { await fn(); if (ok) toast(ok, "success"); reload(); } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(null); }
  };
  const update = (patch: Record<string, unknown>) => run("upd", async () => { const { error } = await supabase.from("posters").update(patch).eq("id", poster.id); if (error) throw error; }, "Enregistré");
  const togglePool = (poolId: string, on: boolean) => run(`pool-${poolId}`, async () => {
    const { error } = on
      ? await supabase.from("pool_members").insert({ pool_id: poolId, poster_id: poster.id })
      : await supabase.from("pool_members").delete().eq("pool_id", poolId).eq("poster_id", poster.id);
    if (error) throw error;
  });
  const review = (id: string, status: string) => {
    const reason = status === "rejected" ? window.prompt("Raison (visible par le posteur) :") ?? "" : undefined;
    run(`rev-${id}`, () => callFn("briefs", { action: "review", assignment_id: id, status, reason }), "Mis à jour");
  };

  return (
    <Drawer open onClose={onClose} title={<span className="flex items-center gap-3"><Avatar name={poster.profiles?.full_name ?? poster.display_name} className="h-8 w-8" /><span>{poster.profiles?.full_name ?? poster.display_name} <span className="font-normal text-subtle-foreground">{flag(poster.country)}</span></span></span>}>
      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl border p-5 text-sm">
          <div><p className="text-xs text-subtle-foreground">Email</p>{poster.profiles?.email}</div>
          <div><p className="text-xs text-subtle-foreground">Langue / zone</p>{poster.language ?? "—"} · zone {poster.zone_code ?? "—"}</div>
          <div><p className="text-xs text-subtle-foreground">Début</p>{dateFr(poster.started_at)}</div>
          <div><p className="text-xs text-subtle-foreground">Candidature</p>{app.data ? <a className="text-accent hover:underline" href={`/admin/recruitment/candidates?id=${app.data.id}`}>du {dateFr(app.data.created_at)}</a> : "—"}</div>
          <div><p className="text-xs text-subtle-foreground">TikTok</p>{poster.tiktok_handle ? `@${poster.tiktok_handle}` : app.data?.tiktok_url ?? "—"}</div>
          <div><p className="text-xs text-subtle-foreground">Instagram</p>{poster.instagram_handle ? `@${poster.instagram_handle}` : app.data?.instagram_url ?? "—"}</div>
        </section>

        <section className="space-y-3 rounded-xl border p-5">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">Paiement Ruul</h3>
          <p className="text-sm">Email Ruul : <span className="font-medium">{poster.ruul_email ?? "—"}</span> · <Badge tone={ruulTone(poster.ruul_status)}>{RUUL_LABEL[poster.ruul_status]}</Badge></p>
          {poster.ruul_status === "added" && <p className="text-xs text-subtle-foreground">Ajouté le {dateFr(poster.ruul_added_at)} · {poster.ruul_reminders} message(s) envoyé(s)</p>}
          {isAdmin && poster.ruul_status === "email_given" && (
            <Button size="sm" loading={busy === "ruul"} onClick={() => run("ruul", () => callFn("payroll", { action: "ruul_added", poster_id: poster.id }), "Invitation Ruul envoyée")}>Ajouté sur Ruul</Button>
          )}
        </section>

        {isAdmin && (
          <section className="grid grid-cols-2 gap-4">
            <Field label="Statut">
              <Select defaultValue={poster.status} onChange={(e) => update({ status: e.target.value })}>
                <option value="active">Actif</option><option value="paused">En pause</option><option value="offboarded">Sorti</option>
              </Select>
            </Field>
            <Field label="Briefs par jour">
              <div className="flex gap-2"><Input type="number" min={0} max={10} value={quota} onChange={(e) => setQuota(Number(e.target.value))} /><Button variant="outline" onClick={() => update({ daily_quota: quota })}>OK</Button></div>
            </Field>
          </section>
        )}

        <section>
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">Pools</h3>
          <div className="flex flex-wrap gap-3 text-sm">
            {(pools.data ?? []).map((p: any) => {
              const on = (p.pool_members ?? []).some((m: any) => m.poster_id === poster.id);
              return <label key={p.id} className="flex items-center gap-2"><input type="checkbox" disabled={!isAdmin} checked={on} onChange={(e) => togglePool(p.id, e.target.checked)} />{p.name}</label>;
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">Briefs récents</h3>
          {assignments.isLoading ? <Spinner /> : (assignments.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Aucun brief.</p> : (
            <div className="space-y-2">
              {(assignments.data ?? []).map((a: any) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.briefs?.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-subtle-foreground">{dateFr(a.due_date)} <Badge tone={a.status === "validated" ? "success" : a.status === "rejected" ? "danger" : a.status === "posted" ? "accent" : "default"}>{({ todo: "À faire", posted: "Posté", validated: "Validé", rejected: "Refusé" } as Record<string, string>)[a.status] ?? a.status}</Badge>
                      {a.views_d7 !== null ? ` · J+7 ${compact(a.views_d7)} vues` : a.views_d2 !== null ? ` · J+2 ${compact(a.views_d2)} vues` : ""}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {a.posted_url && <a href={a.posted_url} target="_blank" rel="noreferrer" className="rounded p-1.5 hover:bg-muted"><ExternalLink className="h-4 w-4" /></a>}
                    {a.posted_url && a.status !== "validated" && <Button size="sm" variant="success" loading={busy === `rev-${a.id}`} onClick={() => review(a.id, "validated")}>Valider</Button>}
                    {a.posted_url && a.status !== "rejected" && <Button size="sm" variant="secondary" onClick={() => review(a.id, "rejected")}>Refuser</Button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Drawer>
  );
}

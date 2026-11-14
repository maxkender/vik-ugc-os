import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Search } from "lucide-react";
import { supabase, callFn } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useCountries, usePools, usePosters } from "@/lib/hooks";
import { Badge, Button, Drawer, Empty, Field, Input, PageHeader, Select, Spinner, Table, Td, Th, useToast } from "@/components/ui";
import { compact, dateFr, flag } from "@/lib/utils";

const RUUL_LABEL: Record<string, string> = { none: "Pas commencé", email_given: "À ajouter sur Ruul", added: "Invité sur Ruul", done: "Prêt (It's done)", stopped: "Arrêté" };
const ruulTone = (s: string) => (s === "done" ? "success" : s === "email_given" ? "warning" : s === "added" ? "accent" : "default") as any;
const statusTone = (s: string) => (s === "active" ? "success" : s === "paused" ? "warning" : "default") as any;

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
  const rows = (posters.data ?? []).filter((p: any) =>
    (!country || p.country === country) && (!status || p.status === status) &&
    (!q || `${p.display_name} ${p.profiles?.email} ${p.tiktok_handle ?? ""} ${p.instagram_handle ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <PageHeader title="Posteurs" description={`${(posters.data ?? []).length} posteurs · ${(posters.data ?? []).filter((p: any) => p.status === "active").length} actifs`} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="w-64 pl-8" placeholder="Nom, email, handle…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select className="w-48" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="">Tous les pays</option>
          {(countries.data ?? []).map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
        </Select>
        <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous statuts</option><option value="active">Actif</option><option value="paused">En pause</option><option value="offboarded">Sorti</option>
        </Select>
      </div>
      {posters.isLoading ? <Spinner /> : rows.length === 0 ? <Empty title="Aucun posteur">Les posteurs apparaissent ici après la signature de leur contrat.</Empty> : (
        <Table>
          <thead><tr><Th>Posteur</Th><Th>Pays</Th><Th>Zone</Th><Th>Statut</Th><Th>Ruul</Th><Th>Comptes</Th><Th>7 j : postés / validés</Th></tr></thead>
          <tbody>
            {rows.map((p: any) => {
              const s = stats.get(p.id) ?? { posted: 0, validated: 0, total: 0 };
              return (
                <tr key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setOpen(p)}>
                  <Td><div className="font-medium">{p.profiles?.full_name ?? p.display_name}</div><div className="text-xs text-muted-foreground">{p.profiles?.email}</div></Td>
                  <Td>{flag(p.country)} {p.country}</Td>
                  <Td>{p.zone_code ?? "—"}</Td>
                  <Td><Badge tone={statusTone(p.status)}>{p.status}</Badge></Td>
                  <Td><Badge tone={ruulTone(p.ruul_status)}>{RUUL_LABEL[p.ruul_status] ?? p.ruul_status}</Badge></Td>
                  <Td className="text-xs">{p.tiktok_handle && <div>TT @{p.tiktok_handle}</div>}{p.instagram_handle && <div>IG @{p.instagram_handle}</div>}</Td>
                  <Td>{s.posted} / {s.validated} <span className="text-xs text-muted-foreground">({s.total} assignés)</span></Td>
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
    <Drawer open onClose={onClose} title={<span>{flag(poster.country)} {poster.profiles?.full_name ?? poster.display_name}</span>}>
      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Email</p>{poster.profiles?.email}</div>
          <div><p className="text-xs text-muted-foreground">Langue / zone</p>{poster.language ?? "—"} · zone {poster.zone_code ?? "—"}</div>
          <div><p className="text-xs text-muted-foreground">Début</p>{dateFr(poster.started_at)}</div>
          <div><p className="text-xs text-muted-foreground">Candidature</p>{app.data ? <a className="text-accent hover:underline" href={`/admin/recruitment/candidates?id=${app.data.id}`}>du {dateFr(app.data.created_at)}</a> : "—"}</div>
          <div><p className="text-xs text-muted-foreground">TikTok</p>{poster.tiktok_handle ? `@${poster.tiktok_handle}` : app.data?.tiktok_url ?? "—"}</div>
          <div><p className="text-xs text-muted-foreground">Instagram</p>{poster.instagram_handle ? `@${poster.instagram_handle}` : app.data?.instagram_url ?? "—"}</div>
        </section>

        <section className="space-y-2 rounded-lg border p-4">
          <h3 className="font-semibold">Ruul</h3>
          <p className="text-sm">Email Ruul : <span className="font-medium">{poster.ruul_email ?? "—"}</span> · <Badge tone={ruulTone(poster.ruul_status)}>{RUUL_LABEL[poster.ruul_status]}</Badge></p>
          {poster.ruul_status === "added" && <p className="text-xs text-muted-foreground">Ajouté le {dateFr(poster.ruul_added_at)} · {poster.ruul_reminders} message(s) envoyé(s)</p>}
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
          <h3 className="mb-2 font-semibold">Pools</h3>
          <div className="flex flex-wrap gap-3 text-sm">
            {(pools.data ?? []).map((p: any) => {
              const on = (p.pool_members ?? []).some((m: any) => m.poster_id === poster.id);
              return <label key={p.id} className="flex items-center gap-2"><input type="checkbox" disabled={!isAdmin} checked={on} onChange={(e) => togglePool(p.id, e.target.checked)} />{p.name}</label>;
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Briefs récents</h3>
          {assignments.isLoading ? <Spinner /> : (assignments.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Aucun brief.</p> : (
            <div className="space-y-2">
              {(assignments.data ?? []).map((a: any) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.briefs?.title}</div>
                    <div className="text-xs text-muted-foreground">{dateFr(a.due_date)} · <Badge tone={a.status === "validated" ? "success" : a.status === "rejected" ? "danger" : a.status === "posted" ? "accent" : "default"}>{a.status}</Badge>
                      {a.views_d7 !== null ? ` · J+7 ${compact(a.views_d7)} vues` : a.views_d2 !== null ? ` · J+2 ${compact(a.views_d2)} vues` : ""}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    {a.posted_url && <a href={a.posted_url} target="_blank" rel="noreferrer" className="rounded p-1.5 hover:bg-muted"><ExternalLink className="h-4 w-4" /></a>}
                    {a.posted_url && a.status !== "validated" && <Button size="sm" variant="success" loading={busy === `rev-${a.id}`} onClick={() => review(a.id, "validated")}>Valider</Button>}
                    {a.posted_url && a.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => review(a.id, "rejected")}>Refuser</Button>}
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

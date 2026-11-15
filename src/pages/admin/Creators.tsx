import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileText, Mail, MessageSquare, Search, Users, Wallet, Clapperboard, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApps, useZones } from "@/lib/hooks";
import { formatMoney } from "@shared/zones.ts";
import { Badge, Card, Chip, Empty, Input, PageHeader, Spinner, Table, Td, Th } from "@/components/ui";
import { cn, compact, dateFr, flag } from "@/lib/utils";

/** Un créateur = un posteur, ou une recrue (candidature acceptée / contrat envoyé / signé) sans posteur encore. */
type Creator = {
  key: string; // id du posteur, ou "app-<id candidature>"
  posterId: string | null;
  applicationId: string | null;
  name: string;
  email: string | null;
  tiktok: string | null;
  instagram: string | null;
  ruulEmail: string | null;
  ruulStatus: string | null;
  country: string | null;
  zone: string | null;
  appId: string | null;
  status: string;
  isTest: boolean;
  posted: number;
  validated: number;
  viewsD7: number;
};

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "default" | "accent" | "violet" | "danger" }> = {
  active: { label: "Actif", tone: "success" },
  paused: { label: "En pause", tone: "warning" },
  offboarded: { label: "Sorti", tone: "default" },
  accepted: { label: "Accepté", tone: "accent" },
  contract_sent: { label: "Contrat envoyé", tone: "violet" },
  signed: { label: "Signé", tone: "accent" },
};
const RUUL: Record<string, { label: string; tone: "success" | "warning" | "default" | "accent" | "danger" }> = {
  none: { label: "Pas d'email", tone: "default" },
  email_given: { label: "À ajouter", tone: "warning" },
  added: { label: "Invité", tone: "accent" },
  done: { label: "Prêt", tone: "success" },
};

const handle = (h: string | null | undefined) => (h ? String(h).replace(/^@/, "").trim() : null);
const fromUrl = (u: string | null | undefined, re: RegExp) => (u ? (u.match(re)?.[1] ?? null) : null);
const tiktokUrl = (h: string) => `https://www.tiktok.com/@${h}`;
const instaUrl = (h: string) => `https://www.instagram.com/${h}/`;

function useCreators() {
  return useQuery({
    queryKey: ["creators"],
    queryFn: async (): Promise<Creator[]> => {
      const [posters, apps, assignments] = await Promise.all([
        supabase.from("posters").select("*, profiles(full_name, email, is_test)"),
        supabase.from("applications").select("id, status, first_name, last_name, email, country, tiktok_url, instagram_url, poster_id"),
        supabase.from("brief_assignments").select("poster_id, status, posted_at, views_d7").not("posted_at", "is", null),
      ]);
      const stats = new Map<string, { posted: number; validated: number; views: number }>();
      for (const a of assignments.data ?? []) {
        const s = stats.get(a.poster_id) ?? { posted: 0, validated: 0, views: 0 };
        s.posted++;
        if (a.status === "validated") s.validated++;
        s.views += Number(a.views_d7 ?? 0);
        stats.set(a.poster_id, s);
      }
      const appById = new Map((apps.data ?? []).map((a: any) => [a.id, a]));
      const recruits = (apps.data ?? []).filter((a: any) => !a.poster_id && ["accepted", "contract_sent", "signed"].includes(a.status));
      const testEmails = new Set((posters.data ?? []).filter((p: any) => p.profiles?.is_test).map((p: any) => p.profiles?.email?.toLowerCase()));
      const out: Creator[] = (posters.data ?? []).map((p: any) => {
        const s = stats.get(p.id);
        const a: any = appById.get(p.application_id);
        return {
          key: p.id, posterId: p.id, applicationId: p.application_id,
          name: p.profiles?.full_name ?? p.display_name ?? "—", email: p.profiles?.email ?? null,
          tiktok: handle(p.tiktok_handle) ?? fromUrl(a?.tiktok_url, /tiktok\.com\/@([^/?#]+)/i),
          instagram: handle(p.instagram_handle) ?? fromUrl(a?.instagram_url, /instagram\.com\/([^/?#]+)/i),
          ruulEmail: p.ruul_email, ruulStatus: p.ruul_status, country: p.country, zone: p.zone_code, appId: p.app_id,
          status: p.status, isTest: !!p.profiles?.is_test,
          posted: s?.posted ?? 0, validated: s?.validated ?? 0, viewsD7: s?.views ?? 0,
        };
      });
      for (const a of recruits) {
        const email = a.email?.toLowerCase() ?? "";
        out.push({
          key: `app-${a.id}`, posterId: null, applicationId: a.id,
          name: `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || a.email, email: a.email,
          tiktok: fromUrl(a.tiktok_url, /tiktok\.com\/@([^/?#]+)/i), instagram: fromUrl(a.instagram_url, /instagram\.com\/([^/?#]+)/i),
          ruulEmail: null, ruulStatus: null, country: a.country, zone: null, appId: null, status: a.status,
          isTest: email.endsWith("@vik-qa.test") || testEmails.has(email),
          posted: 0, validated: 0, viewsD7: 0,
        });
      }
      return out.sort((x, y) => y.viewsD7 - x.viewsD7 || x.name.localeCompare(y.name));
    },
  });
}

export default function Creators() {
  const { id } = useParams();
  return id ? <CreatorDetail id={id} /> : <CreatorList />;
}

function Handles({ tiktok, instagram, size = "sm" }: { tiktok: string | null; instagram: string | null; size?: "sm" | "md" }) {
  if (!tiktok && !instagram) return <span className="text-subtle-foreground">—</span>;
  const cls = cn("inline-flex items-center gap-1 text-accent hover:underline", size === "sm" ? "text-[13px]" : "text-sm");
  return (
    <div className="flex flex-col gap-0.5">
      {tiktok && <a className={cls} href={tiktokUrl(tiktok)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>TikTok @{tiktok}<ExternalLink className="h-3 w-3" /></a>}
      {instagram && <a className={cls} href={instaUrl(instagram)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Instagram @{instagram}<ExternalLink className="h-3 w-3" /></a>}
    </div>
  );
}

function Avatar({ name, big }: { name: string; big?: boolean }) {
  return <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-tint-violet font-semibold uppercase text-vik-violet", big ? "h-14 w-14 text-lg" : "h-9 w-9 text-sm")}>{name.charAt(0)}</div>;
}

function CreatorList() {
  const nav = useNavigate();
  const creators = useCreators();
  const zones = useZones();
  const apps = useApps();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [showTest, setShowTest] = useState(false);
  const all = (creators.data ?? []).filter((c) => showTest || !c.isTest);
  const countries = useMemo(() => [...new Set(all.map((c) => c.country).filter(Boolean))].sort() as string[], [all]);
  const rows = all.filter((c) => {
    if (status && c.status !== status) return false;
    if (country && c.country !== country) return false;
    if (zone && c.zone !== zone) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return [c.name, c.email, c.tiktok, c.instagram, c.ruulEmail].some((v) => v?.toLowerCase().includes(s));
  });
  const appName = (id: string | null) => (apps.data ?? []).find((a: any) => a.id === id)?.name ?? "—";
  const statuses = Object.keys(STATUS).filter((s) => all.some((c) => c.status === s));
  const testCount = (creators.data ?? []).filter((c) => c.isTest).length;

  return (
    <div>
      <PageHeader title="Créateurs" description="Tous les créateurs : posteurs actifs, en pause ou sortis, et recrues pas encore activées. Clique sur une ligne pour voir la fiche complète." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <Input className="pl-9" placeholder="Nom, email, handle…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
          <input type="checkbox" checked={showTest} onChange={(e) => setShowTest(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Afficher les comptes de test{testCount ? ` (${testCount})` : ""}
        </label>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Statut</span>
        <Chip active={!status} onClick={() => setStatus(null)}>Tous</Chip>
        {statuses.map((s) => <Chip key={s} active={status === s} onClick={() => setStatus(status === s ? null : s)}>{STATUS[s].label}</Chip>)}
        {countries.length > 0 && <span className="ml-3 mr-1 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Pays</span>}
        {countries.map((c) => <Chip key={c} active={country === c} onClick={() => setCountry(country === c ? null : c)}>{flag(c)} {c}</Chip>)}
        {(zones.data ?? []).length > 0 && <span className="ml-3 mr-1 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Zone</span>}
        {(zones.data ?? []).map((z: any) => <Chip key={z.code} active={zone === z.code} onClick={() => setZone(zone === z.code ? null : z.code)}>{z.code}</Chip>)}
      </div>

      {creators.isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : rows.length === 0 ? (
        <Empty title={all.length === 0 ? "Aucun créateur pour l'instant" : "Aucun créateur ne correspond"} icon={<Users className="h-5 w-5" />}>
          {all.length === 0 && testCount > 0 ? "Seuls des comptes de test existent : coche « Afficher les comptes de test »." : "Les recrues apparaissent ici dès que leur candidature est acceptée."}
        </Empty>
      ) : (
        <Table>
          <thead><tr><Th>Créateur</Th><Th>Réseaux</Th><Th>Ruul</Th><Th>Pays</Th><Th>App</Th><Th num>Posts</Th><Th num>Vues J+7</Th><Th>Statut</Th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.key} className="cursor-pointer hover:bg-[rgba(16,24,40,0.025)]" onClick={() => nav(`/admin/creators/${c.key}`)}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar name={c.name} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium">{c.name}{c.isTest && <Badge tone="outline">test</Badge>}</div>
                      <div className="truncate text-xs text-subtle-foreground">{c.email}</div>
                    </div>
                  </div>
                </Td>
                <Td><Handles tiktok={c.tiktok} instagram={c.instagram} /></Td>
                <Td>
                  {c.ruulEmail || c.ruulStatus ? (
                    <div className="flex flex-col items-start gap-1">
                      {c.ruulEmail && <span className="font-mono text-xs text-muted-foreground">{c.ruulEmail}</span>}
                      {c.ruulStatus && <Badge tone={RUUL[c.ruulStatus]?.tone ?? "default"}>{RUUL[c.ruulStatus]?.label ?? c.ruulStatus}</Badge>}
                    </div>
                  ) : <span className="text-subtle-foreground">—</span>}
                </Td>
                <Td className="whitespace-nowrap">{c.country ? <>{flag(c.country)} {c.country}</> : "—"}{c.zone && <span className="ml-1.5 text-xs text-subtle-foreground">zone {c.zone}</span>}</Td>
                <Td className="text-muted-foreground">{appName(c.appId)}</Td>
                <Td num><span className="font-medium">{c.posted}</span><span className="text-subtle-foreground"> / {c.validated}</span></Td>
                <Td num>{c.viewsD7 ? compact(c.viewsD7) : "—"}</Td>
                <Td><Badge tone={STATUS[c.status]?.tone ?? "default"}>{STATUS[c.status]?.label ?? c.status}</Badge></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="mt-3 text-xs text-subtle-foreground">Posts : publiés / validés. Vues J+7 : somme des vues relevées 7 jours après publication.</p>
    </div>
  );
}

/** Requête qui ne casse pas la page si la table n'existe pas (encore) ou si la RLS refuse. */
async function safe<T>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | null> {
  try { const r = await p; return r.error ? null : r.data; } catch { return null; }
}

function CreatorDetail({ id }: { id: string }) {
  const isApp = id.startsWith("app-");
  const apps = useApps();
  const d = useQuery({
    queryKey: ["creator", id],
    queryFn: async () => {
      const poster = isApp ? null : (await supabase.from("posters").select("*, profiles(full_name, email, is_test)").eq("id", id).maybeSingle()).data;
      const appId = isApp ? id.slice(4) : poster?.application_id;
      const application = appId ? (await supabase.from("applications").select("*").eq("id", appId).maybeSingle()).data : null;
      const email = poster?.profiles?.email ?? application?.email ?? null;
      const posterId = poster?.id ?? application?.poster_id ?? null;
      const [posts, contracts, emails, convs, payouts] = await Promise.all([
        posterId ? safe(supabase.from("brief_assignments").select("id, status, posted_url, posted_at, due_date, views_d2, views_d7, briefs(title)").eq("poster_id", posterId).order("due_date", { ascending: false }).limit(100)) : null,
        appId ? safe(supabase.from("contracts").select("id, status, sent_at, signed_at, signed_name, signed_ip, doc_hash, pdf_path").eq("application_id", appId).order("sent_at", { ascending: false })) : null,
        email || appId ? safe(supabase.from("email_outbox").select("id, subject, status, created_at, sent_at, opened_at, clicked_at, template_key")
          .or([email && `to_email.eq.${email}`, appId && `application_id.eq.${appId}`].filter(Boolean).join(",")).order("created_at", { ascending: false }).limit(100)) : null,
        posterId ? safe(supabase.from("assistant_conversations").select("id, status, escalated_at, escalation_reason, created_at, updated_at, assistant_messages(count)").eq("poster_id", posterId).order("updated_at", { ascending: false })) : null,
        posterId ? safe(supabase.from("payouts").select("*").eq("poster_id", posterId).order("week_start", { ascending: false })) : null,
      ]);
      return { poster, application, posts: posts as any[] | null, contracts: contracts as any[] | null, emails: emails as any[] | null, convs: convs as any[] | null, payouts: payouts as any[] | null };
    },
  });
  const openPdf = async (path: string) => {
    const { data } = await supabase.storage.from("contracts").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };

  if (d.isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  const { poster, application, posts, contracts, emails, convs, payouts } = d.data ?? ({} as any);
  if (!poster && !application) return <Empty title="Créateur introuvable" action={<Link to="/admin/creators" className="text-accent">← Retour</Link>} />;
  const name = poster?.profiles?.full_name ?? poster?.display_name ?? `${application?.first_name ?? ""} ${application?.last_name ?? ""}`.trim();
  const tiktok = handle(poster?.tiktok_handle) ?? fromUrl(application?.tiktok_url, /tiktok\.com\/@([^/?#]+)/i);
  const instagram = handle(poster?.instagram_handle) ?? fromUrl(application?.instagram_url, /instagram\.com\/([^/?#]+)/i);
  const status = poster?.status ?? application?.status;
  const app = (apps.data ?? []).find((a: any) => a.id === poster?.app_id);
  const posted = (posts ?? []).filter((p: any) => p.posted_at);
  const paidTotal = (payouts ?? []).filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + Number(p.total), 0);

  return (
    <div>
      <Link to="/admin/creators" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Créateurs</Link>
      <Card className="mb-6 flex flex-wrap items-start gap-5 p-6">
        <Avatar name={name || "?"} big />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{name}</h1>
            <Badge tone={STATUS[status]?.tone ?? "default"}>{STATUS[status]?.label ?? status}</Badge>
            {poster?.profiles?.is_test && <Badge tone="outline">compte de test</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {poster?.profiles?.email ?? application?.email}
            {(poster?.country ?? application?.country) && <> · {flag(poster?.country ?? application?.country)} {poster?.country ?? application?.country}</>}
            {poster?.zone_code && <> · zone {poster.zone_code}</>}
            {app && <> · {app.name}</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {tiktok && <a className="inline-flex items-center gap-1 text-accent hover:underline" href={tiktokUrl(tiktok)} target="_blank" rel="noreferrer">TikTok @{tiktok}<ExternalLink className="h-3 w-3" /></a>}
            {instagram && <a className="inline-flex items-center gap-1 text-accent hover:underline" href={instaUrl(instagram)} target="_blank" rel="noreferrer">Instagram @{instagram}<ExternalLink className="h-3 w-3" /></a>}
            {poster?.ruul_email && <a className="inline-flex items-center gap-1 text-accent hover:underline" href="https://app.ruul.io" target="_blank" rel="noreferrer">Ruul {poster.ruul_email}<ExternalLink className="h-3 w-3" /></a>}
            {poster?.ruul_status && <Badge tone={RUUL[poster.ruul_status]?.tone ?? "default"}>Ruul : {RUUL[poster.ruul_status]?.label ?? poster.ruul_status}</Badge>}
            {application && <Link className="text-accent hover:underline" to={`/admin/recruitment/candidates?id=${application.id}`}>Candidature</Link>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6 text-right">
          <div><p className="text-xs text-subtle-foreground">Posts</p><p className="tabular text-xl font-semibold">{posted.length}</p></div>
          <div><p className="text-xs text-subtle-foreground">Vues J+7</p><p className="tabular text-xl font-semibold">{compact(posted.reduce((s: number, p: any) => s + Number(p.views_d7 ?? 0), 0))}</p></div>
          <div><p className="text-xs text-subtle-foreground">Payé</p><p className="tabular text-xl font-semibold">{formatMoney(paidTotal, payouts?.[0]?.currency ?? "USD")}</p></div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Section icon={<Clapperboard className="h-4 w-4" />} title={`Posts (${posted.length})`}>
          {posts === null || posted.length === 0 ? <Dash text={posts === null ? undefined : "Aucune vidéo publiée."} /> : (
            <Table className="rounded-none border-x-0 border-b-0 shadow-none">
              <thead><tr><Th>Vidéo</Th><Th>Brief</Th><Th>Statut</Th><Th num>J+2</Th><Th num>J+7</Th></tr></thead>
              <tbody>
                {posted.map((p: any) => (
                  <tr key={p.id}>
                    <Td>{p.posted_url ? <a href={p.posted_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">{dateFr(p.posted_at)}<ExternalLink className="h-3 w-3" /></a> : dateFr(p.posted_at)}</Td>
                    <Td className="max-w-[16rem] truncate text-muted-foreground">{p.briefs?.title ?? "—"}</Td>
                    <Td><Badge tone={p.status === "validated" ? "success" : p.status === "rejected" ? "danger" : "warning"}>{p.status}</Badge></Td>
                    <Td num>{p.views_d2 == null ? "—" : compact(p.views_d2)}</Td>
                    <Td num>{p.views_d7 == null ? "—" : compact(p.views_d7)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Section>

        <div className="space-y-6">
          <Section icon={<FileText className="h-4 w-4" />} title="Contrat signé">
            {!contracts?.length ? <Dash text={contracts ? "Aucun contrat." : undefined} /> : (
              <div className="divide-y divide-separator">
                {contracts.map((c: any) => (
                  <div key={c.id} className="space-y-1 px-6 py-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={c.status === "signed" ? "success" : "warning"}>{c.status}</Badge>
                      {c.pdf_path && <button onClick={() => openPdf(c.pdf_path)} className="inline-flex items-center gap-1 text-accent hover:underline">PDF signé<ExternalLink className="h-3 w-3" /></button>}
                    </div>
                    <p className="text-muted-foreground">Signé le {c.signed_at ? dateFr(c.signed_at, true) : "—"}{c.signed_name && <> par {c.signed_name}</>}</p>
                    <p className="text-xs text-subtle-foreground">IP {c.signed_ip ?? "—"}</p>
                    {c.doc_hash && <p className="truncate font-mono text-[11px] text-subtle-foreground" title={c.doc_hash}>SHA-256 {c.doc_hash}</p>}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section icon={<MessageSquare className="h-4 w-4" />} title="Conversations assistant">
            {!convs?.length ? <Dash text={convs ? "Aucune conversation." : undefined} /> : (
              <div className="divide-y divide-separator">
                {convs.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                    <div>
                      <p>{c.assistant_messages?.[0]?.count ?? 0} message(s) · {dateFr(c.updated_at, true)}</p>
                      {c.escalated_at && <p className="flex items-center gap-1 text-xs text-[#8a5a00]"><AlertTriangle className="h-3 w-3" /> Escaladée : {c.escalation_reason ?? "—"}</p>}
                    </div>
                    <Badge tone={c.status === "escalated" ? "warning" : "default"}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>
          <Section icon={<Wallet className="h-4 w-4" />} title="Paiements">
            {!payouts?.length ? <Dash text={payouts ? "Aucun paiement." : undefined} /> : (
              <div className="divide-y divide-separator">
                {payouts.map((p: any) => (
                  <details key={p.id} className="group px-6 py-3 text-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <span>Semaine du {dateFr(p.week_start)}</span>
                      <span className="flex items-center gap-3">
                        <span className="tabular font-semibold">{formatMoney(Number(p.total), p.currency)}</span>
                        <Badge tone={p.status === "paid" ? "success" : p.review_status === "validated" ? "accent" : "warning"}>{p.status === "paid" ? "Payé" : p.review_status === "validated" ? "Validé" : "À vérifier"}</Badge>
                      </span>
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {(p.lines ?? []).map((l: any, i: number) => (
                        <li key={i} className="flex justify-between gap-3"><span className="truncate">{l.url ? <a className="text-accent hover:underline" href={l.url} target="_blank" rel="noreferrer">{l.label}</a> : l.label}</span><span className="tabular">{formatMoney(l.amount, p.currency)}</span></li>
                      ))}
                      {Number(p.adjustment) !== 0 && <li className="flex justify-between gap-3"><span>Ajustement : {p.adjustment_reason}</span><span className="tabular">{formatMoney(Number(p.adjustment), p.currency)}</span></li>}
                    </ul>
                  </details>
                ))}
              </div>
            )}
          </Section>
        </div>

        <Section icon={<Mail className="h-4 w-4" />} title={`Emails reçus (${emails?.length ?? 0})`} className="xl:col-span-2">
          {!emails?.length ? <Dash text={emails ? "Aucun email." : undefined} /> : (
            <Table className="rounded-none border-x-0 border-b-0 shadow-none">
              <thead><tr><Th>Objet</Th><Th>Date</Th><Th>Statut</Th><Th>Ouvert</Th><Th>Cliqué</Th></tr></thead>
              <tbody>
                {emails.map((e: any) => (
                  <tr key={e.id}>
                    <Td className="max-w-[20rem] truncate">{e.subject}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">{dateFr(e.sent_at ?? e.created_at, true)}</Td>
                    <Td><Badge tone={e.status === "sent" ? "success" : e.status === "failed" ? "danger" : e.status === "cancelled" ? "default" : "warning"}>{e.status}</Badge></Td>
                    <Td className="text-muted-foreground">{e.opened_at ? dateFr(e.opened_at, true) : "—"}</Td>
                    <Td className="text-muted-foreground">{e.clicked_at ? dateFr(e.clicked_at, true) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Section>

      </div>
    </div>
  );
}

function Section({ icon, title, children, className }: { icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("overflow-hidden p-0", className)}>
      <div className="flex items-center gap-2 px-6 pb-3 pt-5 text-muted-foreground">{icon}<h3 className="text-[15px] font-semibold text-foreground">{title}</h3></div>
      {children}
    </Card>
  );
}
const Dash = ({ text }: { text?: string }) => <p className="px-6 pb-5 text-sm text-subtle-foreground">{text ?? "—"}</p>;

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Check, ChevronLeft, ChevronRight, Clock, ExternalLink, Inbox, Search, UserPlus, X } from "lucide-react";
import { Badge, Button, Card, Chip, Empty, Input, PageHeader, Select, Spinner, Table, Tabs, Td, Textarea, Th, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useCountries } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { ageOn } from "@shared/zones.ts";
import { ago, cn, compact, dateFr, flag } from "@/lib/utils";

const COLUMNS = [
  { key: "new", label: "Nouveau", dot: "bg-accent" },
  { key: "review", label: "À revoir", dot: "bg-[#ffbb43]" },
  { key: "accepted", label: "Accepté", dot: "bg-[#1fafff]" },
  { key: "contract_sent", label: "Contrat envoyé", dot: "bg-vik-violet" },
  { key: "signed", label: "Signé", dot: "bg-success" },
  { key: "active", label: "Actif", dot: "bg-success" },
  { key: "rejected", label: "Refusé", dot: "bg-vik-red" },
] as const;
const TONE: Record<string, any> = { new: "accent", review: "warning", accepted: "cyan", contract_sent: "violet", signed: "success", active: "success", rejected: "danger" };
const statusLabel = (s: string) => COLUMNS.find((c) => c.key === s)?.label ?? s;

const AVATAR_TINTS = ["bg-tint-blue text-accent", "bg-tint-violet text-vik-violet", "bg-tint-cyan text-[#0a95e0]", "bg-tint-green text-success", "bg-tint-yellow text-[#b97800]", "bg-tint-red text-vik-red"];
function Avatar({ name, className }: { name: string; className?: string }) {
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TINTS.length;
  return <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold uppercase", AVATAR_TINTS[i], className)}>{name.trim().charAt(0) || "?"}</span>;
}
const Kbd = ({ children, dark }: { children: React.ReactNode; dark?: boolean }) => (
  <kbd className={cn("ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 font-sans text-[11px] font-semibold", dark ? "bg-white/20 text-white" : "bg-[#f1f3f7] text-muted-foreground ring-1 ring-inset ring-border-strong")}>{children}</kbd>
);

export default function Candidates() {
  const toast = useToast();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data: countries } = useCountries();
  const [params] = useSearchParams();
  const initialView = params.get("view");
  const [view, setView] = useState<"review" | "kanban" | "list">(initialView === "kanban" || initialView === "list" ? initialView : "review");
  const [country, setCountry] = useState("");
  const [zone, setZone] = useState("");
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  const { data: apps, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => (await supabase.from("applications").select("*, contracts(status, sent_at, reminders, signed_at)").order("created_at", { ascending: false }).limit(1000)).data ?? [],
  });
  const zoneOf = (c: string) => countries?.find((x: any) => x.code === c)?.zone_code ?? "";
  const countryName = (c: string) => countries?.find((x: any) => x.code === c)?.name ?? c;
  const filtered = useMemo(() => (apps ?? []).filter((a: any) =>
    (!country || a.country === country) && (!zone || zoneOf(a.country) === zone) &&
    (!q || `${a.first_name} ${a.last_name} ${a.email} ${a.tiktok_url ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [apps, country, zone, q, countries]);
  const toReview = filtered.filter((a: any) => a.status === "new" || a.status === "review").sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
  const current = toReview[Math.min(idx, Math.max(0, toReview.length - 1))];

  const decide = async (a: any, decision: "accept" | "reject" | "review") => {
    if (!a) return;
    setBusy(true);
    try {
      const r = await callFn("recruit", { action: "decide", application_id: a.id, decision });
      toast(decision === "accept" ? "Accepté · contrat envoyé (email en file)" : decision === "reject" ? (r.rejection_email_due_at ? "Refusé · email poli programmé" : "Refusé") : "Mis de côté « À revoir »", decision === "reject" ? "default" : "success");
      qc.invalidateQueries({ queryKey: ["applications"] });
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(false); }
  };

  useEffect(() => {
    if (view !== "review") return;
    const k = (e: KeyboardEvent) => {
      if (busy || (e.target as HTMLElement)?.closest("input,textarea,select")) return;
      if (e.key === "a" || e.key === "A") decide(current, "accept");
      else if (e.key === "r" || e.key === "R") decide(current, "reject");
      else if (e.key === "s" || e.key === "S") decide(current, "review");
      else if (e.key === "ArrowRight" || e.key === "j") setIdx((i) => Math.min(i + 1, toReview.length - 1));
      else if (e.key === "ArrowLeft" || e.key === "k") setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [view, current?.id, busy, toReview.length]);

  const openInReview = (a: any) => {
    const i = toReview.findIndex((x: any) => x.id === a.id);
    if (i >= 0) { setView("review"); setIdx(i); }
  };

  return (
    <div>
      <PageHeader title="Candidats"
        description={profile?.role === "recruiter" ? `Vos pays : ${profile.recruiter_countries.join(", ") || "aucun (demandez à l'admin)"}` : "Revue des candidatures et pipeline de recrutement des créateurs."} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Tabs value={view} onChange={setView} items={[
          { value: "review", label: <span className="flex items-center gap-1.5">Revue rapide {toReview.length > 0 && <span className="tabular rounded-full bg-accent px-1.5 text-[11px] font-semibold text-white">{toReview.length}</span>}</span> },
          { value: "kanban", label: "Kanban" },
          { value: "list", label: "Liste" },
        ]} />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {(["A", "B", "C"] as const).map((z) => <Chip key={z} active={zone === z} onClick={() => { setZone(zone === z ? "" : z); setIdx(0); }} onClear={() => setZone("")}>Zone {z}</Chip>)}
          <Select className="h-8 w-40 rounded-full py-0 text-[13px]" value={country} onChange={(e) => { setCountry(e.target.value); setIdx(0); }}>
            <option value="">Tous les pays</option>{(countries ?? []).map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2 h-4 w-4 text-subtle-foreground" />
            <Input className="h-8 w-56 rounded-full pl-9 text-[13px]" placeholder="Nom, email, TikTok…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
      </div>

      {isLoading ? <div className="flex justify-center py-20"><Spinner /></div> : view === "review" ? (
        current ? (
          <ReviewCard a={current} pos={[Math.min(idx, toReview.length - 1) + 1, toReview.length]} zone={zoneOf(current.country)} countryName={countryName(current.country)} busy={busy}
            onPrev={() => setIdx((i) => Math.max(i - 1, 0))} onNext={() => setIdx((i) => Math.min(i + 1, toReview.length - 1))} onDecide={(d) => decide(current, d)} />
        ) : (
          <Empty title="Tout est à jour" icon={<Check className="h-5 w-5" />}
            action={<div className="flex flex-wrap justify-center gap-2"><Button variant="secondary" onClick={() => setView("kanban")}>Voir le pipeline</Button><a href="/join" target="_blank" rel="noreferrer"><Button variant="secondary"><ExternalLink className="h-4 w-4" /> Page de recrutement</Button></a></div>}>
            Aucune candidature à revoir{filtered.length ? "" : " pour ces filtres"}. Les nouvelles candidatures arrivent ici, la plus ancienne d'abord, avec la vidéo de présentation.
          </Empty>
        )
      ) : view === "kanban" ? (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
          {COLUMNS.map((col) => {
            const items = filtered.filter((a: any) => a.status === col.key);
            return (
              <div key={col.key} className="flex w-[272px] shrink-0 flex-col">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                  <span className="text-[13px] font-semibold text-foreground">{col.label}</span>
                  <span className="tabular rounded-full bg-[#f1f3f7] px-1.5 text-[11px] font-medium text-muted-foreground">{items.length}</span>
                </div>
                <div className="flex-1 space-y-2.5 rounded-xl border border-dashed border-border-strong p-2">
                  {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-subtle-foreground">Vide</p>}
                  {items.slice(0, 100).map((a: any) => {
                    const name = `${a.first_name} ${a.last_name}`;
                    const reviewable = ["new", "review"].includes(a.status);
                    return (
                      <button key={a.id} onClick={() => openInReview(a)} disabled={!reviewable}
                        className={cn("w-full rounded-xl border bg-white p-3 text-left shadow-xs transition-shadow", reviewable ? "cursor-pointer hover:shadow-card" : "cursor-default")}>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={name} className="h-8 w-8 text-xs" />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-foreground">{name}</p>
                            <p className="truncate text-xs text-subtle-foreground">{flag(a.country)} {countryName(a.country)} · zone {zoneOf(a.country) || "?"}</p>
                          </div>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] text-subtle-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {ago(a.created_at)}</span>
                          {a.status === "contract_sent" && a.contracts?.[0] && <span>{a.contracts.some((c: any) => c.status === "expired") ? "expiré" : `${a.contracts[0].reminders} relance(s)`}</span>}
                          {a.tiktok_followers ? <span className="tabular">{compact(a.tiktok_followers)} abonnés</span> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : filtered.length === 0 ? (
        <Empty title="Aucune candidature" icon={<Inbox className="h-5 w-5" />}>Partage la page de recrutement (/join/&lt;pays&gt;) ou lance une campagne Meta pour recevoir des candidatures.</Empty>
      ) : (
        <Table>
          <thead><tr><Th>Candidat</Th><Th>Pays</Th><Th num>Âge</Th><Th>TikTok</Th><Th>Statut</Th><Th>Reçue</Th><Th /></tr></thead>
          <tbody>
            {filtered.map((a: any) => {
              const name = `${a.first_name} ${a.last_name}`;
              return (
                <tr key={a.id}>
                  <Td><div className="flex items-center gap-3"><Avatar name={name} className="h-8 w-8 text-xs" /><div className="min-w-0"><p className="truncate font-medium text-foreground">{name}</p><p className="truncate text-xs text-subtle-foreground">{a.email}</p></div></div></Td>
                  <Td className="whitespace-nowrap">{flag(a.country)} {countryName(a.country)} <Badge tone="outline" className="ml-1">{zoneOf(a.country) || "?"}</Badge></Td>
                  <Td num>{ageOn(a.birthdate)}</Td>
                  <Td className="text-[13px]">{a.tiktok_url ? <a className="text-accent hover:underline" href={a.tiktok_url} target="_blank" rel="noreferrer">{compact(a.tiktok_followers)} abonnés</a> : <span className="text-subtle-foreground">—</span>}</Td>
                  <Td><Badge tone={TONE[a.status]}>{statusLabel(a.status)}</Badge></Td>
                  <Td className="tabular whitespace-nowrap text-[13px] text-muted-foreground">{dateFr(a.created_at)}</Td>
                  <Td className="whitespace-nowrap text-right">
                    {["new", "review"].includes(a.status) && <span className="inline-flex gap-1.5"><Button size="sm" variant="secondary" onClick={() => openInReview(a)}>Revoir</Button><Button size="sm" onClick={() => decide(a, "accept")}>Accepter</Button></span>}
                    {a.status === "contract_sent" && <Button size="sm" variant="secondary" onClick={async () => { await callFn("recruit", { action: "resend_contract", application_id: a.id }); toast("Contrat renvoyé", "success"); }}>Renvoyer le contrat</Button>}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function ReviewCard({ a, pos, zone, countryName, busy, onPrev, onNext, onDecide }: {
  a: any; pos: [number, number]; zone: string; countryName: string; busy: boolean; onPrev: () => void; onNext: () => void; onDecide: (d: "accept" | "reject" | "review") => void;
}) {
  const qc = useQueryClient();
  const [url, setUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState(a.notes ?? "");
  useEffect(() => {
    setUrl(null);
    setNotes(a.notes ?? "");
    if (a.yap_video_path) supabase.storage.from("yap-videos").createSignedUrl(a.yap_video_path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [a.id]);
  const saveNotes = async () => {
    await supabase.from("applications").update({ notes }).eq("id", a.id);
    qc.invalidateQueries({ queryKey: ["applications"] });
  };
  const name = `${a.first_name} ${a.last_name}`;
  const link = (u: string | null, n: number | null) => u ? (
    <a href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
      {u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)} <ExternalLink className="h-3 w-3" />{n !== null && n !== undefined ? <span className="text-muted-foreground"> · {compact(n)} abonnés</span> : null}
    </a>
  ) : null;
  const sections: { title: string; rows: [string, React.ReactNode][] }[] = [
    { title: "Contact", rows: [["Email", a.email], ["Téléphone", a.phone], ["Langues", a.languages?.join(", ")]] },
    { title: "Réseaux", rows: [["TikTok", link(a.tiktok_url, a.tiktok_followers)], ["Instagram", link(a.instagram_url, a.instagram_followers)]] },
    { title: "Profil", rows: [["Expérience UGC", a.ugc_experience], ["Équipement", a.equipment], ["Disponibilité", a.availability], ["Motivation", a.motivation]] },
    { title: "Source", rows: [["UTM", Object.keys(a.utm ?? {}).length ? Object.entries(a.utm).map(([k, v]) => `${k}=${v}`).join(" · ") : null]] },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="p-3 lg:sticky lg:top-6 lg:self-start">
        <div className="aspect-[9/16] overflow-hidden rounded-lg bg-[#0b1530]">
          {url ? <video key={url} src={url} controls autoPlay playsInline className="h-full w-full object-contain" />
            : <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-white/60">{a.yap_video_path ? <Spinner className="text-white/60" /> : "Pas de vidéo"}</div>}
        </div>
        <p className="mt-3 px-1 text-xs text-subtle-foreground">Vidéo de présentation (« yap »)</p>
      </Card>

      <div className="min-w-0 space-y-5">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar name={name} className="h-12 w-12 text-base" />
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.01em] text-foreground">{name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                  <span>{flag(a.country)} {countryName}</span><span className="text-border-strong">·</span>
                  <span>{ageOn(a.birthdate)} ans</span><span className="text-border-strong">·</span>
                  <span>reçue {ago(a.created_at)}</span>
                  <Badge tone="outline">Zone {zone || "?"}</Badge>
                  <Badge tone={TONE[a.status]}>{statusLabel(a.status)}</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-lg border px-1 py-0.5 text-[13px] text-muted-foreground">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onPrev} aria-label="Précédent"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="tabular px-1">{pos[0]} / {pos[1]}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onNext} aria-label="Suivant"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button size="lg" variant="success" onClick={() => onDecide("accept")} loading={busy}><Check className="h-4 w-4" /> Accepter <Kbd dark>A</Kbd></Button>
            <Button size="lg" variant="secondary" onClick={() => onDecide("review")} disabled={busy}><Clock className="h-4 w-4" /> À revoir <Kbd>S</Kbd></Button>
            <Button size="lg" variant="secondary" className="text-danger hover:bg-tint-red" onClick={() => onDecide("reject")} disabled={busy}><X className="h-4 w-4" /> Refuser <Kbd>R</Kbd></Button>
          </div>
          <p className="mt-3 text-xs text-subtle-foreground">Raccourcis : <Kbd>A</Kbd> accepter · <Kbd>S</Kbd> à revoir · <Kbd>R</Kbd> refuser · <Kbd>←</Kbd><Kbd>→</Kbd> naviguer. Accepter envoie le contrat du pays (relances J+1, J+3, J+6, expiration J+7).</p>
        </Card>

        <Card className="p-0">
          {sections.map((sec) => {
            const rows = sec.rows.filter(([, v]) => v);
            if (!rows.length) return null;
            return (
              <div key={sec.title} className="border-b border-separator px-6 py-5 last:border-b-0">
                <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">{sec.title}</h3>
                <dl className="space-y-2.5">
                  {rows.map(([k, v]) => (
                    <div key={k} className="grid gap-1 text-sm sm:grid-cols-[140px_1fr] sm:gap-4">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="whitespace-pre-wrap text-foreground">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </Card>

        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground"><UserPlus className="h-3.5 w-3.5" /> Notes internes</h3>
          <Textarea placeholder="Visible uniquement par l'équipe…" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} rows={3} />
        </Card>
      </div>
    </div>
  );
}

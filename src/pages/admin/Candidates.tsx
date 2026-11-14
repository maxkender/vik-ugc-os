import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink, Keyboard } from "lucide-react";
import { Badge, Button, Card, Empty, Input, PageHeader, Select, Table, Tabs, Td, Textarea, Th, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useCountries } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { ageOn } from "@shared/zones.ts";
import { ago, cn, compact, dateFr, flag } from "@/lib/utils";

const COLUMNS = [
  { key: "new", label: "Nouveau" },
  { key: "review", label: "À revoir" },
  { key: "accepted", label: "Accepté" },
  { key: "contract_sent", label: "Contrat envoyé" },
  { key: "signed", label: "Signé" },
  { key: "active", label: "Actif" },
  { key: "rejected", label: "Refusé" },
] as const;
const TONE: Record<string, any> = { new: "accent", review: "warning", accepted: "default", contract_sent: "default", signed: "success", active: "success", rejected: "danger" };

export default function Candidates() {
  const toast = useToast();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data: countries } = useCountries();
  const [view, setView] = useState<"review" | "kanban" | "list">("review");
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

  return (
    <div>
      <PageHeader title="Candidats" description={profile?.role === "recruiter" ? `Vos pays : ${profile.recruiter_countries.join(", ") || "aucun (demandez à l'admin)"}` : "Pipeline de recrutement des créateurs."} />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Tabs value={view} onChange={setView} items={[{ value: "review", label: `Revue rapide (${toReview.length})` }, { value: "kanban", label: "Kanban" }, { value: "list", label: "Liste" }]} />
        <Select className="h-8 w-40 text-xs" value={country} onChange={(e) => { setCountry(e.target.value); setIdx(0); }}><option value="">Tous les pays</option>{(countries ?? []).map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}</Select>
        <Select className="h-8 w-28 text-xs" value={zone} onChange={(e) => { setZone(e.target.value); setIdx(0); }}><option value="">Zones</option><option value="A">Zone A</option><option value="B">Zone B</option><option value="C">Zone C</option></Select>
        <Input className="h-8 w-56 text-xs" placeholder="Nom, email, TikTok…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {isLoading ? null : view === "review" ? (
        current ? (
          <ReviewCard a={current} pos={`${Math.min(idx, toReview.length - 1) + 1} / ${toReview.length}`} zone={zoneOf(current.country)} busy={busy}
            onPrev={() => setIdx((i) => Math.max(i - 1, 0))} onNext={() => setIdx((i) => Math.min(i + 1, toReview.length - 1))} onDecide={(d) => decide(current, d)} />
        ) : <Empty title="Aucune candidature à revoir">Les nouvelles candidatures arrivent ici.</Empty>
      ) : view === "kanban" ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const items = filtered.filter((a: any) => a.status === col.key);
            return (
              <div key={col.key} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1 text-sm font-medium">{col.label}<span className="text-xs text-muted-foreground">{items.length}</span></div>
                <div className="space-y-2">
                  {items.slice(0, 100).map((a: any) => (
                    <Card key={a.id} className="cursor-pointer p-3 hover:border-accent" onClick={() => { setView("review"); const i = toReview.findIndex((x: any) => x.id === a.id); if (i >= 0) setIdx(i); }}>
                      <p className="text-sm font-medium">{flag(a.country)} {a.first_name} {a.last_name}</p>
                      <p className="text-xs text-muted-foreground">{ago(a.created_at)} · zone {zoneOf(a.country) || "?"}</p>
                      {a.status === "contract_sent" && a.contracts?.[0] && <p className="mt-1 text-xs text-muted-foreground">relances : {a.contracts[0].reminders}{a.contracts.some((c: any) => c.status === "expired") ? " · expiré" : ""}</p>}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Table>
          <thead><tr><Th>Candidat</Th><Th>Pays</Th><Th>Âge</Th><Th>TikTok</Th><Th>Statut</Th><Th>Reçue</Th><Th /></tr></thead>
          <tbody>
            {filtered.map((a: any) => (
              <tr key={a.id}>
                <Td><p className="font-medium">{a.first_name} {a.last_name}</p><p className="text-xs text-muted-foreground">{a.email}</p></Td>
                <Td>{flag(a.country)} {a.country} <span className="text-xs text-muted-foreground">({zoneOf(a.country)})</span></Td>
                <Td>{ageOn(a.birthdate)}</Td>
                <Td className="text-xs">{a.tiktok_url ? <a className="text-accent" href={a.tiktok_url} target="_blank" rel="noreferrer">{compact(a.tiktok_followers)} abonnés</a> : "—"}</Td>
                <Td><Badge tone={TONE[a.status]}>{COLUMNS.find((c) => c.key === a.status)?.label}</Badge></Td>
                <Td className="text-xs">{dateFr(a.created_at)}</Td>
                <Td className="whitespace-nowrap">
                  {["new", "review"].includes(a.status) && <><Button size="sm" variant="success" onClick={() => decide(a, "accept")}>Accepter</Button>{" "}<Button size="sm" variant="outline" onClick={() => decide(a, "reject")}>Refuser</Button></>}
                  {a.status === "contract_sent" && <Button size="sm" variant="outline" onClick={async () => { await callFn("recruit", { action: "resend_contract", application_id: a.id }); toast("Contrat renvoyé", "success"); }}>Renvoyer le contrat</Button>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

function ReviewCard({ a, pos, zone, busy, onPrev, onNext, onDecide }: { a: any; pos: string; zone: string; busy: boolean; onPrev: () => void; onNext: () => void; onDecide: (d: "accept" | "reject" | "review") => void }) {
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
  const row = (label: string, value: React.ReactNode) => value ? <div className="grid grid-cols-[150px_1fr] gap-2 py-1.5 text-sm"><span className="text-muted-foreground">{label}</span><span className="whitespace-pre-wrap">{value}</span></div> : null;
  const link = (u: string | null, n: number | null) => u ? <a href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent">{u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)} <ExternalLink className="h-3 w-3" /> {n !== null ? `· ${compact(n)} abonnés` : ""}</a> : null;
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div>
        <div className="aspect-[9/16] overflow-hidden rounded-xl bg-black">
          {url ? <video key={url} src={url} controls autoPlay playsInline className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center text-sm text-white/60">Vidéo « yap »…</div>}
        </div>
      </div>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{flag(a.country)} {a.first_name} {a.last_name}</h2>
            <p className="text-sm text-muted-foreground">{ageOn(a.birthdate)} ans · zone {zone || "?"} · reçue {ago(a.created_at)} · <Badge tone={TONE[a.status]}>{a.status}</Badge></p>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Button size="icon" variant="ghost" onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>{pos}<Button size="icon" variant="ghost" onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          <Button variant="success" onClick={() => onDecide("accept")} loading={busy}>Accepter <kbd className="ml-1 rounded bg-white/20 px-1 text-[10px]">A</kbd></Button>
          <Button variant="outline" onClick={() => onDecide("review")} disabled={busy}>À revoir <kbd className="ml-1 rounded bg-muted px-1 text-[10px]">S</kbd></Button>
          <Button variant="danger" onClick={() => onDecide("reject")} disabled={busy}>Refuser <kbd className="ml-1 rounded bg-white/20 px-1 text-[10px]">R</kbd></Button>
          <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"><Keyboard className="h-3.5 w-3.5" /> ← → pour naviguer</span>
        </div>
        <Card className="divide-y p-4">
          {row("Email", a.email)}
          {row("Téléphone", a.phone)}
          {row("Langues", a.languages?.join(", "))}
          {row("TikTok", link(a.tiktok_url, a.tiktok_followers))}
          {row("Instagram", link(a.instagram_url, a.instagram_followers))}
          {row("Expérience UGC", a.ugc_experience)}
          {row("Équipement", a.equipment)}
          {row("Disponibilité", a.availability)}
          {row("Motivation", a.motivation)}
          {row("Source", Object.keys(a.utm ?? {}).length ? Object.entries(a.utm).map(([k, v]) => `${k}=${v}`).join(" · ") : null)}
        </Card>
        <div className="mt-4">
          <Textarea placeholder="Notes internes…" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} rows={2} />
        </div>
        <p className={cn("mt-3 text-xs text-muted-foreground")}>Accepter envoie l'email « Veuillez signer le contrat (ne signez pas si vous ne souhaitez pas continuer) » avec le contrat du pays. Relances J+1, J+3, J+6, expiration J+7.</p>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCountries, useZones } from "@/lib/hooks";
import { flag } from "@/lib/utils";
import { Badge, Button, Card, Dialog, Field, Input, PageHeader, Select, Spinner, Switch, Table, Td, Textarea, Th, useToast } from "@/components/ui";

export default function Countries() {
  const { data: zones, isLoading: lz } = useZones();
  const { data: countries, isLoading: lc } = useCountries();
  const recruiters = useQuery({ queryKey: ["recruiters"], queryFn: async () => (await supabase.from("profiles").select("id, email, full_name").eq("role", "recruiter")).data ?? [] });
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [clauses, setClauses] = useState<{ code: string; name: string; text: string } | null>(null);
  const [add, setAdd] = useState<{ code: string; name: string; zone_code: string; language: string } | null>(null);
  const [zoneDraft, setZoneDraft] = useState<Record<string, any>>({});

  const refresh = () => { qc.invalidateQueries({ queryKey: ["countries"] }); qc.invalidateQueries({ queryKey: ["zones"] }); };

  const updateCountry = async (code: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("countries").update(patch).eq("code", code);
    if (error) return toast(error.message, "danger");
    refresh();
  };
  const saveZone = async (code: string) => {
    const d = zoneDraft[code];
    if (!d) return;
    const { error } = await supabase.from("zones").update({
      price_per_video: Number(d.price_per_video), rpm: Number(d.rpm), rpm_views: Number(d.rpm_views), currency: String(d.currency).toUpperCase(),
      videos_per_day: Number(d.videos_per_day), active: !!d.active,
    }).eq("code", code);
    if (error) return toast(error.message, "danger");
    toast(`Zone ${code} enregistrée`, "success");
    setZoneDraft((x) => { const { [code]: _, ...rest } = x; return rest; });
    refresh();
  };
  const addCountry = async () => {
    if (!add || !/^[A-Z]{2}$/.test(add.code) || !add.name.trim()) return toast("Code ISO (2 lettres) et nom obligatoires", "danger");
    const { error } = await supabase.from("countries").insert({ code: add.code, name: add.name.trim(), zone_code: add.zone_code || null, language: add.language || "en" });
    if (error) return toast(error.message, "danger");
    toast("Pays ajouté", "success");
    setAdd(null);
    refresh();
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of countries ?? []) m[c.zone_code ?? "—"] = (m[c.zone_code ?? "—"] ?? 0) + 1;
    return m;
  }, [countries]);
  const filtered = (countries ?? []).filter((c: any) =>
    (!zoneFilter || (c.zone_code ?? "—") === zoneFilter) &&
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.code.toLowerCase() === q.toLowerCase()));

  if (lz || lc) return <Spinner />;
  return (
    <>
      <PageHeader title="Pays & zones" description="Zones tarifaires A / B / C et appartenance de chaque pays. Les tarifs s'affichent sur la landing selon la zone du pays." />
      <h2 className="mb-2 font-semibold">Zones tarifaires</h2>
      <p className="mb-3 text-sm text-muted-foreground">RPM = bonus pour <i>rpm_views</i> vues à J+7 (1 000 par défaut). Ex. RPM 1 $ / 1 000 vues : une vidéo à 25 000 vues à J+7 rapporte 25 $ de bonus.</p>
      <Table className="mb-10">
        <thead><tr><Th>Zone</Th><Th>Tarif / vidéo</Th><Th>RPM</Th><Th>Par … vues</Th><Th>Devise</Th><Th>Vidéos / jour</Th><Th>Active</Th><Th>Pays</Th><Th /></tr></thead>
        <tbody>
          {zones?.map((z: any) => {
            const d = zoneDraft[z.code] ?? z;
            const set = (k: string, v: any) => setZoneDraft((x) => ({ ...x, [z.code]: { ...d, [k]: v } }));
            return (
              <tr key={z.code}>
                <Td className="font-semibold">{z.code}</Td>
                <Td><Input className="w-24" type="number" step="0.01" value={d.price_per_video} onChange={(e) => set("price_per_video", e.target.value)} /></Td>
                <Td><Input className="w-24" type="number" step="0.01" value={d.rpm} onChange={(e) => set("rpm", e.target.value)} /></Td>
                <Td><Input className="w-24" type="number" value={d.rpm_views} onChange={(e) => set("rpm_views", e.target.value)} /></Td>
                <Td><Input className="w-20" value={d.currency} onChange={(e) => set("currency", e.target.value)} /></Td>
                <Td><Input className="w-20" type="number" value={d.videos_per_day} onChange={(e) => set("videos_per_day", e.target.value)} /></Td>
                <Td><Switch checked={!!d.active} onChange={(v) => set("active", v)} /></Td>
                <Td>{counts[z.code] ?? 0}</Td>
                <Td>{zoneDraft[z.code] && <Button size="sm" onClick={() => saveZone(z.code)}>Enregistrer</Button>}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Pays ({countries?.length ?? 0})</h2>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} className="w-48" />
          <Select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="w-40">
            <option value="">Toutes les zones</option>
            {zones?.map((z: any) => <option key={z.code} value={z.code}>Zone {z.code} ({counts[z.code] ?? 0})</option>)}
            {counts["—"] ? <option value="—">Sans zone ({counts["—"]})</option> : null}
          </Select>
          <Button onClick={() => setAdd({ code: "", name: "", zone_code: "C", language: "en" })}><Plus className="h-4 w-4" /> Pays</Button>
        </div>
      </div>
      <Table>
        <thead><tr><Th>Pays</Th><Th>Zone</Th><Th>Langue</Th><Th>Recrutement ouvert</Th><Th>Recruteur</Th><Th>Clauses contrat</Th></tr></thead>
        <tbody>
          {filtered.map((c: any) => (
            <tr key={c.code}>
              <Td><span className="mr-2">{flag(c.code)}</span>{c.name} <span className="text-xs text-muted-foreground">{c.code}</span></Td>
              <Td><Select className="w-24" value={c.zone_code ?? ""} onChange={(e) => updateCountry(c.code, { zone_code: e.target.value || null })}>
                <option value="">—</option>{zones?.map((z: any) => <option key={z.code} value={z.code}>{z.code}</option>)}</Select></Td>
              <Td><Input className="w-20" defaultValue={c.language} onBlur={(e) => e.target.value !== c.language && updateCountry(c.code, { language: e.target.value.trim() || "en" })} /></Td>
              <Td><Switch checked={c.open} onChange={(v) => updateCountry(c.code, { open: v })} /></Td>
              <Td><Select className="w-48" value={c.recruiter_id ?? ""} onChange={(e) => updateCountry(c.code, { recruiter_id: e.target.value || null })}>
                <option value="">—</option>{recruiters.data?.map((r: any) => <option key={r.id} value={r.id}>{r.full_name ?? r.email}</option>)}</Select></Td>
              <Td>
                <Button size="sm" variant="ghost" onClick={() => setClauses({ code: c.code, name: c.name, text: c.contract_clauses ?? "" })}>
                  {c.contract_clauses ? (c.contract_clauses.includes("[À VALIDER") ? <Badge tone="warning">À valider</Badge> : <Badge tone="success">OK</Badge>) : "Ajouter"}
                </Button>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Dialog open={!!clauses} onClose={() => setClauses(null)} title={`Clauses contrat — ${clauses?.name ?? ""}`} wide
        footer={<><Button variant="outline" onClick={() => setClauses(null)}>Annuler</Button><Button onClick={async () => { await updateCountry(clauses!.code, { contract_clauses: clauses!.text || null }); setClauses(null); }}>Enregistrer</Button></>}>
        {clauses && <>
          <p className="mb-2 text-sm text-muted-foreground">Insérées dans le contrat à la place de {"{{country_clauses}}"} (Markdown). Exigences Ruul, fiscalité, statut d'indépendant…</p>
          <Textarea className="min-h-48 font-mono text-xs" value={clauses.text} onChange={(e) => setClauses({ ...clauses, text: e.target.value })} />
        </>}
      </Dialog>
      <Dialog open={!!add} onClose={() => setAdd(null)} title="Ajouter un pays"
        footer={<><Button variant="outline" onClick={() => setAdd(null)}>Annuler</Button><Button onClick={addCountry}>Ajouter</Button></>}>
        {add && <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code ISO"><Input maxLength={2} value={add.code} onChange={(e) => setAdd({ ...add, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Nom"><Input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} /></Field>
          <Field label="Zone"><Select value={add.zone_code} onChange={(e) => setAdd({ ...add, zone_code: e.target.value })}>{zones?.map((z: any) => <option key={z.code} value={z.code}>{z.code}</option>)}</Select></Field>
          <Field label="Langue (code)"><Input value={add.language} onChange={(e) => setAdd({ ...add, language: e.target.value })} /></Field>
        </div>}
      </Dialog>
      <Card className="mt-6 text-sm text-muted-foreground">Un pays fermé n'accepte plus de candidatures (la landing l'indique). La zone fixe le tarif du contrat et de la paie.</Card>
    </>
  );
}

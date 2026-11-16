import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCountries } from "@/lib/hooks";
import { dateFr, flag } from "@/lib/utils";
import { renderContract } from "@shared/contract";
import { Badge, Button, Card, Dialog, Field, Input, PageHeader, Select, Spinner, Switch, Table, Tabs, Td, Textarea, Th, useToast } from "@/components/ui";

const SAMPLE = {
  company_name: "Vik Studios SAS", full_name: "Ana García", birthdate: "2004-03-12", country_name: "Spain", date: new Date().toISOString().slice(0, 10),
  videos_per_day: 1, price_per_video: "$6.00", rpm: "$0.50", rpm_views: "1,000", zone_code: "B", currency: "USD",
  country_clauses: "**Country notes (EU):** exemple de clauses pays.",
};
const VARIABLES = Object.keys(SAMPLE);
const STATUS_TONE: Record<string, any> = { sent: "accent", signed: "success", expired: "warning", cancelled: "default" };

export default function Contracts() {
  const [tab, setTab] = useState<"templates" | "contracts">("templates");
  return (
    <>
      <PageHeader title="Contrats" description="Modèles de contrat (par défaut ou par pays) et contrats envoyés / signés." />
      <ValidateBanner />
      <div className="mb-6"><Tabs value={tab} onChange={setTab} items={[{ value: "templates", label: "Modèles" }, { value: "contracts", label: "Contrats" }]} /></div>
      {tab === "templates" ? <Templates /> : <ContractList />}
    </>
  );
}

function ValidateBanner() {
  const { data: tpls } = useQuery({ queryKey: ["contract_templates"], queryFn: async () => (await supabase.from("contract_templates").select("*").order("created_at", { ascending: false })).data ?? [] });
  const { data: countries } = useCountries();
  const items = useMemo(() => {
    const out: string[] = [];
    for (const t of tpls ?? []) if (t.active) for (const line of String(t.body_md).split("\n")) if (line.includes("[À VALIDER")) out.push(`Modèle « ${t.title} » : ${line.replace(/[#*]/g, "").trim()}`);
    const n = (countries ?? []).filter((c: any) => c.contract_clauses?.includes("[À VALIDER")).length;
    if (n) out.push(`${n} pays ont des clauses à valider (Réglages → Pays & zones).`);
    return out;
  }, [tpls, countries]);
  if (!items.length) return null;
  return (
    <Card className="mb-6 border-warning/50">
      <div className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 text-warning" /> À valider par Max / juridique</div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{items.map((i, k) => <li key={k}>{i}</li>)}</ul>
    </Card>
  );
}

function Templates() {
  const { data: countries } = useCountries();
  const qc = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState<any | null>(null);
  const [preview, setPreview] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["contract_templates"], queryFn: async () => (await supabase.from("contract_templates").select("*").order("created_at", { ascending: false })).data ?? [] });

  const save = async (asNew: boolean) => {
    if (!edit.title?.trim() || !edit.body_md?.trim()) return toast("Titre et texte obligatoires", "danger");
    const row = { country_code: edit.country_code || null, language: edit.language || "en", title: edit.title, body_md: edit.body_md, active: edit.active !== false };
    if (asNew || !edit.id) {
      // Nouvelle version : l'ancienne (même pays/langue) est désactivée, les contrats déjà envoyés gardent leur texte.
      const same = (data ?? []).filter((t: any) => (t.country_code ?? null) === row.country_code && t.language === row.language);
      const version = Math.max(0, ...same.map((t: any) => t.version)) + 1;
      if (row.active && same.length) await supabase.from("contract_templates").update({ active: false }).in("id", same.map((t: any) => t.id));
      const { error } = await supabase.from("contract_templates").insert({ ...row, version });
      if (error) return toast(error.message, "danger");
      toast(`Version ${version} enregistrée`, "success");
    } else {
      const { error } = await supabase.from("contract_templates").update(row).eq("id", edit.id);
      if (error) return toast(error.message, "danger");
      toast("Modèle mis à jour", "success");
    }
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["contract_templates"] });
  };

  if (isLoading) return <Spinner />;
  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setEdit({ country_code: "", language: "en", title: "Independent Creator Agreement", body_md: data?.[0]?.body_md ?? "", active: true })}><Plus className="h-4 w-4" /> Modèle</Button></div>
      <Table>
        <thead><tr><Th>Titre</Th><Th>Pays</Th><Th>Langue</Th><Th>Version</Th><Th>Statut</Th><Th /></tr></thead>
        <tbody>
          {data?.map((t: any) => (
            <tr key={t.id}>
              <Td className="font-medium">{t.title}</Td>
              <Td>{t.country_code ? `${flag(t.country_code)} ${t.country_code}` : <Badge tone="outline">Défaut (tous pays)</Badge>}</Td>
              <Td className="uppercase">{t.language}</Td>
              <Td>v{t.version}</Td>
              <Td>{t.active ? <Badge tone="success">Actif</Badge> : <Badge>Archivé</Badge>}</Td>
              <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => setEdit(t)}>Modifier</Button></Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-3 text-xs text-muted-foreground">Le contrat d'un candidat utilise le modèle actif de son pays, sinon le modèle par défaut. Le texte rendu et son empreinte SHA-256 sont figés à l'envoi.</p>

      <Dialog open={!!edit} onClose={() => { setEdit(null); setPreview(false); }} title={edit?.id ? `${edit.title} (v${edit.version})` : "Nouveau modèle"} wide
        footer={<>
          <Button variant="outline" onClick={() => setPreview(!preview)}>{preview ? "Éditer" : "Aperçu"}</Button>
          {edit?.id && <Button variant="outline" onClick={() => save(false)}>Corriger cette version</Button>}
          <Button onClick={() => save(true)}>Enregistrer comme nouvelle version</Button>
        </>}>
        {edit && (preview ? (
          <pre className="whitespace-pre-wrap rounded border bg-muted/40 p-4 font-sans text-sm">{renderContract(edit.body_md, SAMPLE)}</pre>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Titre" className="sm:col-span-2"><Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
              <Field label="Pays"><Select value={edit.country_code ?? ""} onChange={(e) => setEdit({ ...edit, country_code: e.target.value })}>
                <option value="">Défaut (tous)</option>{countries?.map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}</Select></Field>
              <Field label="Langue"><Input value={edit.language} onChange={(e) => setEdit({ ...edit, language: e.target.value })} /></Field>
            </div>
            <p className="text-xs text-muted-foreground">Variables : {VARIABLES.map((v) => `{{${v}}}`).join(", ")}</p>
            <Textarea className="min-h-[50vh] font-mono text-xs" value={edit.body_md} onChange={(e) => setEdit({ ...edit, body_md: e.target.value })} />
            <label className="flex items-center gap-2 text-sm"><Switch checked={edit.active !== false} onChange={(v) => setEdit({ ...edit, active: v })} /> Actif</label>
          </div>
        ))}
      </Dialog>
    </>
  );
}

function ContractList() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["contracts", status],
    queryFn: async () => {
      let q = supabase.from("contracts").select("id, status, sent_at, reminders, expires_at, signed_at, signed_name, signed_ip, doc_hash, pdf_path, applications(first_name, last_name, email, country)").order("sent_at", { ascending: false }).limit(200);
      if (status) q = q.eq("status", status);
      return (await q).data ?? [];
    },
  });
  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("contracts").createSignedUrl(path, 300, { download: true });
    if (error || !data) return toast(error?.message ?? "Erreur", "danger");
    window.open(data.signedUrl, "_blank");
  };
  return (
    <>
      <Select className="mb-4 w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Tous</option><option value="sent">Envoyés</option><option value="signed">Signés</option><option value="expired">Expirés</option><option value="cancelled">Annulés</option>
      </Select>
      {isLoading ? <Spinner /> : (
        <Table>
          <thead><tr><Th>Candidat</Th><Th>Statut</Th><Th>Envoyé</Th><Th>Relances</Th><Th>Signé</Th><Th>IP</Th><Th>Empreinte</Th><Th /></tr></thead>
          <tbody>
            {data?.length === 0 && <tr><Td colSpan={8} className="text-center text-muted-foreground">Aucun contrat.</Td></tr>}
            {data?.map((k: any) => (
              <tr key={k.id}>
                <Td>{flag(k.applications?.country)} {k.applications?.first_name} {k.applications?.last_name}<div className="text-xs text-muted-foreground">{k.applications?.email}</div></Td>
                <Td><Badge tone={STATUS_TONE[k.status]}>{k.status}</Badge></Td>
                <Td className="text-xs">{dateFr(k.sent_at, true)}</Td>
                <Td>{k.reminders}</Td>
                <Td className="text-xs">{k.signed_at ? <>{dateFr(k.signed_at, true)}<div className="text-muted-foreground">« {k.signed_name} »</div></> : "—"}</Td>
                <Td className="font-mono text-xs">{k.signed_ip ?? "—"}</Td>
                <Td className="font-mono text-xs" >{k.doc_hash.slice(0, 12)}…</Td>
                <Td>{k.pdf_path && <Button size="sm" variant="outline" onClick={() => download(k.pdf_path)}>PDF</Button>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

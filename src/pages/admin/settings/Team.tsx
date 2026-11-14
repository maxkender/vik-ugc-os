import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useCountries } from "@/lib/hooks";
import { dateFr, flag } from "@/lib/utils";
import { Badge, Button, Card, Dialog, Input, PageHeader, Select, Spinner, Table, Td, Th, useToast } from "@/components/ui";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", recruiter: "Recruteur", poster: "Posteur" };

export default function Team() {
  const { profile: me } = useAuth();
  const { data: countries } = useCountries();
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("staff");
  const [edit, setEdit] = useState<any | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["profiles"], queryFn: async () => (await supabase.from("profiles").select("*").order("created_at")).data ?? [] });

  const update = async (id: string, patch: Record<string, unknown>) => {
    if (id === me?.id && patch.role && patch.role !== "admin" && !confirm("Vous retirer le rôle admin ? Vous perdrez l'accès à cette page.")) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) return toast(error.message, "danger");
    toast("Profil mis à jour", "success");
    qc.invalidateQueries({ queryKey: ["profiles"] });
    qc.invalidateQueries({ queryKey: ["recruiters"] });
  };
  const rows = (data ?? []).filter((p: any) =>
    (roleFilter === "all" || (roleFilter === "staff" ? p.role !== "poster" : p.role === roleFilter)) &&
    (!q || `${p.email} ${p.full_name ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHeader title="Équipe" description="Rôles : admin (tout), recruteur (candidats de ses pays), posteur (espace créateur)." />
      <Card className="mb-6 text-sm text-muted-foreground">
        Pour ajouter un recruteur : il se connecte une fois sur <code>/login</code> (lien magique), puis vous changez son rôle ici et lui assignez ses pays.
        Le premier compte créé est devenu admin automatiquement ; en secours, la commande SQL <code>select public.promote_admin('email')</code> est documentée dans SETUP.md.
      </Card>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="w-64" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="w-44" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="staff">Admins + recruteurs</option><option value="all">Tous</option><option value="admin">Admins</option><option value="recruiter">Recruteurs</option><option value="poster">Posteurs</option>
        </Select>
      </div>
      {isLoading ? <Spinner /> : (
        <Table>
          <thead><tr><Th>Personne</Th><Th>Rôle</Th><Th>Pays (recruteur)</Th><Th>Créé</Th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><Td colSpan={4} className="text-center text-muted-foreground">Personne.</Td></tr>}
            {rows.map((p: any) => (
              <tr key={p.id}>
                <Td><div className="font-medium">{p.full_name ?? "—"} {p.id === me?.id && <Badge tone="accent">vous</Badge>}</div><div className="text-xs text-muted-foreground">{p.email}</div></Td>
                <Td><Select className="w-36" value={p.role} onChange={(e) => update(p.id, { role: e.target.value })}>
                  {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Td>
                <Td>{p.role === "recruiter" ? (
                  <button onClick={() => setEdit({ ...p, _sel: new Set(p.recruiter_countries ?? []) })} className="flex flex-wrap gap-1 rounded px-1 py-0.5 text-left hover:bg-muted">
                    {(p.recruiter_countries ?? []).length ? p.recruiter_countries.map((c: string) => <Badge key={c} tone="outline">{flag(c)} {c}</Badge>) : <span className="text-xs text-accent">Assigner des pays</span>}
                  </button>) : <span className="text-xs text-muted-foreground">—</span>}</Td>
                <Td className="text-xs">{dateFr(p.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={`Pays de ${edit?.full_name ?? edit?.email ?? ""}`} wide
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button><Button onClick={async () => { await update(edit.id, { recruiter_countries: [...edit._sel].sort() }); setEdit(null); }}>Enregistrer</Button></>}>
        {edit && <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {countries?.map((c: any) => {
            const on = edit._sel.has(c.code);
            return (
              <label key={c.code} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                <input type="checkbox" checked={on} onChange={() => { const s = new Set(edit._sel); on ? s.delete(c.code) : s.add(c.code); setEdit({ ...edit, _sel: s }); }} />
                {flag(c.code)} {c.name}
              </label>
            );
          })}
        </div>}
      </Dialog>
    </>
  );
}

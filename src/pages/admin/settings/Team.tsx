import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { callFn } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useCountries } from "@/lib/hooks";
import { ago, flag } from "@/lib/utils";
import { Badge, Button, Card, Dialog, Field, Input, PageHeader, Select, Spinner, Table, Td, Th, useToast } from "@/components/ui";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", recruiter: "Recruteur", controller: "Contrôleur", poster: "Posteur" };
const ROLE_TONE: Record<string, any> = { admin: "accent", recruiter: "success", controller: "warning", poster: "outline" };
const ROLE_HELP: Record<string, string> = {
  admin: "Accès complet : réglages, paie, équipe, Meta.",
  recruiter: "Candidats et suivi d'onboarding de ses pays, bibliothèque, briefs.",
  controller: "Valide ou refuse les briefs, les posts et leurs vues. Pas d'accès à la paie, aux réglages ni à l'équipe.",
  poster: "Espace créateur uniquement.",
};

export default function Team() {
  const { profile: me } = useAuth();
  const { data: countries } = useCountries();
  const qc = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("staff");
  const [edit, setEdit] = useState<any | null>(null);
  const [inviting, setInviting] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["team"], queryFn: async () => (await callFn<{ users: any[] }>("team", { action: "list" })).users });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["team"] }); qc.invalidateQueries({ queryKey: ["profiles"] }); };

  const remove = async (u: any) => {
    if (!confirm(`Retirer l'accès de ${u.email} ? ${u.role === "poster" ? "Le compte sera supprimé." : "S'il a une fiche posteur, il redevient posteur ; sinon son compte est supprimé."}`)) return;
    try {
      const r = await callFn("team", { action: "remove", user_id: u.id });
      toast(r.kept_as_poster ? "Accès équipe retiré (reste posteur)" : "Compte supprimé", "success");
      refresh();
    } catch (e) { toast((e as Error).message, "danger"); }
  };

  const rows = (data ?? []).filter((p: any) =>
    (roleFilter === "all" || (roleFilter === "staff" ? p.role !== "poster" : p.role === roleFilter)) &&
    (!q || `${p.email} ${p.full_name ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <PageHeader title="Équipe" description="Invite des admins, recruteurs et contrôleurs ; change ou retire leurs rôles."
        actions={<Button onClick={() => setInviting(true)}><UserPlus className="h-4 w-4" /> Inviter</Button>} />
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        {(["admin", "recruiter", "controller"] as const).map((r) => (
          <Card key={r} className="p-4">
            <div className="mb-1 flex items-center gap-2"><Badge tone={ROLE_TONE[r]}>{ROLE_LABEL[r]}</Badge><span className="text-xs text-muted-foreground">{(data ?? []).filter((p: any) => p.role === r).length}</span></div>
            <p className="text-xs text-muted-foreground">{ROLE_HELP[r]}</p>
          </Card>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input className="h-8 w-64 text-xs" placeholder="Rechercher un email, un nom…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="h-8 w-44 text-xs" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="staff">Équipe (hors posteurs)</option><option value="all">Tout le monde</option>
          <option value="admin">Admins</option><option value="recruiter">Recruteurs</option><option value="controller">Contrôleurs</option><option value="poster">Posteurs</option>
        </Select>
      </div>
      {isLoading ? <div className="flex justify-center py-16"><Spinner /></div> : error ? <p className="text-sm text-danger">{(error as Error).message}</p> : (
        <Table>
          <thead><tr><Th>Personne</Th><Th>Rôle</Th><Th>Pays (recruteur)</Th><Th>Dernière connexion</Th><Th /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><Td colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Personne ici. Invite un membre avec le bouton « Inviter ».</Td></tr>}
            {rows.map((p: any) => (
              <tr key={p.id}>
                <Td><p className="font-medium">{p.full_name ?? "—"} {p.id === me?.id && <span className="text-xs text-muted-foreground">(vous)</span>}</p><p className="text-xs text-muted-foreground">{p.email}</p></Td>
                <Td><Badge tone={ROLE_TONE[p.role]}>{ROLE_LABEL[p.role] ?? p.role}</Badge></Td>
                <Td className="text-xs">{p.role === "recruiter" ? (p.recruiter_countries?.length ? p.recruiter_countries.map((c: string) => `${flag(c)} ${c}`).join("  ") : <span className="text-danger">aucun pays</span>) : "—"}</Td>
                <Td className="text-xs">{p.last_sign_in_at ? ago(p.last_sign_in_at) : <span className="text-muted-foreground">jamais (invitation en attente)</span>}</Td>
                <Td className="whitespace-nowrap text-right">
                  <Button size="sm" variant="outline" onClick={() => setEdit(p)}>Modifier</Button>{" "}
                  {p.id !== me?.id && <Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(p)}>Retirer</Button>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="mt-3 text-xs text-muted-foreground">L'invitation est envoyée par Supabase Auth (email « You have been invited »), pas par Brevo. La personne choisit son accès via le lien, puis arrive sur l'admin avec son rôle.</p>
      <RoleDialog user={edit} isMe={edit?.id === me?.id} countries={countries ?? []} onClose={() => setEdit(null)} onSaved={refresh} />
      <InviteDialog open={inviting} countries={countries ?? []} onClose={() => setInviting(false)} onSaved={refresh} />
    </div>
  );
}

function CountryPicker({ countries, value, onChange }: { countries: any[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto rounded-md border p-2">
      {countries.map((c) => (
        <button key={c.code} type="button" onClick={() => onChange(value.includes(c.code) ? value.filter((x) => x !== c.code) : [...value, c.code])}
          className={`rounded-full border px-2 py-0.5 text-xs ${value.includes(c.code) ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground"}`}>{flag(c.code)} {c.code}</button>
      ))}
    </div>
  );
}

function RoleDialog({ user, isMe, countries, onClose, onSaved }: { user: any; isMe: boolean; countries: any[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [role, setRole] = useState("recruiter");
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  if (user && user.id !== lastId) { setLastId(user.id); setRole(user.role); setSel(user.recruiter_countries ?? []); }
  const save = async () => {
    if (isMe && role !== "admin" && !confirm("Vous retirer le rôle admin ?")) return;
    setBusy(true);
    try {
      await callFn("team", { action: "set_role", user_id: user.id, role, countries: sel });
      toast("Rôle mis à jour", "success");
      onSaved();
      onClose();
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(false); }
  };
  return (
    <Dialog open={!!user} onClose={onClose} title={`Rôle · ${user?.email ?? ""}`} footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={save} loading={busy}>Enregistrer</Button></>}>
      <div className="space-y-4">
        <Field label="Rôle" hint={ROLE_HELP[role]}>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        {role === "recruiter" && <Field label="Pays du recruteur" hint="Il ne voit que les candidatures de ces pays."><CountryPicker countries={countries} value={sel} onChange={setSel} /></Field>}
      </div>
    </Dialog>
  );
}

function InviteDialog({ open, countries, onClose, onSaved }: { open: boolean; countries: any[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("admin");
  const [sel, setSel] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const r = await callFn("team", { action: "invite", email, role, countries: sel });
      toast(r.existed ? "Compte existant : rôle mis à jour" : "Invitation envoyée", "success");
      setEmail("");
      setSel([]);
      onSaved();
      onClose();
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onClose={onClose} title="Inviter un membre" footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={send} loading={busy} disabled={!email.includes("@")}>Envoyer l'invitation</Button></>}>
      <div className="space-y-4">
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></Field>
        <Field label="Rôle" hint={ROLE_HELP[role]}>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="admin">Admin</option><option value="recruiter">Recruteur</option><option value="controller">Contrôleur</option>
          </Select>
        </Field>
        {role === "recruiter" && <Field label="Pays du recruteur"><CountryPicker countries={countries} value={sel} onChange={setSel} /></Field>}
      </div>
    </Dialog>
  );
}

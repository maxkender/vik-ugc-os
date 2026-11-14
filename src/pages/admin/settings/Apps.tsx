import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApps } from "@/lib/hooks";
import { Badge, Button, Dialog, Empty, Field, Input, PageHeader, Spinner, Switch, Table, Td, Textarea, Th, useToast } from "@/components/ui";

type App = { id?: string; slug: string; name: string; description: string | null; website: string | null; ios_url: string | null; android_url: string | null; active: boolean };
const blank: App = { slug: "", name: "", description: "", website: "", ios_url: "", android_url: "", active: true };

export default function Apps() {
  const { data: apps, isLoading } = useApps();
  const qc = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState<App | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!edit) return;
    if (!edit.name.trim() || !/^[a-z0-9-]+$/.test(edit.slug)) return toast("Nom et slug (minuscules, chiffres, tirets) obligatoires", "danger");
    setBusy(true);
    const row = { ...edit, description: edit.description || null, website: edit.website || null, ios_url: edit.ios_url || null, android_url: edit.android_url || null };
    const { error } = edit.id ? await supabase.from("apps").update(row).eq("id", edit.id) : await supabase.from("apps").insert(row);
    setBusy(false);
    if (error) return toast(error.message, "danger");
    toast("App enregistrée", "success");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["apps"] });
  };
  const remove = async (a: App) => {
    if (!confirm(`Supprimer ${a.name} ? Ses concurrents et sources seront supprimés.`)) return;
    const { error } = await supabase.from("apps").delete().eq("id", a.id!);
    if (error) return toast(error.message, "danger");
    qc.invalidateQueries({ queryKey: ["apps"] });
  };
  const set = (k: keyof App, v: any) => setEdit((e) => (e ? { ...e, [k]: v } : e));

  return (
    <>
      <PageHeader title="Apps" description="Les apps que nos posteurs promeuvent. Micabo d'abord, multi-apps prévu." actions={<Button onClick={() => setEdit({ ...blank })}><Plus className="h-4 w-4" /> Nouvelle app</Button>} />
      {isLoading ? <Spinner /> : !apps?.length ? <Empty title="Aucune app" /> : (
        <Table>
          <thead><tr><Th>Nom</Th><Th>Slug</Th><Th>Liens</Th><Th>Statut</Th><Th /></tr></thead>
          <tbody>
            {apps.map((a: any) => (
              <tr key={a.id}>
                <Td><div className="font-medium">{a.name}</div><div className="max-w-md truncate text-xs text-muted-foreground">{a.description}</div></Td>
                <Td className="font-mono text-xs">{a.slug}</Td>
                <Td className="space-x-2 text-xs">
                  {a.website && <a className="text-accent hover:underline" href={a.website} target="_blank" rel="noreferrer">Site</a>}
                  {a.ios_url && <a className="text-accent hover:underline" href={a.ios_url} target="_blank" rel="noreferrer">iOS</a>}
                  {a.android_url && <a className="text-accent hover:underline" href={a.android_url} target="_blank" rel="noreferrer">Android</a>}
                </Td>
                <Td>{a.active ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}</Td>
                <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => setEdit(a)}>Modifier</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(a)}>Supprimer</Button></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Modifier l'app" : "Nouvelle app"}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button><Button loading={busy} onClick={save}>Enregistrer</Button></>}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom"><Input value={edit.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Slug" hint="minuscules, ex. micabo"><Input value={edit.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} /></Field>
            <Field label="Description" className="sm:col-span-2"><Textarea value={edit.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>
            <Field label="Site web"><Input value={edit.website ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
            <Field label="App Store (iOS)"><Input value={edit.ios_url ?? ""} onChange={(e) => set("ios_url", e.target.value)} /></Field>
            <Field label="Google Play"><Input value={edit.android_url ?? ""} onChange={(e) => set("android_url", e.target.value)} /></Field>
            <div className="flex items-center gap-3 pt-6"><Switch checked={edit.active} onChange={(v) => set("active", v)} /> <span className="text-sm">Active</span></div>
          </div>
        )}
      </Dialog>
    </>
  );
}

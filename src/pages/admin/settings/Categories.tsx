import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCategories } from "@/lib/hooks";
import { Badge, Button, Card, Dialog, Field, Input, PageHeader, Spinner, Table, Td, Textarea, Th, useToast } from "@/components/ui";

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export default function Categories() {
  const { data: cats, isLoading } = useCategories();
  const counts = useQuery({
    queryKey: ["category-counts", cats?.length],
    enabled: !!cats,
    queryFn: async () => {
      const out: Record<string, number> = {};
      await Promise.all((cats ?? []).map(async (c: any) => {
        const { count } = await supabase.from("videos").select("id", { count: "exact", head: true }).eq("category_id", c.id);
        out[c.id] = count ?? 0;
      }));
      const { count } = await supabase.from("videos").select("id", { count: "exact", head: true }).is("category_id", null);
      out.none = count ?? 0;
      return out;
    },
  });
  const qc = useQueryClient();
  const toast = useToast();
  const [edit, setEdit] = useState<any | null>(null);

  const save = async () => {
    const name = String(edit.name ?? "").trim();
    if (!name) return toast("Nom obligatoire", "danger");
    const row = {
      name, slug: edit.slug?.trim() || slugify(name), description: edit.description || null, color: edit.color || null, sort: Number(edit.sort ?? 0),
      keywords: String(edit._keywords ?? "").split(",").map((k: string) => k.trim()).filter(Boolean),
    };
    const { error } = edit.id ? await supabase.from("categories").update(row).eq("id", edit.id) : await supabase.from("categories").insert(row);
    if (error) return toast(error.message, "danger");
    toast("Catégorie enregistrée", "success");
    setEdit(null);
    qc.invalidateQueries({ queryKey: ["categories"] });
  };
  const remove = async (c: any) => {
    if (!confirm(`Supprimer « ${c.name} » ? Les vidéos concernées deviennent non catégorisées.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) return toast(error.message, "danger");
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  return (
    <>
      <PageHeader title="Catégories" description="Types de format des vidéos (réaction, b-roll, face cam, tuto…)."
        actions={<Button onClick={() => setEdit({ name: "", _keywords: "", color: "#6366f1", sort: (cats?.length ?? 0) + 1 })}><Plus className="h-4 w-4" /> Catégorie</Button>} />
      <Card className="mb-6 text-sm text-muted-foreground">
        <b className="text-foreground">Auto-catégorisation :</b> à chaque collecte, une heuristique cherche les mots-clés ci-dessous dans la légende et les hashtags
        (un hashtag exact compte double ; l'effet « Green Screen » de TikTok et les slideshows sont détectés). Une catégorie changée à la main dans la Bibliothèque n'est plus jamais écrasée.
        Un classifieur IA pourra remplacer l'heuristique plus tard (interface <code>Classifier</code>, même signature).
      </Card>
      {isLoading ? <Spinner /> : (
        <Table>
          <thead><tr><Th>Catégorie</Th><Th>Mots-clés</Th><Th>Vidéos</Th><Th>Ordre</Th><Th /></tr></thead>
          <tbody>
            {cats?.map((c: any) => (
              <tr key={c.id}>
                <Td><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: c.color ?? "#999" }} /><span className="font-medium">{c.name}</span><span className="font-mono text-xs text-muted-foreground">{c.slug}</span></div>
                  {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}</Td>
                <Td><div className="flex max-w-lg flex-wrap gap-1">{(c.keywords ?? []).map((k: string) => <Badge key={k} tone="outline">{k}</Badge>)}</div></Td>
                <Td>{counts.data?.[c.id] ?? "…"}</Td>
                <Td>{c.sort}</Td>
                <Td className="text-right whitespace-nowrap"><Button size="sm" variant="ghost" onClick={() => setEdit({ ...c, _keywords: (c.keywords ?? []).join(", ") })}>Modifier</Button><Button size="sm" variant="ghost" className="text-danger" onClick={() => remove(c)}>Supprimer</Button></Td>
              </tr>
            ))}
            <tr><Td className="text-muted-foreground">Non catégorisées</Td><Td /><Td>{counts.data?.none ?? "…"}</Td><Td /><Td /></tr>
          </tbody>
        </Table>
      )}
      <Dialog open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Modifier la catégorie" : "Nouvelle catégorie"}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>Annuler</Button><Button onClick={save}>Enregistrer</Button></>}>
        {edit && <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="Slug" hint="vide = généré depuis le nom"><Input value={edit.slug ?? ""} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
          <Field label="Mots-clés" className="sm:col-span-2" hint="séparés par des virgules, toutes langues (ex. pov, tuto, astuce, trucos)"><Textarea value={edit._keywords} onChange={(e) => setEdit({ ...edit, _keywords: e.target.value })} /></Field>
          <Field label="Couleur"><input type="color" className="h-9 w-16 cursor-pointer rounded border bg-card" value={edit.color ?? "#6366f1"} onChange={(e) => setEdit({ ...edit, color: e.target.value })} /></Field>
          <Field label="Ordre"><Input type="number" value={edit.sort ?? 0} onChange={(e) => setEdit({ ...edit, sort: e.target.value })} /></Field>
        </div>}
      </Dialog>
    </>
  );
}

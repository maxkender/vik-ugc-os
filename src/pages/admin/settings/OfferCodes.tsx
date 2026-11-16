import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Eye, KeyRound, RefreshCw, Upload } from "lucide-react";
import { Badge, Button, Card, Select, Spinner, Table, Td, Th, useToast } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { dateFr } from "@/lib/utils";

interface Stat { app_id: string; app_name: string; available: number; assigned: number; redeemed: number; void: number; low_stock: number }

/**
 * Réglages → Apps → Codes promo Apple (accès premium pour filmer la démo). Codes masqués, « afficher » au clic (journalisé),
 * réattribution, import CSV d'un nouveau lot, alerte sous le seuil de stock.
 */
export function OfferCodes() {
  const toast = useToast();
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["offer-stats"], queryFn: async () => ((await supabase.rpc("admin_offer_code_stats")).data ?? []) as Stat[] });
  const [appId, setAppId] = useState("");
  const app = (stats.data ?? []).find((s) => s.app_id === appId) ?? (stats.data ?? []).find((s) => s.available + s.assigned + s.redeemed > 0) ?? stats.data?.[0];
  const list = useQuery({
    queryKey: ["offer-list", app?.app_id],
    enabled: !!app,
    queryFn: async () => ((await supabase.rpc("admin_offer_codes_list", { p_app: app!.app_id, p_limit: 200 })).data ?? []) as any[],
  });
  const [shown, setShown] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["offer-stats"] }); qc.invalidateQueries({ queryKey: ["offer-list"] }); };

  const reveal = async (id: number) => {
    if (shown[id]) return setShown(({ [id]: _, ...r }) => r);
    const { data, error } = await supabase.rpc("admin_reveal_offer_code", { p_id: id });
    if (error) return toast(error.message, "danger");
    setShown({ ...shown, [id]: data as string });
  };
  const reassign = async (posterId: string, name: string) => {
    if (!window.confirm(`Réattribuer un code à ${name} ? L'ancien code passe en « annulé ».`)) return;
    setBusy(posterId);
    const { error } = await supabase.rpc("admin_reassign_offer_code", { p_poster: posterId, p_app: app!.app_id });
    setBusy(null);
    if (error) return toast(error.message, "danger");
    toast("Nouveau code attribué", "success");
    refresh();
  };
  const importCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const head = lines[0].toLowerCase().split(/[;,\t]/);
    const hasHeader = head.some((h) => /code|url/.test(h));
    const ci = hasHeader ? Math.max(0, head.findIndex((h) => h.includes("code"))) : 0;
    const ui = hasHeader ? head.findIndex((h) => h.includes("url") || h.includes("link")) : 1;
    const rows = (hasHeader ? lines.slice(1) : lines).map((l) => { const c = l.split(/[;,\t]/); return { code: (c[ci] ?? "").replace(/"/g, "").trim(), url: ui >= 0 ? (c[ui] ?? "").replace(/"/g, "").trim() : "" }; }).filter((r) => r.code);
    if (!rows.length) return toast("Aucun code trouvé dans le fichier", "danger");
    if (!window.confirm(`Importer ${rows.length} codes pour ${app?.app_name} ?`)) return;
    setBusy("import");
    let imported = 0, dup = 0;
    for (let i = 0; i < rows.length; i += 2000) {
      const { data, error } = await supabase.rpc("admin_import_offer_codes", { p_app: app!.app_id, p_rows: rows.slice(i, i + 2000), p_batch: file.name.slice(0, 60) });
      if (error) { setBusy(null); return toast(error.message, "danger"); }
      imported += (data as any).imported; dup += (data as any).duplicates;
    }
    setBusy(null);
    toast(`${imported} codes importés${dup ? ` · ${dup} doublons ignorés` : ""}`, "success");
    refresh();
  };

  if (stats.isLoading) return <Spinner />;
  const low = app && app.available < app.low_stock;
  return (
    <Card className="mt-8 p-0" data-testid="offer-codes">
      <div className="flex flex-wrap items-center gap-3 border-b border-separator px-6 py-4">
        <KeyRound className="h-5 w-5 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">Codes promo Apple (accès premium)</p>
          <p className="text-[13px] text-muted-foreground">1 code par créateur, attribué automatiquement à la signature (ou au début du warm-up), jamais deux fois le même. iPhone uniquement.</p>
        </div>
        {(stats.data ?? []).length > 1 && (
          <Select value={app?.app_id ?? ""} onChange={(e) => setAppId(e.target.value)} className="w-44">
            {(stats.data ?? []).map((s) => <option key={s.app_id} value={s.app_id}>{s.app_name}</option>)}
          </Select>
        )}
        <label className="inline-flex">
          <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border-strong bg-white px-3 text-sm font-medium hover:bg-muted">{busy === "import" ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />} Importer un CSV</span>
          <input type="file" accept=".csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importCsv(f); }} />
        </label>
      </div>
      {app && (
        <div className="grid grid-cols-2 gap-3 px-6 py-4 sm:grid-cols-4">
          {([["Disponibles", app.available, low ? "danger" : "success"], ["Attribués", app.assigned, "default"], ["Activés", app.redeemed, "default"], ["Annulés", app.void, "default"]] as const).map(([l, n, tone]) => (
            <div key={l} className="rounded-xl border px-4 py-3"><p className="text-xs text-muted-foreground">{l}</p><p className="tabular mt-1 text-xl font-semibold"><Badge tone={tone as any}>{new Intl.NumberFormat("fr").format(Number(n))}</Badge></p></div>
          ))}
        </div>
      )}
      {low && (
        <p className="mx-6 mb-4 flex items-center gap-2 rounded-xl bg-tint-red px-4 py-3 text-sm text-[#a52326]"><AlertTriangle className="h-4 w-4 shrink-0" /> Stock bas : moins de {app!.low_stock} codes disponibles. Importe un nouveau lot (App Store Connect → Offer Codes).</p>
      )}
      {list.isLoading ? <div className="flex justify-center py-6"><Spinner /></div> : !(list.data ?? []).length ? (
        <p className="px-6 pb-5 text-sm text-muted-foreground">Aucun code attribué pour l'instant.</p>
      ) : (
        <Table>
          <thead><tr><Th>Créateur</Th><Th>Code</Th><Th>Statut</Th><Th>Attribué le</Th><Th /></tr></thead>
          <tbody>
            {(list.data ?? []).map((r: any) => (
              <tr key={r.id}>
                <Td>{r.poster_name ?? "—"}</Td>
                <Td className="font-mono text-xs">{shown[r.id] ?? r.masked} <button className="ml-1 text-subtle-foreground hover:text-foreground" onClick={() => reveal(r.id)} title={shown[r.id] ? "Masquer" : "Afficher (journalisé)"}><Eye className="inline h-3.5 w-3.5" /></button></Td>
                <Td><Badge tone={r.status === "redeemed" ? "success" : r.status === "void" ? "danger" : "default"}>{r.status === "assigned" ? "Attribué" : r.status === "redeemed" ? "Activé" : "Annulé"}</Badge></Td>
                <Td className="text-xs text-muted-foreground">{r.assigned_at ? dateFr(r.assigned_at) : ""}</Td>
                <Td className="text-right">{r.assigned_to && r.status !== "void" && <Button size="sm" variant="ghost" loading={busy === r.assigned_to} onClick={() => reassign(r.assigned_to, r.poster_name ?? "ce créateur")}><RefreshCw className="h-3.5 w-3.5" /> Réattribuer un code</Button>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

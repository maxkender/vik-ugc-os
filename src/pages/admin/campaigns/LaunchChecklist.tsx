import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, FlaskConical, RefreshCw, XCircle } from "lucide-react";
import { Badge, Button, Card, Input, Spinner, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Item { key: string; label: string; ok: boolean; critical: boolean; detail: string; manual?: boolean }
const MANUAL: Record<string, string> = { domain: "domain_verified", translations: "translations_reviewed", creatives: "creatives_validated" };

/** Checklist de lancement Meta : ✅/❌ par prérequis ; « Activer » est bloqué tant qu'un critique est ❌ (sauf forçage admin). */
export function LaunchChecklist() {
  const toast = useToast();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["meta-checklist"], queryFn: () => callFn("meta", { action: "checklist" }), staleTime: 60_000 });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const items: Item[] = q.data?.items ?? [];
  const blocking: string[] = q.data?.blocking ?? [];

  const toggle = async (key: string, value: boolean) => {
    setBusy(key);
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "meta").single();
      const v = (data?.value ?? {}) as any;
      await supabase.from("settings").update({ value: { ...v, checklist: { ...(v.checklist ?? {}), [MANUAL[key]]: value } } }).eq("key", "meta");
      await q.refetch();
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(null); }
  };
  const capiTest = async () => {
    setBusy("capi");
    try {
      const r = await callFn("meta", { action: "capi_test", test_event_code: code || undefined });
      toast(r.ok ? `Conversions API OK : ${r.events_received ?? 1} événement reçu (voir Events Manager → Tester les événements)` : `Échec : ${r.error ?? r.skipped}`, r.ok ? "success" : "danger");
      await q.refetch();
      qc.invalidateQueries({ queryKey: ["meta-checklist"] });
    } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(null); }
  };

  return (
    <Card className="mb-8 p-0" data-testid="launch-checklist">
      <div className="flex flex-wrap items-center gap-3 border-b border-separator px-6 py-4">
        <ClipboardCheck className="h-5 w-5 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-foreground">Checklist lancement Meta</p>
          <p className="text-[13px] text-muted-foreground">
            {q.isLoading ? "Vérification…" : blocking.length ? `${blocking.length} prérequis critique(s) manquant(s) : « Activer » est bloqué (forçage admin possible).` : "Tous les prérequis critiques sont OK : l'activation est possible."}
            {q.data?.pixel_id && <> · pixel {q.data.pixel_id} · objectif {q.data.objective === "traffic" ? "Trafic" : "Prospects (Lead)"}</>}
          </p>
        </div>
        {!q.isLoading && <Badge tone={blocking.length ? "danger" : "success"}>{blocking.length ? "Bloqué" : "Prêt"}</Badge>}
        <Button size="sm" variant="ghost" onClick={() => q.refetch()} loading={q.isFetching}><RefreshCw className="h-3.5 w-3.5" /> Revérifier</Button>
      </div>
      {q.isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : (
        <ul className="divide-y divide-separator">
          {items.map((i) => (
            <li key={i.key} className="flex flex-wrap items-center gap-3 px-6 py-2.5">
              {i.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> : <XCircle className={cn("h-4 w-4 shrink-0", i.critical ? "text-[#c42a2d]" : "text-[#c98a00]")} />}
              <span className="text-[13px] font-medium text-foreground">{i.label}</span>
              {i.critical ? <span className="text-[11px] text-subtle-foreground">critique</span> : <span className="text-[11px] text-subtle-foreground">recommandé</span>}
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{i.detail}</span>
              {i.manual && MANUAL[i.key] && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" disabled={busy === i.key} checked={!!q.data?.manual?.[MANUAL[i.key]]}
                    onChange={(e) => toggle(i.key, e.target.checked)} /> fait
                </label>
              )}
              {i.key === "capi" && (
                <span className="flex items-center gap-1.5">
                  <Input value={code} onChange={(e) => setCode(e.target.value.trim())} placeholder="code TEST…" className="h-8 w-32 text-xs" />
                  <Button size="sm" variant="secondary" loading={busy === "capi"} onClick={capiTest}><FlaskConical className="h-3.5 w-3.5" /> Tester</Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

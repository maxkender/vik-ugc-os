import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Paperclip } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { AssetPreview } from "../Assets";
import { KIND_LABEL, type Asset } from "./assetKinds";

/** Sélecteur d'assets d'un brief (bibliothèque Production → Assets) : clic pour joindre / retirer. */
export function BriefAssetsPicker({ briefId, appId }: { briefId: string; appId: string | null }) {
  const qc = useQueryClient();
  const all = useQuery({
    queryKey: ["assets"],
    queryFn: async () => ((await supabase.from("assets").select("*").order("created_at", { ascending: false })).data ?? []) as Asset[],
  });
  const attached = useQuery({
    queryKey: ["brief-assets", briefId],
    queryFn: async () => new Set(((await supabase.from("brief_assets").select("asset_id").eq("brief_id", briefId)).data ?? []).map((r) => r.asset_id)),
  });
  const list = (all.data ?? []).filter((a) => !appId || !a.app_id || a.app_id === appId);
  const toggle = async (a: Asset) => {
    const on = attached.data?.has(a.id);
    if (on) await supabase.from("brief_assets").delete().eq("brief_id", briefId).eq("asset_id", a.id);
    else await supabase.from("brief_assets").insert({ brief_id: briefId, asset_id: a.id });
    qc.invalidateQueries({ queryKey: ["brief-assets", briefId] });
  };
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground">
        <Paperclip className="h-3 w-3" /> Assets joints ({attached.data?.size ?? 0})
      </h3>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun asset pour cette app. <Link to="/admin/assets" className="font-medium text-accent hover:underline">Ajouter dans Assets →</Link></p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {list.map((a) => {
            const on = !!attached.data?.has(a.id);
            return (
              <button key={a.id} type="button" onClick={() => toggle(a)} title={a.name}
                className={cn("relative overflow-hidden rounded-lg border text-left transition", on ? "border-accent ring-2 ring-accent/30" : "border-border hover:border-border-strong")}>
                <AssetPreview a={a} className="pointer-events-none aspect-square" />
                <p className="truncate px-1.5 py-1 text-[11px] text-muted-foreground">{KIND_LABEL[a.kind]} · {a.name}</p>
                {on && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white"><Check className="h-3 w-3" /></span>}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

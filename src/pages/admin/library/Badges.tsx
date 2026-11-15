import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { Video } from "./types";

export interface Cat { id: string; name: string; color?: string | null }

/** Badge de format cliquable : clic → choisir une autre catégorie (sauvegarde manuelle, l'IA ne l'écrasera plus). */
export function CategoryBadge({ v, cats, size = "sm", onChanged }: { v: Video; cats: Cat[]; size?: "sm" | "md"; onChanged?: (id: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<string | null>(v.category_id);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setValue(v.category_id), [v.id, v.category_id]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const cat = cats.find((c) => c.id === value);
  const pick = async (id: string | null) => {
    setOpen(false);
    setValue(id);
    v.category_id = id; v.category_auto = false;
    await supabase.from("videos").update({ category_id: id, category_auto: false }).eq("id", v.id);
    onChanged?.(id);
  };
  return (
    <div ref={ref} className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={() => setOpen((o) => !o)} title={v.category_auto && cat ? "Format détecté par l'IA : clic pour corriger" : "Changer le format"}
        className={cn("inline-flex items-center gap-1 rounded-full font-medium transition-colors", size === "sm" ? "h-5 px-2 text-[11px]" : "h-7 px-2.5 text-[12px]",
          cat ? "bg-tint-violet text-[#6b2bd9] hover:bg-[#ebe0ff]" : "border border-dashed border-border-strong text-subtle-foreground hover:text-foreground")}>
        {cat ? cat.name : "Non classé"}{v.category_auto && cat && <span className="opacity-60">· IA</span>}<ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-48 overflow-y-auto rounded-xl border bg-white p-1 shadow-lg">
          {cats.map((c) => (
            <button key={c.id} onClick={() => pick(c.id)} className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-muted">
              {c.name}{c.id === value && <Check className="h-3.5 w-3.5 text-accent" />}
            </button>
          ))}
          <button onClick={() => pick(null)} className="mt-1 w-full rounded-lg border-t border-separator px-2.5 py-1.5 text-left text-[13px] text-subtle-foreground hover:bg-muted">Non classé</button>
        </div>
      )}
    </div>
  );
}

export interface AppRef { id: string; name: string }

export function appScore(v: Video, appId: string) {
  return (v.app_scores ?? {})[appId] as undefined | { score: number; reason: string; compatible: boolean; ai_compatible: boolean; manual?: boolean | null };
}

/** « Micabo 92 » : vert si compatible (IA ou correction manuelle), gris sinon. */
export function RelevanceBadge({ v, app, className }: { v: Video; app: AppRef; className?: string }) {
  const s = appScore(v, app.id);
  if (!s) return null;
  const tone = s.manual === false || !s.compatible ? "bg-white/90 text-[#5b6478]" : s.score >= 80 ? "bg-[#12a150] text-white" : "bg-[#e6f6ec] text-[#0b7a3c]";
  return (
    <span title={`${s.reason}${s.manual != null ? " · corrigé à la main" : ""}`}
      className={cn("tabular inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-bold shadow-xs", tone, className)}>
      <Target className="h-3 w-3" />{app.name} {s.manual === false ? "✕" : Math.round(s.score)}
    </span>
  );
}

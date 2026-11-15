import { useEffect, useState } from "react";
import { Hash, Plus, Target, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { CategoryBadge, appScore, type Cat } from "./Badges";
import type { Video } from "./types";

const normTag = (t: string) => t.trim().toLowerCase().replace(/^#/, "").replace(/\s+/g, "-").slice(0, 40);

/** Format, pertinence par app (avec correction manuelle) et tags libres d'une vidéo. Staff uniquement (RLS). */
export function VideoInsights({ v, apps, cats }: { v: Video; apps: { id: string; name: string }[]; cats: Cat[] }) {
  const [, force] = useState(0);
  const [tags, setTags] = useState<string[]>(v.tags ?? []);
  const [draft, setDraft] = useState("");
  useEffect(() => { setTags(v.tags ?? []); setDraft(""); }, [v.id]);

  const saveTags = async (next: string[]) => {
    setTags(next);
    v.tags = next;
    await supabase.from("videos").update({ tags: next }).eq("id", v.id);
  };
  const addTag = () => {
    const t = normTag(draft);
    if (t && !tags.includes(t)) saveTags([...tags, t]);
    setDraft("");
  };
  const setCompat = async (appId: string, value: boolean | null) => {
    const { data } = await supabase.rpc("set_app_compat", { p_video: v.id, p_app: appId, p_compatible: value });
    if (data) { v.app_scores = { ...(v.app_scores ?? {}), [appId]: data }; force((x) => x + 1); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="w-16 text-[11px] uppercase tracking-[0.06em] text-subtle-foreground">Format</span>
        <CategoryBadge v={v} cats={cats} size="md" />
      </div>
      {apps.map((a) => {
        const s = appScore(v, a.id);
        return (
          <div key={a.id} className="rounded-xl bg-[#f6f7fa] p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground"><Target className="h-3.5 w-3.5 text-accent" />Pertinence {a.name}</span>
              <span className={cn("tabular text-sm font-bold", !s ? "text-subtle-foreground" : s.compatible ? "text-[#0b7a3c]" : "text-[#5b6478]")}>{s ? `${Math.round(s.score)}/100` : "non notée"}</span>
            </div>
            {s?.reason && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.reason}</p>}
            <div className="mt-2 flex gap-1" role="group" aria-label={`Compatibilité ${a.name}`}>
              {([[true, "Compatible"], [false, "Pas compatible"], [null, "Auto (IA)"]] as const).map(([val, label]) => {
                const active = (s?.manual ?? null) === val;
                return (
                  <button key={label} onClick={() => setCompat(a.id, val)}
                    className={cn("h-7 flex-1 rounded-lg border text-[11px] font-medium transition-colors",
                      active ? (val === true ? "border-[#b7e4c7] bg-[#e6f6ec] text-[#0b7a3c]" : val === false ? "border-[#ffd1d1] bg-tint-red text-[#c42a2d]" : "border-[#cddcff] bg-accent-soft text-[#0040d6]")
                        : "border-border-strong bg-white text-muted-foreground hover:text-foreground")}>
                    {label}{val === null && s && s.manual == null ? (s.ai_compatible ? " ✓" : " ✕") : ""}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <div>
        <div className="flex flex-wrap items-center gap-1">
          {tags.map((t) => (
            <span key={t} className="inline-flex h-6 items-center gap-1 rounded-full bg-[#f1f3f7] pl-2 pr-1 text-[12px] text-foreground">
              #{t}<button onClick={() => saveTags(tags.filter((x) => x !== t))} aria-label={`Retirer ${t}`} className="rounded-full p-0.5 hover:bg-white"><X className="h-3 w-3" /></button>
            </span>
          ))}
          <form onSubmit={(e) => { e.preventDefault(); addTag(); }} className="inline-flex items-center">
            <Hash className="ml-1 h-3 w-3 text-subtle-foreground" />
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="ajouter un tag" className="h-6 w-28 bg-transparent px-1 text-[12px] outline-none placeholder:text-subtle-foreground" />
            {draft && <button type="submit" aria-label="Ajouter" className="rounded-full p-0.5 text-accent hover:bg-accent-soft"><Plus className="h-3.5 w-3.5" /></button>}
          </form>
        </div>
      </div>
    </div>
  );
}

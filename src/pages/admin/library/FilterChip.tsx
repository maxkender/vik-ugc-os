// Puces de filtre avec menu déroulant (popover léger, sans dépendance).
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Popover ancré sous son déclencheur ; se ferme au clic extérieur ou sur Échap. */
export function Popover({ trigger, children, align = "left", width = 260, open, onOpenChange }: {
  trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode;
  align?: "left" | "right"; width?: number; open?: boolean; onOpenChange?: (v: boolean) => void;
}) {
  const [inner, setInner] = useState(false);
  const isOpen = open ?? inner;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setInner(v));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); window.removeEventListener("keydown", key); };
  }, [isOpen]);
  return (
    <div ref={ref} className="relative inline-flex">
      {trigger(isOpen, () => setOpen(!isOpen))}
      {isOpen && (
        <div style={{ width }} className={cn("absolute top-[calc(100%+6px)] z-40 max-w-[calc(100vw-32px)] rounded-xl border bg-white p-1.5 shadow-[0_16px_40px_-12px_rgba(16,24,40,0.22)]", align === "right" ? "right-0" : "left-0")}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export type Option = { value: string; label: string; hint?: string; icon?: ReactNode };

/** Puce « Libellé ▾ » ; active : « Libellé : valeur × ». Liste d'options avec recherche si elle est longue. */
export function FilterChip({ label, value, options, onChange, icon, searchable }: {
  label: string; value: string; options: Option[]; onChange: (v: string) => void; icon?: ReactNode; searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const current = options.find((o) => o.value === value);
  const shown = useMemo(() => (q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options), [q, options]);
  const active = !!value;
  return (
    <Popover
      trigger={(open, toggle) => (
        <span className={cn("inline-flex h-8 items-center rounded-full border text-[13px] transition-colors",
          active ? "border-[#cddcff] bg-accent-soft text-[#0040d6]" : open ? "border-[#d5d9e2] bg-white text-foreground" : "border-border-strong bg-white text-muted-foreground hover:border-[#d5d9e2] hover:text-foreground")}>
          <button type="button" onClick={toggle} className={cn("inline-flex h-full items-center gap-1.5 pl-3 [&_svg]:h-3.5 [&_svg]:w-3.5", active ? "pr-1" : "pr-2.5")}>
            {icon}
            <span>{label}{active && <span className="font-medium">: {current?.label ?? value}</span>}</span>
            {!active && <ChevronDown className="opacity-60" />}
          </button>
          {active && <button type="button" onClick={() => onChange("")} aria-label={`Retirer ${label}`} className="mr-1.5 rounded-full p-0.5 hover:bg-white/80"><X className="h-3 w-3" /></button>}
        </span>
      )}
    >
      {(close) => (
        <div>
          {(searchable ?? options.length > 8) && (
            <div className="relative mb-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-subtle-foreground" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="h-8 w-full rounded-lg bg-muted pl-8 pr-2 text-[13px] outline-none placeholder:text-subtle-foreground" />
            </div>
          )}
          <div className="max-h-72 overflow-y-auto">
            {shown.length === 0 && <p className="px-2.5 py-2 text-[13px] text-subtle-foreground">Aucun résultat</p>}
            {shown.map((o) => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value === value ? "" : o.value); close(); setQ(""); }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground hover:bg-muted">
                {o.icon && <span className="text-subtle-foreground [&_svg]:h-4 [&_svg]:w-4">{o.icon}</span>}
                <span className="flex-1 truncate">{o.label}</span>
                {o.hint && <span className="text-xs text-subtle-foreground">{o.hint}</span>}
                {o.value === value && <Check className="h-3.5 w-3.5 text-accent" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}

/** Menu de tri compact (aligné à droite). */
export function SortMenu<T extends string>({ value, options, onChange, asc, onToggleDir }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; asc?: boolean; onToggleDir?: () => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <Popover align="right" width={240}
      trigger={(_, toggle) => (
        <button type="button" onClick={toggle} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground">
          <span className="text-subtle-foreground">Trier par</span>
          <span className="font-medium text-foreground">{current?.label ?? value}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      )}
    >
      {(close) => (
        <div>
          {options.map((o) => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); close(); }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-muted">
              <span className="flex-1">{o.label}</span>
              {o.value === value && <Check className="h-3.5 w-3.5 text-accent" />}
            </button>
          ))}
          {onToggleDir && (
            <>
              <div className="my-1 border-t border-separator" />
              <button type="button" onClick={() => { onToggleDir(); close(); }} className="w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-muted-foreground hover:bg-muted">
                Ordre : {asc ? "croissant ↑" : "décroissant ↓"}
              </button>
            </>
          )}
        </div>
      )}
    </Popover>
  );
}

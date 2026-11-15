// Kit UI minimal façon shadcn/ui (Tailwind + variables CSS), sans dépendance Radix.
import { createContext, forwardRef, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronRight, Inbox, Loader2, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow-[0_1px_2px_rgba(0,77,255,0.25)] hover:bg-[#0043e0]",
        secondary: "border border-border-strong bg-white text-foreground shadow-xs hover:bg-muted",
        outline: "border border-border-strong bg-white text-foreground shadow-xs hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
        success: "bg-success text-white shadow-sm hover:bg-success/90",
        subtle: "bg-accent-soft text-accent hover:bg-[#e2eaff]",
        link: "h-auto px-0 text-accent underline-offset-4 hover:underline",
      },
      size: { default: "h-9 px-4", sm: "h-8 px-3 text-[13px]", lg: "h-11 px-6 text-[15px]", icon: "h-9 w-9" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, loading, children, disabled, ...p }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} {...p}>
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
));

const field = "flex w-full rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-foreground placeholder:text-subtle-foreground hover:border-[#d5d9e2] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-50";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, "h-9", className)} {...p} />
));
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-20", className)} {...p} />
));
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(field, "h-9 pr-8", className)} {...p} />
));

export function Label({ children, className, htmlFor }: { children: ReactNode; className?: string; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className={cn("text-xs font-medium text-muted-foreground", className)}>{children}</label>;
}

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", {
  variants: {
    tone: {
      default: "bg-[#f1f3f7] text-muted-foreground",
      accent: "bg-tint-blue text-[#0040d6] dark:text-accent",
      success: "bg-tint-green text-[#0b7a3c]",
      danger: "bg-tint-red text-[#c42a2d]",
      warning: "bg-tint-yellow text-[#8a5a00] dark:text-warning",
      violet: "bg-tint-violet text-[#7a32ef]",
      cyan: "bg-tint-cyan text-[#0077b6]",
      outline: "bg-white text-muted-foreground ring-1 ring-inset ring-border-strong",
    },
  },
  defaultVariants: { tone: "default" },
});
export function Badge({ tone, className, children }: VariantProps<typeof badgeVariants> & { className?: string; children: ReactNode }) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border bg-card p-6 shadow-xs", className)} {...p}>{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-muted-foreground", className)} />;
}

/** État vide explicatif : icône, titre, explication, action facultative. */
export function Empty({ title, children, icon, action, className }: { title: string; children?: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-white px-6 py-14 text-center", className)}>
      <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-tint-blue text-accent">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {children && <div className="max-w-md text-sm text-muted-foreground">{children}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const CRUMB_LABELS: Record<string, string> = {
  admin: "Admin", library: "Bibliothèque", "winning-ads": "Pubs gagnantes", competitors: "Concurrents", agents: "Agents de collecte",
  briefs: "Briefs", recruitment: "Recrutement", candidates: "Candidats", onboarding: "Onboarding", campaigns: "Campagnes Meta",
  creatives: "Créas", posters: "Posteurs", payroll: "Paie", "paid-ads": "Paid Ads", settings: "Réglages", apps: "Apps",
  countries: "Pays & zones", categories: "Catégories", content: "Contenus & aperçus", creators: "Créateurs", assistant: "Assistant posteurs", preview: "Aperçu", emails: "Emails", contracts: "Contrats", integrations: "Intégrations", team: "Équipe",
  creator: "Espace créateur", stats: "Vues", payments: "Paiements", account: "Mon compte",
};
/** Sections sans page propre : le fil d'Ariane les affiche sans lien. */
const CRUMB_NO_LINK = new Set(["/admin/recruitment", "/admin/settings"]);

export type Crumb = { label: string; to?: string };

export function deriveBreadcrumbs(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const out: Crumb[] = [];
  let path = "";
  for (const p of parts) {
    path += `/${p}`;
    const label = CRUMB_LABELS[p];
    if (!label) continue; // identifiants, tokens…
    out.push({ label, to: CRUMB_NO_LINK.has(path) ? undefined : path });
  }
  return out;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="Fil d'Ariane" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-subtle-foreground">
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-1">
            {c.to && !last ? <Link to={c.to} className="hover:text-foreground">{c.label}</Link> : <span className={last ? "font-medium text-foreground" : undefined}>{c.label}</span>}
            {!last && <ChevronRight className="h-3 w-3 opacity-60" />}
          </span>
        );
      })}
    </nav>
  );
}

export function PageHeader({ title, description, actions, breadcrumbs }: { title: string; description?: ReactNode; actions?: ReactNode; breadcrumbs?: Crumb[] | false }) {
  const loc = useLocation();
  const crumbs = breadcrumbs === false ? [] : breadcrumbs ?? deriveBreadcrumbs(loc.pathname);
  return (
    <div className="mb-8">
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-foreground">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Bloc de réglages : titre, description, contenu. */
export function Section({ title, description, children, actions, className }: { title: string; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-xs", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-separator px-6 py-5">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50", checked ? "bg-accent" : "bg-[#dfe3ea]")}>
      <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-4.5" : "translate-x-0.5")} />
    </button>
  );
}

export function Dialog({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0b1530]/20 p-4 backdrop-blur-[2px] sm:p-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn("w-full rounded-2xl border bg-card shadow-[0_24px_48px_-12px_rgba(16,24,40,0.18)]", wide ? "max-w-4xl" : "max-w-lg")}>
        <div className="flex items-center justify-between border-b border-separator px-6 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 rounded-b-2xl border-t border-separator bg-white px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[#0b1530]/15" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-full w-full max-w-2xl flex-col border-l bg-white shadow-[-24px_0_48px_-12px_rgba(16,24,40,0.12)]">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="min-w-0 font-semibold">{title}</div>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="inline-flex rounded-lg bg-[#f1f3f7] p-1">
      {items.map((i) => (
        <button key={i.value} onClick={() => onChange(i.value)}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", value === i.value ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground")}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="tabular mt-2 text-[26px] font-semibold tracking-[-0.02em] text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

// ───────── Toasts ─────────
type Toast = { id: number; text: string; tone: "default" | "success" | "danger" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "default") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={cn("max-w-sm rounded-xl border bg-white px-4 py-3 text-sm shadow-[0_12px_32px_-8px_rgba(16,24,40,0.18)]", t.tone === "success" && "border-success/40", t.tone === "danger" && "border-danger/40 text-danger")}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border bg-card shadow-xs", className)}>
      <table className="w-full border-collapse text-sm [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted [&_tbody_tr:last-child_td]:border-b-0">{children}</table>
    </div>
  );
}
type CellProps = { children?: ReactNode; className?: string; colSpan?: number; num?: boolean; onClick?: () => void; title?: string };
export const Th = ({ children, className, num, onClick, title, colSpan }: CellProps) => (
  <th colSpan={colSpan} title={title} onClick={onClick}
    className={cn("sticky top-0 z-[1] whitespace-nowrap border-b bg-white px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground", num && "text-right", onClick && "cursor-pointer select-none hover:text-foreground", className)}>
    {children}
  </th>
);
export const Td = ({ children, className, colSpan, num, onClick, title }: CellProps) => (
  <td colSpan={colSpan} title={title} onClick={onClick} className={cn("h-[52px] border-b border-separator px-4 py-2 align-middle", num && "tabular text-right", className)}>{children}</td>
);

// ───────── Dashboard ─────────
const TINTS = {
  blue: "bg-tint-blue text-accent",
  violet: "bg-tint-violet text-vik-violet",
  cyan: "bg-tint-cyan text-[#0a95e0]",
  yellow: "bg-tint-yellow text-[#c98a00]",
  red: "bg-tint-red text-vik-red",
  green: "bg-tint-green text-success",
} as const;
export type Tint = keyof typeof TINTS;

/** Pastille d'icône sur fond teinté doux. */
export function IconTile({ icon, tint = "blue", className }: { icon: ReactNode; tint?: Tint; className?: string }) {
  return <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&_svg]:h-[18px] [&_svg]:w-[18px]", TINTS[tint], className)}>{icon}</span>;
}

/** Mini-courbe (SVG pur). */
export function Sparkline({ values, color = "var(--accent)", className, height = 36 }: { values: number[]; color?: string; className?: string; height?: number }) {
  if (values.length < 2) return <div style={{ height }} className={className} />;
  const w = 120, h = height, max = Math.max(...values, 1), min = Math.min(...values, 0);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / (max - min || 1)) * (h - 6)]);
  const line = pts.map((p) => p.join(",")).join(" ");
  const id = `sg${Math.abs(values.reduce((a, b) => a * 31 + b, 7) | 0)}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("w-full", className)} style={{ height }}>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.18" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,${h} ${line} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Carte KPI : libellé, valeur, tendance 7 j (sparkline + %). */
export function KpiCard({ label, value, hint, icon, tint = "blue", series, delta, to }: {
  label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tint?: Tint; series?: number[]; delta?: number | null; to?: string;
}) {
  const color = { blue: "#004dff", violet: "#8c43ff", cyan: "#1fafff", yellow: "#ffbb43", red: "#fe504f", green: "#12a150" }[tint];
  const body = (
    <Card className={cn("flex h-full flex-col gap-3 p-5", to && "transition-shadow hover:shadow-card")}>
      <div className="flex items-center gap-3">
        {icon && <IconTile icon={icon} tint={tint} />}
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="tabular text-[28px] font-semibold leading-none tracking-[-0.02em] text-foreground">{value}</p>
        {delta !== undefined && delta !== null && (
          <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-semibold", delta >= 0 ? "bg-tint-green text-[#0b7a3c]" : "bg-tint-red text-[#c42a2d]")}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(Math.round(delta))} %
          </span>
        )}
      </div>
      {series && <Sparkline values={series} color={color} />}
      {hint && <p className="text-xs text-subtle-foreground">{hint}</p>}
    </Card>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

/** Puce de filtre (barre de filtres). */
export function Chip({ active, children, onClick, onClear, className }: { active?: boolean; children: ReactNode; onClick?: () => void; onClear?: () => void; className?: string }) {
  return (
    <span className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border text-[13px] transition-colors",
      active ? "border-[#cddcff] bg-accent-soft text-[#0040d6]" : "border-border-strong bg-white text-muted-foreground hover:border-[#d5d9e2] hover:text-foreground", className)}>
      <button type="button" onClick={onClick} className="inline-flex h-full items-center gap-1.5 pl-3 pr-3 has-[+button]:pr-0.5">{children}</button>
      {active && onClear && <button type="button" onClick={onClear} aria-label="Retirer le filtre" className="mr-1.5 rounded-full p-0.5 hover:bg-white/70"><X className="h-3 w-3" /></button>}
    </span>
  );
}

/** Pastille de métrique (cartes vidéo, KPI compacts). */
export function MetricPill({ icon, children, tone = "default", className }: { icon?: ReactNode; children: ReactNode; tone?: "default" | "dark" | Tint; className?: string }) {
  const cls = tone === "dark" ? "bg-black/55 text-white backdrop-blur-sm" : tone === "default" ? "bg-[#f1f3f7] text-muted-foreground" : TINTS[tone];
  return <span className={cn("tabular inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold [&_svg]:h-3 [&_svg]:w-3", cls, className)}>{icon}{children}</span>;
}

/** Titre de bloc (cartes du dashboard). */
export function CardTitle({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

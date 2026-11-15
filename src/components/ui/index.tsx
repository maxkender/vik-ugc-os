// Kit UI minimal façon shadcn/ui (Tailwind + variables CSS), sans dépendance Radix.
import { createContext, forwardRef, useCallback, useContext, useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronRight, Inbox, Loader2, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90",
        secondary: "border border-border-strong bg-card text-foreground shadow-sm hover:bg-muted",
        outline: "border border-border-strong bg-card text-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
        success: "bg-success text-white shadow-sm hover:bg-success/90",
        subtle: "bg-muted text-foreground hover:bg-border",
        link: "h-auto px-0 text-accent underline-offset-4 hover:underline",
      },
      size: { default: "h-9 px-3.5", sm: "h-8 px-2.5 text-xs", lg: "h-11 px-5 text-base", icon: "h-9 w-9" },
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

const field = "flex w-full rounded-md border border-border-strong bg-card px-3 py-2 text-sm text-foreground shadow-[0_1px_0_rgba(0,17,62,0.02)] placeholder:text-muted-foreground/80 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-50";
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
  return <label htmlFor={htmlFor} className={cn("text-[13px] font-medium text-foreground", className)}>{children}</label>;
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

const badgeVariants = cva("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", {
  variants: {
    tone: {
      default: "bg-muted text-foreground ring-border",
      accent: "bg-[#004dff]/8 text-[#0036b3] ring-[#004dff]/20 dark:text-accent",
      success: "bg-success/10 text-success ring-success/20",
      danger: "bg-danger/10 text-danger ring-danger/20",
      warning: "bg-[#ffbb43]/20 text-[#8a5a00] ring-[#ffbb43]/40 dark:text-warning",
      violet: "bg-[#8c43ff]/10 text-[#6a22d9] ring-[#8c43ff]/20",
      cyan: "bg-[#1fafff]/12 text-[#00739f] ring-[#1fafff]/25",
      outline: "bg-transparent text-muted-foreground ring-border-strong",
    },
  },
  defaultVariants: { tone: "default" },
});
export function Badge({ tone, className, children }: VariantProps<typeof badgeVariants> & { className?: string; children: ReactNode }) {
  return <span className={cn(badgeVariants({ tone }), className)}>{children}</span>;
}

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border bg-card p-5 shadow-[0_1px_2px_rgba(0,17,62,0.04)]", className)} {...p}>{children}</div>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-muted-foreground", className)} />;
}

/** État vide explicatif : icône, titre, explication, action facultative. */
export function Empty({ title, children, icon, action, className }: { title: string; children?: ReactNode; icon?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface/60 px-6 py-12 text-center", className)}>
      <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-border">{icon ?? <Inbox className="h-5 w-5" />}</div>
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
  countries: "Pays & zones", categories: "Catégories", emails: "Emails", contracts: "Contrats", integrations: "Intégrations", team: "Équipe",
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
    <nav aria-label="Fil d'Ariane" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
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
    <div className="mb-8 border-b pb-6">
      <Breadcrumbs items={crumbs} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-foreground">{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Bloc de réglages : titre, description, contenu. */
export function Section({ title, description, children, actions, className }: { title: string; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card shadow-[0_1px_2px_rgba(0,17,62,0.04)]", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50", checked ? "bg-accent" : "bg-border")}>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#00113e]/30 p-4 backdrop-blur-[2px] sm:p-10" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn("w-full rounded-xl border bg-card shadow-2xl", wide ? "max-w-4xl" : "max-w-lg")}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-muted" aria-label="Fermer"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 rounded-b-xl border-t bg-surface px-5 py-3">{footer}</div>}
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
    <div className="fixed inset-0 z-40 flex justify-end bg-[#00113e]/25" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex h-full w-full max-w-2xl flex-col border-l bg-background shadow-2xl">
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
    <div className="inline-flex rounded-lg border bg-surface p-0.5">
      {items.map((i) => (
        <button key={i.value} onClick={() => onChange(i.value)}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", value === i.value ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground")}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
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
          <div key={t.id} className={cn("max-w-sm rounded-lg border bg-card px-4 py-3 text-sm shadow-lg", t.tone === "success" && "border-success/40", t.tone === "danger" && "border-danger/40 text-danger")}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-lg border bg-card shadow-[0_1px_2px_rgba(0,17,62,0.04)]", className)}>
      <table className="w-full border-collapse text-sm [&_tbody_tr:hover]:bg-muted/60 [&_tbody_tr:last-child_td]:border-b-0">{children}</table>
    </div>
  );
}
type CellProps = { children?: ReactNode; className?: string; colSpan?: number; num?: boolean; onClick?: () => void; title?: string };
export const Th = ({ children, className, num, onClick, title, colSpan }: CellProps) => (
  <th colSpan={colSpan} title={title} onClick={onClick}
    className={cn("sticky top-0 z-[1] whitespace-nowrap border-b bg-surface px-3 py-2.5 text-left text-xs font-medium text-muted-foreground", num && "text-right", onClick && "cursor-pointer select-none hover:text-foreground", className)}>
    {children}
  </th>
);
export const Td = ({ children, className, colSpan, num, onClick, title }: CellProps) => (
  <td colSpan={colSpan} title={title} onClick={onClick} className={cn("border-b px-3 py-2.5 align-middle", num && "tabular text-right", className)}>{children}</td>
);

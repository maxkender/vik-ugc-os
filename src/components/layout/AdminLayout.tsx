import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3, Bot, Clapperboard, Contact, Flame, Home, Image, LayoutGrid, MessageCircle, ListChecks, LogOut, Megaphone, Menu, Moon, Settings, Sun, Trophy, UserPlus, Users, Wallet, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth, type Role } from "@/lib/auth";
import { applyTheme, currentTheme } from "@/lib/theme";
import { Logo } from "@/components/brand/Logo";

type NavItem = { to: string; label: string; icon: any; roles: Role[] };
type NavSection = { title: string; items: NavItem[]; color?: string };

const ALL: Role[] = ["admin", "recruiter", "controller"];
const ADMIN: Role[] = ["admin"];
const RECRUIT: Role[] = ["admin", "recruiter"];
const WATCH: Role[] = ["admin", "recruiter", "controller"];

/** Navigation par sections. Chaque entrée déclare les rôles qui la voient. */
const SECTIONS: NavSection[] = [
  { title: "", items: [
    { to: "/admin", label: "Tableau de bord", icon: Home, roles: ALL },
  ] },
  { title: "Veille", color: "var(--sec-watch)", items: [
    { to: "/admin/library", label: "Bibliothèque", icon: LayoutGrid, roles: WATCH },
    { to: "/admin/competitors", label: "Concurrents", icon: Trophy, roles: WATCH },
    { to: "/admin/winning-ads", label: "Pubs gagnantes", icon: Flame, roles: WATCH },
    { to: "/admin/agents", label: "Agents de collecte", icon: Bot, roles: ADMIN },
  ] },
  { title: "Production", color: "var(--sec-production)", items: [
    { to: "/admin/briefs", label: "Briefs", icon: Clapperboard, roles: ALL },
    { to: "/admin/creators", label: "Créateurs", icon: Contact, roles: ALL },
    { to: "/admin/posters", label: "Posteurs", icon: Users, roles: ALL },
    { to: "/admin/assistant", label: "Assistant posteurs", icon: MessageCircle, roles: RECRUIT },
  ] },
  { title: "Recrutement", color: "var(--sec-recruit)", items: [
    { to: "/admin/recruitment/candidates", label: "Candidats", icon: UserPlus, roles: RECRUIT },
    { to: "/admin/recruitment/onboarding", label: "Onboarding", icon: ListChecks, roles: RECRUIT },
    { to: "/admin/recruitment/campaigns", label: "Campagnes Meta", icon: BarChart3, roles: ADMIN },
    { to: "/admin/recruitment/creatives", label: "Créas", icon: Image, roles: ADMIN },
  ] },
  { title: "Finance", color: "var(--sec-finance)", items: [
    { to: "/admin/payroll", label: "Paie", icon: Wallet, roles: ADMIN },
    { to: "/admin/paid-ads", label: "Paid Ads", icon: Megaphone, roles: ADMIN },
  ] },
];

const SETTINGS: { to: string; label: string }[] = [
  { to: "/admin/settings/content", label: "Contenus & aperçus" },
  { to: "/admin/settings/apps", label: "Apps" },
  { to: "/admin/settings/competitors", label: "Concurrents" },
  { to: "/admin/settings/countries", label: "Pays & zones" },
  { to: "/admin/settings/categories", label: "Catégories" },
  { to: "/admin/settings/emails", label: "Emails" },
  { to: "/admin/settings/contracts", label: "Contrats" },
  { to: "/admin/settings/integrations", label: "Intégrations" },
  { to: "/admin/settings/team", label: "Équipe" },
];

const ROLE_LABEL: Record<Role, string> = { admin: "Admin", recruiter: "Recruteur", controller: "Contrôleur", poster: "Posteur" };

const itemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-[14px] transition-colors",
    isActive ? "bg-accent-soft font-medium text-[#0040d6]" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

function Indicator() {
  return null;
}

export function AdminLayout() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [theme, setTheme] = useState(currentTheme());
  const [open, setOpen] = useState(false);
  const role = (profile?.role ?? "recruiter") as Role;
  const isAdmin = role === "admin";
  useEffect(() => setOpen(false), [loc.pathname]);

  const toggleTheme = () => {
    const t = document.documentElement.classList.contains("dark") ? "light" : "dark";
    applyTheme(t);
    setTheme(t);
  };

  const sidebar = (
    <aside className="glass-strong relative z-10 flex h-full w-[260px] shrink-0 flex-col !rounded-none !border-y-0 !border-l-0">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <Logo className="h-[22px]" />
        <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">UGC OS</span>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-6 pt-3">
        {SECTIONS.map((sec) => {
          const items = sec.items.filter((i) => i.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={sec.title}>
              {sec.title && <p className="mb-1.5 flex items-center gap-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: sec.color }}><i className="h-1.5 w-1.5 rounded-full" style={{ background: sec.color }} />{sec.title}</p>}
              <div className="space-y-0.5">
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.to === "/admin"} className={itemClass} style={({ isActive }) => (isActive && sec.color ? { color: sec.color, background: `color-mix(in oklch, ${sec.color} 10%, white)` } : undefined)}>
                    {({ isActive }) => (
                      <>
                        {isActive && <Indicator />}
                        <i.icon strokeWidth={1.75} className={cn("h-[18px] w-[18px]", isActive ? "" : "text-subtle-foreground group-hover:text-muted-foreground")} style={isActive && sec.color ? { color: sec.color } : undefined} />
                        {i.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
        {isAdmin && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.08em] text-subtle-foreground"><Settings className="h-3 w-3" /> Réglages</p>
            <div className="space-y-0.5">
              {SETTINGS.map((i) => (
                <NavLink key={i.to} to={i.to} className={({ isActive }) => cn(itemClass({ isActive }), "h-8 text-[13px]")}>
                  {({ isActive }) => (<>{isActive && <Indicator />}<span className="pl-[30px]">{i.label}</span></>)}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>
      <div className="border-t border-separator px-4 py-4">
        <div className="mb-2 flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tint-violet text-xs font-semibold uppercase text-vik-violet">
            {(profile?.full_name ?? profile?.email ?? "?").charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground">{profile?.full_name ?? profile?.email}</p>
            <p className="truncate text-[11px] text-subtle-foreground">{ROLE_LABEL[role]}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={toggleTheme} className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/5" title="Thème clair / sombre">
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />} {theme === "dark" ? "Clair" : "Sombre"}
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); nav("/login"); }} className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/5">
            <LogOut className="h-3.5 w-3.5" /> Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="relative flex h-full text-sm">
      <div className="app-backdrop" aria-hidden><i /></div>
      <div className="hidden md:flex">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="relative">{sidebar}
            <button onClick={() => setOpen(false)} className="absolute right-2 top-4 rounded p-1.5 text-muted-foreground hover:bg-muted" aria-label="Fermer le menu"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 bg-[#0b1530]/20" onClick={() => setOpen(false)} />
        </div>
      )}
      <main className="relative z-[1] flex-1 overflow-y-auto">
        <div className="glass-strong sticky top-0 z-30 flex h-14 items-center gap-2 !rounded-none !border-x-0 !border-t-0 px-4 md:hidden">
          <button onClick={() => setOpen(true)} className="rounded p-1.5 hover:bg-muted" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button>
          <Logo className="h-5" />
        </div>
        <div className="mx-auto max-w-[1360px] px-5 py-8 md:px-10 md:py-10"><Outlet /></div>
      </main>
    </div>
  );
}

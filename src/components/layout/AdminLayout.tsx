import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3, Bot, Clapperboard, Flame, Image, LayoutGrid, ListChecks, LogOut, Megaphone, Menu, Moon, Settings, Sun, Trophy, UserPlus, Users, Wallet, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth, type Role } from "@/lib/auth";
import { applyTheme, currentTheme } from "@/lib/theme";
import { Logo } from "@/components/brand/Logo";

type NavItem = { to: string; label: string; icon: any; roles: Role[] };
type NavSection = { title: string; items: NavItem[] };

const ALL: Role[] = ["admin", "recruiter", "controller"];
const ADMIN: Role[] = ["admin"];
const RECRUIT: Role[] = ["admin", "recruiter"];
const WATCH: Role[] = ["admin", "recruiter", "controller"];

/** Navigation par sections. Chaque entrée déclare les rôles qui la voient. */
const SECTIONS: NavSection[] = [
  { title: "Veille", items: [
    { to: "/admin/library", label: "Bibliothèque", icon: LayoutGrid, roles: WATCH },
    { to: "/admin/competitors", label: "Concurrents", icon: Trophy, roles: WATCH },
    { to: "/admin/winning-ads", label: "Pubs gagnantes", icon: Flame, roles: WATCH },
    { to: "/admin/agents", label: "Agents de collecte", icon: Bot, roles: ADMIN },
  ] },
  { title: "Production", items: [
    { to: "/admin/briefs", label: "Briefs", icon: Clapperboard, roles: ALL },
    { to: "/admin/posters", label: "Posteurs", icon: Users, roles: ALL },
  ] },
  { title: "Recrutement", items: [
    { to: "/admin/recruitment/candidates", label: "Candidats", icon: UserPlus, roles: RECRUIT },
    { to: "/admin/recruitment/onboarding", label: "Onboarding", icon: ListChecks, roles: RECRUIT },
    { to: "/admin/recruitment/campaigns", label: "Campagnes Meta", icon: BarChart3, roles: ADMIN },
    { to: "/admin/recruitment/creatives", label: "Créas", icon: Image, roles: ADMIN },
  ] },
  { title: "Finance", items: [
    { to: "/admin/payroll", label: "Paie", icon: Wallet, roles: ADMIN },
    { to: "/admin/paid-ads", label: "Paid Ads", icon: Megaphone, roles: ADMIN },
  ] },
];

const SETTINGS: { to: string; label: string }[] = [
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
    "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
    isActive ? "bg-card font-medium text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/5",
  );

function Indicator() {
  return <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-accent" aria-hidden />;
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
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-surface">
      <div className="flex items-center gap-2 px-5 pb-4 pt-5">
        <Logo className="h-6" />
        <span className="rounded border border-border-strong bg-card px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">UGC OS</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-1">
        {SECTIONS.map((sec) => {
          const items = sec.items.filter((i) => i.roles.includes(role));
          if (!items.length) return null;
          return (
            <div key={sec.title}>
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">{sec.title}</p>
              <div className="space-y-0.5 pl-3">
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} className={itemClass}>
                    {({ isActive }) => (
                      <>
                        {isActive && <Indicator />}
                        <i.icon className={cn("h-4 w-4", isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} />
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
            <p className="mb-1 flex items-center gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80"><Settings className="h-3 w-3" /> Réglages</p>
            <div className="space-y-0.5 pl-3">
              {SETTINGS.map((i) => (
                <NavLink key={i.to} to={i.to} className={({ isActive }) => cn(itemClass({ isActive }), "py-1")}>
                  {({ isActive }) => (<>{isActive && <Indicator />}<span className="pl-[26px]">{i.label}</span></>)}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </nav>
      <div className="border-t px-3 py-3">
        <div className="mb-2 flex items-center gap-2.5 px-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold uppercase text-accent">
            {(profile?.full_name ?? profile?.email ?? "?").charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{profile?.full_name ?? profile?.email}</p>
            <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABEL[role]} · {profile?.email}</p>
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
    <div className="flex h-full bg-background text-sm">
      <div className="hidden md:flex">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="relative">{sidebar}
            <button onClick={() => setOpen(false)} className="absolute right-2 top-4 rounded p-1.5 text-muted-foreground hover:bg-muted" aria-label="Fermer le menu"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 bg-[#00113e]/30" onClick={() => setOpen(false)} />
        </div>
      )}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/90 px-4 py-2.5 backdrop-blur md:hidden">
          <button onClick={() => setOpen(true)} className="rounded p-1.5 hover:bg-muted" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button>
          <Logo className="h-5" />
        </div>
        <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-8 lg:px-10"><Outlet /></div>
      </main>
    </div>
  );
}

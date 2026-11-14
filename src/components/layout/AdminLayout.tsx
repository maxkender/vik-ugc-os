import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bot, Clapperboard, FileText, LayoutGrid, LogOut, Megaphone, Moon, Settings, Sun, Users, Wallet, Image, UserPlus, Flame, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { applyTheme, currentTheme } from "@/lib/theme";
import { Logo } from "@/components/brand/Logo";

type Item = { to: string; label: string; icon: any; admin?: boolean; children?: { to: string; label: string; admin?: boolean }[] };
const NAV: Item[] = [
  { to: "/admin/library", label: "Bibliothèque", icon: LayoutGrid },
  { to: "/admin/winning-ads", label: "Pubs gagnantes", icon: Flame },
  { to: "/admin/agents", label: "Agents de collecte", icon: Bot, admin: true },
  { to: "/admin/briefs", label: "Briefs", icon: Clapperboard },
  { to: "/admin/recruitment", label: "Recrutement", icon: UserPlus, children: [
    { to: "/admin/recruitment/candidates", label: "Candidats" },
    { to: "/admin/recruitment/campaigns", label: "Campagnes Meta", admin: true },
    { to: "/admin/recruitment/creatives", label: "Créas", admin: true },
  ] },
  { to: "/admin/posters", label: "Posteurs", icon: Users },
  { to: "/admin/payroll", label: "Paie", icon: Wallet, admin: true },
  { to: "/admin/paid-ads", label: "Paid Ads", icon: Megaphone, admin: true },
  { to: "/admin/settings", label: "Réglages", icon: Settings, admin: true, children: [
    { to: "/admin/settings/apps", label: "Apps" },
    { to: "/admin/settings/competitors", label: "Concurrents" },
    { to: "/admin/settings/countries", label: "Pays & zones" },
    { to: "/admin/settings/categories", label: "Catégories" },
    { to: "/admin/settings/emails", label: "Emails" },
    { to: "/admin/settings/contracts", label: "Contrats" },
    { to: "/admin/settings/integrations", label: "Intégrations" },
    { to: "/admin/settings/team", label: "Équipe" },
  ] },
];

export function AdminLayout() {
  const { profile } = useAuth();
  const nav = useNavigate();
  const [theme, setTheme] = useState(currentTheme());
  const [open, setOpen] = useState(false);
  const isAdmin = profile?.role === "admin";
  const toggleTheme = () => {
    const t = document.documentElement.classList.contains("dark") ? "light" : "dark";
    applyTheme(t);
    setTheme(t);
  };
  const link = ({ isActive }: { isActive: boolean }) =>
    cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors", isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground");

  const sidebar = (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-card">
      <div className="px-5 py-5">
        <Logo className="h-6" />
        <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">UGC OS</span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.filter((i) => isAdmin || !i.admin).map((i) => (
          <div key={i.to}>
            <NavLink to={i.children ? i.children[0].to : i.to} className={({ isActive }) => link({ isActive: isActive || (!!i.children && location.pathname.startsWith(i.to)) })} onClick={() => setOpen(false)}>
              <i.icon className="h-4 w-4" /> {i.label}
            </NavLink>
            {i.children && location.pathname.startsWith(i.to) && (
              <div className="ml-7 mt-0.5 space-y-0.5 border-l pl-2">
                {i.children.filter((c) => isAdmin || !c.admin).map((c) => (
                  <NavLink key={c.to} to={c.to} className={({ isActive }) => cn("block rounded px-2 py-1.5 text-sm", isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setOpen(false)}>{c.label}</NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 truncate px-2 text-xs text-muted-foreground">{profile?.email} · {profile?.role === "admin" ? "admin" : "recruteur"}</div>
        <div className="flex gap-1">
          <button onClick={toggleTheme} className="flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted" title="Thème">
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />} Thème
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); nav("/login"); }} className="flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted">
            <LogOut className="h-3.5 w-3.5" /> Sortir
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-full">
      <div className="hidden md:flex">{sidebar}</div>
      {open && <div className="fixed inset-0 z-40 flex md:hidden" onClick={() => setOpen(false)}><div onClick={(e) => e.stopPropagation()}>{sidebar}</div><div className="flex-1 bg-black/30" /></div>}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-30 flex items-center border-b bg-background/80 px-4 py-2 backdrop-blur md:hidden">
          <button onClick={() => setOpen(true)} className="rounded p-1.5 hover:bg-muted"><Menu className="h-5 w-5" /></button>
          <Logo className="ml-2 h-5" />
        </div>
        <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-10"><Outlet /></div>
      </main>
    </div>
  );
}
export { FileText, Image };

import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LANGS, uiLangForCountry } from "@/i18n";
import { Logo } from "@/components/brand/Logo";

export default function CreatorLayout() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem("i18nextLng"); } catch { /* ignore */ }
    if (profile?.locale && !stored) i18n.changeLanguage(uiLangForCountry(profile.locale));
  }, [profile?.locale]);

  const tab = ({ isActive }: { isActive: boolean }) =>
    cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", isActive ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground");

  return (
    <div className="min-h-full bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Logo className="h-6" />
          <div className="flex items-center gap-2">
            <select aria-label={t("common.language")} value={i18n.resolvedLanguage} onChange={(e) => i18n.changeLanguage(e.target.value)} className="h-8 rounded-md border bg-card px-2 text-xs">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button onClick={async () => { await supabase.auth.signOut(); nav("/login"); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" title={t("common.logout")} aria-label={t("common.logout")}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-3xl px-4 pb-3">
          <div className="inline-flex rounded-lg bg-muted p-1">
            <NavLink end to="/creator" className={tab}>{t("creator.nav.today")}</NavLink>
            <NavLink to="/creator/stats" className={tab}>{t("creator.nav.stats")}</NavLink>
            <NavLink to="/creator/payments" className={tab}>{t("creator.nav.payments")}</NavLink>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6"><Outlet /></main>
    </div>
  );
}

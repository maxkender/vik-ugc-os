import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AtSign, BarChart3, CalendarCheck, LogOut, MessageSquare, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LANGS, uiLangForCountry } from "@/i18n";
import { Logo } from "@/components/brand/Logo";
import { AssistantBubble } from "@/components/assistant/AssistantBubble";

/** Espace créateur : pensé pour le téléphone (barre d'onglets en bas), onglets en haut sur grand écran. */
export default function CreatorLayout() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    let stored: string | null = null;
    // La langue du profil (celle de la candidature) gagne, sauf si le créateur a choisi lui-même dans le sélecteur.
    // (Le détecteur i18next écrit « i18nextLng » dès le premier chargement : ce n'est pas un choix explicite.)
    try { stored = localStorage.getItem("vik_lang_chosen"); } catch { /* ignore */ }
    if (profile?.locale && !stored) i18n.changeLanguage(uiLangForCountry(profile.locale));
  }, [profile?.locale]);

  // Retours non lus : pastille sur l'onglet « Retours ».
  const unreadQ = useQuery({
    queryKey: ["unread-reviews", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => (await supabase.from("post_reviews").select("id", { count: "exact", head: true }).eq("poster_id", profile!.id).is("seen_at", null)).count ?? 0,
    refetchInterval: 60_000,
  });
  const unread = unreadQ.data ?? 0;
  const tabs: { to: string; end?: boolean; label: string; icon: any; badge?: number }[] = [
    { to: "/creator", end: true, label: t("creator.nav.today"), icon: CalendarCheck },
    { to: "/creator/account", label: t("account.nav"), icon: AtSign },
    { to: "/creator/stats", label: t("creator.nav.stats"), icon: BarChart3 },
    { to: "/creator/feedback", label: t("creator.nav.feedback"), icon: MessageSquare, badge: unread },
    { to: "/creator/payments", label: t("creator.nav.payments"), icon: Wallet },
  ];

  return (
    <div className="min-h-full bg-white">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:h-16">
          <Logo className="h-[22px]" />
          <div className="flex items-center gap-1.5">
            <select aria-label={t("common.language")} value={i18n.resolvedLanguage} onChange={(e) => { try { localStorage.setItem("vik_lang_chosen", e.target.value); } catch { /* ignore */ } i18n.changeLanguage(e.target.value); }}
              className="h-8 cursor-pointer rounded-full border border-border-strong bg-white px-3 text-xs font-medium text-muted-foreground hover:text-foreground focus:outline-none">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button onClick={async () => { await supabase.auth.signOut(); nav("/login"); }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-subtle-foreground hover:bg-muted hover:text-foreground" title={t("common.logout")} aria-label={t("common.logout")}>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {/* Onglets desktop */}
        <nav className="mx-auto hidden max-w-2xl gap-1 px-4 sm:flex">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end}
              className={({ isActive }) => cn("relative inline-flex items-center gap-2 px-3 pb-3 pt-1 text-sm font-medium transition-colors",
                isActive ? "text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-accent" : "text-subtle-foreground hover:text-foreground")}>
              <tab.icon className="h-4 w-4" strokeWidth={1.75} /> {tab.label}
              {!!tab.badge && <span className="tabular rounded-full bg-[#fe504f] px-1.5 text-[10px] font-bold text-white">{tab.badge}</span>}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:pb-16 sm:pt-8"><Outlet /></main>

      {/* Assistant posteurs : bulle flottante au-dessus de la barre d'onglets mobile */}
      <AssistantBubble />

      {/* Barre d'onglets mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end}
              className={({ isActive }) => cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors", isActive ? "text-accent" : "text-subtle-foreground")}>
              {({ isActive }) => (
                <>
                  <span className={cn("inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors", isActive && "bg-accent-soft")}>
                    <span className="relative"><tab.icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2 : 1.75} />
                      {!!tab.badge && <span className="tabular absolute -right-2 -top-1.5 min-w-4 rounded-full bg-[#fe504f] px-1 text-center text-[10px] font-bold leading-4 text-white">{tab.badge}</span>}</span>
                  </span>
                  {tab.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { guideText } from "@/i18n/guide";

export interface OnboardingScreen { key: string; language: string; sort: number; title: string; body: string; button_label: string | null }

/** Écrans d'une langue (repli anglais), triés. */
export function useOnboardingScreens(lang: string) {
  const l = (lang || "en").split("-")[0];
  return useQuery({
    queryKey: ["onboarding-screens", l],
    queryFn: async () => {
      const { data } = await supabase.from("onboarding_screens").select("*").in("language", [l, "en"]).order("sort");
      const rows = (data ?? []) as OnboardingScreen[];
      const mine = rows.filter((r) => r.language === l);
      return mine.length ? mine : rows.filter((r) => r.language === "en");
    },
  });
}

export function useCommunity() {
  return useQuery({
    queryKey: ["community-setting"],
    queryFn: async () => (await supabase.from("settings").select("value").eq("key", "community").maybeSingle()).data?.value as { slack_url?: string } | undefined,
  });
}

/**
 * Onboarding créateur (16/11, Max) : écrans swipables plein écran à la 1re connexion.
 * Dernier bouton → étape warm-up. En aperçu admin, rien n'est enregistré.
 */
export function CreatorOnboarding({ lang, onDone, onRuul, onClose, preview }: {
  lang: string; onDone: () => void; onRuul: () => void; onClose?: () => void; preview?: boolean;
}) {
  const screens = useOnboardingScreens(lang).data ?? [];
  const slack = useCommunity().data?.slack_url ?? "";
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setI(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [screens.length]);
  const go = (n: number) => track.current?.scrollTo({ left: n * (track.current?.clientWidth ?? 0), behavior: "smooth" });
  if (!screens.length) return null;
  const last = screens.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-white" role="dialog" aria-modal="true" data-testid="creator-onboarding">
      <div className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="flex gap-1.5">
          {screens.map((s, n) => <span key={s.key} className={cn("h-1.5 rounded-full transition-all", n === i ? "w-6 bg-accent" : "w-1.5 bg-[#d8dde6]")} />)}
        </div>
        {(preview || onClose) && <button onClick={onClose} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Fermer"><X className="h-5 w-5" /></button>}
      </div>
      <div ref={track} className="flex flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {screens.map((s, n) => (
          <section key={s.key} className="flex w-full shrink-0 snap-center flex-col justify-center px-7 pb-6">
            <p className="tabular text-xs font-semibold uppercase tracking-[0.08em] text-subtle-foreground">{n + 1} / {screens.length}</p>
            <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-foreground">{s.title}</h2>
            <p className="mt-4 whitespace-pre-line text-[17px] leading-relaxed text-muted-foreground">{s.body}</p>
            {s.key === "community" && s.button_label && slack && (
              <a href={slack} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex"><Button variant="secondary" size="lg" className="h-12"><ExternalLink className="h-4 w-4" /> {s.button_label}</Button></a>
            )}
            {s.key === "community" && !slack && preview && <p className="mt-4 rounded-lg bg-tint-yellow px-3 py-2 text-xs text-[#8a5a00]">Aperçu : lien Slack à renseigner dans Réglages → Contenus & aperçus → Onboarding créateur (bouton masqué tant qu'il est vide).</p>}
            {s.key === "ruul" && s.button_label && (
              <span className="mt-6 inline-flex"><Button variant="secondary" size="lg" className="h-12" onClick={onRuul}>{s.button_label}</Button></span>
            )}
          </section>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-separator px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {i > 0 && <Button variant="ghost" size="lg" className="h-12" onClick={() => go(i - 1)}>←</Button>}
        {i < last
          ? <Button size="lg" className="h-12 flex-1" onClick={() => go(i + 1)}>{guideText(lang).next} <ArrowRight className="h-4 w-4" /></Button>
          : <Button size="lg" className="h-12 flex-1" onClick={onDone}>{screens[last].button_label ?? "OK"} <ArrowRight className="h-4 w-4" /></Button>}
      </div>
    </div>,
    document.body,
  );
}

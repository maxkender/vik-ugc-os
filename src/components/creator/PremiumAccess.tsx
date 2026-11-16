import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, Crown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useCreatorIdentity } from "@/pages/creator/shared";

/** Textes de la carte « accès premium » (codes promo Apple), langues de lancement + ES. */
const T: Record<string, { title: string; text: string; activate: string; done: string; doneOk: string; android: string; none: string }> = {
  en: { title: "Your premium access to {{app}}", text: "To film the app demo, you get free premium access. Tap the button on your iPhone: the App Store opens and applies your personal code (single use).", activate: "Activate my access", done: "I've activated it", doneOk: "Premium access activated", android: "iPhone only. On Android? Contact us through the assistant and we'll sort it out.", none: "Your premium access is being prepared: it will appear here soon." },
  fr: { title: "Ton accès premium à {{app}}", text: "Pour filmer la démo de l'app, tu as un accès premium offert. Appuie sur le bouton depuis ton iPhone : l'App Store s'ouvre et applique ton code personnel (à usage unique).", activate: "Activer mon accès", done: "C'est activé", doneOk: "Accès premium activé", android: "iPhone uniquement. Sur Android ? Contacte-nous via l'assistant, on trouve une solution.", none: "Ton accès premium est en préparation : il apparaîtra ici bientôt." },
  es: { title: "Tu acceso premium a {{app}}", text: "Para grabar la demo de la app, tienes acceso premium gratis. Toca el botón desde tu iPhone: se abre el App Store y aplica tu código personal (de un solo uso).", activate: "Activar mi acceso", done: "Ya lo activé", doneOk: "Acceso premium activado", android: "Solo iPhone. ¿Tienes Android? Escríbenos por el asistente y lo resolvemos.", none: "Tu acceso premium se está preparando: aparecerá aquí pronto." },
  de: { title: "Dein Premium-Zugang zu {{app}}", text: "Für das Filmen der App-Demo bekommst du kostenlosen Premium-Zugang. Tippe auf deinem iPhone auf den Button: Der App Store öffnet sich und löst deinen persönlichen Code ein (nur einmal nutzbar).", activate: "Zugang aktivieren", done: "Ist aktiviert", doneOk: "Premium-Zugang aktiviert", android: "Nur für iPhone. Du hast Android? Schreib uns über den Assistenten, wir finden eine Lösung.", none: "Dein Premium-Zugang wird vorbereitet und erscheint bald hier." },
  it: { title: "Il tuo accesso premium a {{app}}", text: "Per filmare la demo dell'app hai un accesso premium gratuito. Tocca il pulsante dal tuo iPhone: si apre l'App Store e applica il tuo codice personale (monouso).", activate: "Attiva il mio accesso", done: "L'ho attivato", doneOk: "Accesso premium attivato", android: "Solo iPhone. Hai Android? Scrivici tramite l'assistente e troviamo una soluzione.", none: "Il tuo accesso premium è in preparazione: apparirà qui a breve." },
};
export const premiumText = (lang?: string) => T[(lang ?? "en").split("-")[0]] ?? T.en;

/** Accès premium à l'app (code promo Apple à usage unique, attribué automatiquement) : bouton de redemption. */
export function PremiumAccess({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const L = premiumText(i18n.resolvedLanguage);
  const me = useCreatorIdentity();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({
    queryKey: ["my-offer-code", me.id],
    enabled: !!me.id && !me.readOnly,
    queryFn: async () => ((await supabase.rpc("poster_offer_code")).data ?? [])[0] as { app_name: string; url: string; status: string } | undefined,
    staleTime: 300_000,
  });
  const c = q.data;
  const title = L.title.replace("{{app}}", c?.app_name ?? "Micabo");
  const redeemed = c?.status === "redeemed";
  return (
    <section id="premium" className={compact ? "rounded-xl border border-[#f1d38a] bg-[#fffaf0] px-4 py-3.5" : "scroll-mt-20 rounded-2xl border border-[#f1d38a] bg-[#fffaf0] p-5 shadow-xs"} data-testid="premium-access">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground"><Crown className="h-4 w-4 text-[#c98a00]" />{title}</p>
      {!c ? <p className="mt-2 text-[13px] text-muted-foreground">{L.none}</p> : (
        <>
          {!compact && <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{L.text}</p>}
          {redeemed ? (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[#0b7a3c]"><Check className="h-4 w-4" />{L.doneOk}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="flex-1"><Button size="lg" className="h-11 w-full"><ExternalLink className="h-4 w-4" /> {L.activate}</Button></a>
              <Button size="lg" variant="secondary" className="h-11" loading={busy} onClick={async () => { setBusy(true); await supabase.rpc("poster_offer_code_redeemed"); setBusy(false); qc.invalidateQueries({ queryKey: ["my-offer-code"] }); }}>{L.done}</Button>
            </div>
          )}
          <p className="mt-2 text-xs text-subtle-foreground">{L.android}</p>
        </>
      )}
    </section>
  );
}

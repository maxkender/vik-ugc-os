import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AtSign, BarChart3, CalendarCheck, Eye, Wallet } from "lucide-react";
import { Badge, Card, Field, PageHeader, Select } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { LANGS } from "@/i18n";
import { cn, flag } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { CreatorViewContext } from "@/pages/creator/shared";
import CreatorToday from "@/pages/creator/Today";
import CreatorAccount from "@/pages/creator/Account";
import CreatorStats from "@/pages/creator/Stats";
import CreatorPayments from "@/pages/creator/Payments";

type Page = "today" | "account" | "stats" | "payments";
const PAGES: { value: Page; label: string; icon: typeof CalendarCheck; C: () => JSX.Element | null }[] = [
  { value: "today", label: "Aujourd'hui", icon: CalendarCheck, C: CreatorToday as any },
  { value: "account", label: "Comptes", icon: AtSign, C: CreatorAccount as any },
  { value: "stats", label: "Stats", icon: BarChart3, C: CreatorStats as any },
  { value: "payments", label: "Paiements", icon: Wallet, C: CreatorPayments as any },
];

/**
 * « Voir comme un posteur » : les vraies pages de l'espace créateur, alimentées par les données d'un posteur choisi,
 * dans un cadre de téléphone. Lecture seule (CreatorViewContext.readOnly) : aucun envoi ni enregistrement possible.
 */
export default function CreatorPreview() {
  const { i18n } = useTranslation();
  const [posterId, setPosterId] = useState<string>("");
  const [page, setPage] = useState<Page>("today");
  const [lang, setLang] = useState(i18n.resolvedLanguage ?? "fr");

  const posters = useQuery({
    queryKey: ["preview-posters"],
    queryFn: async () => (await supabase.from("posters").select("id, display_name, country, status, language, profiles!inner(full_name, is_test)").order("display_name")).data ?? [],
  });
  const list = useMemo(() => {
    const all = (posters.data ?? []) as any[];
    return { test: all.filter((p) => p.profiles?.is_test), real: all.filter((p) => !p.profiles?.is_test) };
  }, [posters.data]);
  useEffect(() => { if (!posterId && posters.data) setPosterId(list.test[0]?.id ?? list.real[0]?.id ?? ""); }, [posters.data]);
  const poster = (posters.data ?? []).find((p: any) => p.id === posterId) as any;

  // Langue de l'aperçu : on la rétablit en quittant la page.
  useEffect(() => {
    const before = i18n.resolvedLanguage;
    return () => { if (before) i18n.changeLanguage(before); };
  }, []);
  useEffect(() => { i18n.changeLanguage(lang); }, [lang]);
  useEffect(() => { if (poster?.language) setLang(LANGS.some((l) => l.code === poster.language) ? poster.language : "en"); }, [poster?.id]);

  const Current = PAGES.find((p) => p.value === page)!.C;

  return (
    <>
      <PageHeader title="Voir comme un posteur" description="L'espace créateur tel qu'un posteur le voit sur son téléphone, avec ses vraies données. Lecture seule." />
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="h-fit space-y-4">
          <Field label="Posteur">
            <Select value={posterId} onChange={(e) => setPosterId(e.target.value)}>
              {list.test.length > 0 && (
                <optgroup label="Posteur fictif (compte de test)">
                  {list.test.map((p: any) => <option key={p.id} value={p.id}>🧪 {p.display_name}</option>)}
                </optgroup>
              )}
              <optgroup label="Posteurs">
                {list.real.map((p: any) => <option key={p.id} value={p.id}>{flag(p.country)} {p.display_name}{p.status !== "active" ? ` (${p.status})` : ""}</option>)}
              </optgroup>
            </Select>
          </Field>
          <Field label="Langue de l'interface">
            <Select value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </Select>
          </Field>
          <div className="space-y-1">
            {PAGES.map((p) => (
              <button key={p.value} onClick={() => setPage(p.value)} className={cn("flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors", page === p.value ? "bg-accent-soft text-[#0040d6]" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <p.icon className="h-4 w-4" /> {p.label}
              </button>
            ))}
          </div>
          {poster && (
            <div className="space-y-1.5 border-t border-separator pt-4 text-xs text-muted-foreground">
              <div className="flex flex-wrap gap-1.5">
                {poster.profiles?.is_test && <Badge tone="violet">Compte de test</Badge>}
                <Badge>{flag(poster.country)} {poster.country}</Badge>
                <Badge tone={poster.status === "active" ? "success" : "default"}>{poster.status}</Badge>
              </div>
              <p className="flex items-center gap-1.5 pt-1"><Eye className="h-3.5 w-3.5" /> Boutons désactivés : rien n'est envoyé ni modifié.</p>
            </div>
          )}
        </Card>

        <div className="flex justify-center">
          {/* Cadre de téléphone */}
          <div className="w-[390px] rounded-[44px] border border-[#d9dce3] bg-[#0f1115] p-3 shadow-[0_24px_60px_-20px_rgba(0,17,62,0.35)]">
            <div className="relative flex h-[780px] flex-col overflow-hidden rounded-[34px] bg-white">
              <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
                <Logo className="h-[18px]" />
                <Badge tone="warning">Aperçu</Badge>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5">
                {posterId ? (
                  <CreatorViewContext.Provider value={{ posterId, fullName: poster?.profiles?.full_name ?? poster?.display_name ?? null, readOnly: true }}>
                    <Current key={`${posterId}-${page}`} />
                  </CreatorViewContext.Provider>
                ) : <p className="py-20 text-center text-sm text-muted-foreground">{posters.isLoading ? "Chargement…" : "Aucun posteur"}</p>}
              </div>
              <nav className="grid shrink-0 grid-cols-4 border-t bg-white/95">
                {PAGES.map((p) => (
                  <button key={p.value} onClick={() => setPage(p.value)} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", page === p.value ? "text-accent" : "text-subtle-foreground")}>
                    <span className={cn("inline-flex h-7 w-12 items-center justify-center rounded-full", page === p.value && "bg-accent-soft")}><p.icon className="h-[19px] w-[19px]" /></span>
                    {p.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

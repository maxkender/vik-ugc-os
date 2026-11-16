import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { Button, Card, PageHeader, Tabs } from "@/components/ui";
import { EmailsTab } from "./content/EmailsTab";
import { ContractTab } from "./content/ContractTab";
import { LandingTab } from "./content/LandingTab";
import { BiosTab } from "./content/BiosTab";
import { OnboardingTab } from "./content/OnboardingTab";

type Tab = "emails" | "contract" | "landing" | "onboarding" | "creator" | "bios";
const TABS: { value: Tab; label: string }[] = [
  { value: "emails", label: "Emails" },
  { value: "contract", label: "Contrat" },
  { value: "landing", label: "Page job" },
  { value: "onboarding", label: "Onboarding créateur" },
  { value: "creator", label: "Espace posteur" },
  { value: "bios", label: "Bios & pseudos" },
];

/** Réglages → Contenus & aperçus : tout ce que voit un créateur, prévisualisable et modifiable au même endroit. */
export default function Content() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.value === params.get("tab"))?.value ?? "emails") as Tab;
  return (
    <>
      <PageHeader title="Contenus & aperçus" description="Tout ce que voit un créateur, de la page job aux paiements : aperçu exact et modification au même endroit." />
      <div className="mb-6"><Tabs value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} items={TABS} /></div>
      {tab === "emails" && <EmailsTab />}
      {tab === "contract" && <ContractTab />}
      {tab === "landing" && <LandingTab />}
      {tab === "bios" && <BiosTab />}
      {tab === "onboarding" && <OnboardingTab />}
      {tab === "creator" && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold">Voir comme un posteur</p>
            <p className="mt-1 text-[13px] text-muted-foreground">L'espace créateur (Aujourd'hui, Comptes, Stats, Paiements) avec les vraies données d'un posteur, en lecture seule.</p>
          </div>
          <Link to="/admin/preview/creator"><Button>Ouvrir l'aperçu <ArrowUpRight className="h-4 w-4" /></Button></Link>
        </Card>
      )}
    </>
  );
}

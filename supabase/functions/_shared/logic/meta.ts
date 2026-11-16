/**
 * Meta Marketing API : construction des objets. GARDE-FOU : tout objet créé
 * l'est en PAUSED ; `assertPaused` est appelé avant chaque POST de création.
 * L'activation passe par `activationAllowed` (admin + budget sous le plafond).
 */
export type MetaStatus = "PAUSED" | "ACTIVE";
import { employmentTargeting } from "./pixel.ts";

export function assertPaused(payload: Record<string, unknown>): void {
  const s = payload.status ?? payload.effective_status;
  if (s !== "PAUSED") throw new Error("Garde-fou Meta : création refusée hors PAUSED");
}

/** Lien de landing avec UTM (pays, langue, campagne, ad set). */
export function landingUrl(base: string, p: { country: string; lang: string; campaign: string; adset?: string; ad?: string }): string {
  const u = new URL(`/join/${p.country.toLowerCase()}`, base);
  u.searchParams.set("lang", p.lang);
  u.searchParams.set("utm_source", "meta");
  u.searchParams.set("utm_medium", "paid_social");
  u.searchParams.set("utm_campaign", p.campaign);
  if (p.adset) u.searchParams.set("utm_content", p.adset);
  if (p.ad) u.searchParams.set("utm_term", p.ad);
  return u.toString();
}

/** Budget Meta en centimes (devise du compte). */
export const toMinor = (amount: number) => Math.round(amount * 100);

export type MetaObjective = "leads" | "traffic";

/** Objectif : OUTCOME_LEADS (événement « Lead » du pixel, sur le site) par défaut ; OUTCOME_TRAFFIC en option. */
export function campaignPayload(name: string, countries: string[] = [], objective: MetaObjective = "leads") {
  const p = {
    name,
    objective: objective === "traffic" ? "OUTCOME_TRAFFIC" : "OUTCOME_LEADS",
    status: "PAUSED" as MetaStatus,
    special_ad_categories: ["EMPLOYMENT"],     // offres d'emploi : catégorie spéciale obligatoire
    special_ad_category_country: countries.map((c) => c.toUpperCase()),
    buying_type: "AUCTION",
    is_adset_budget_sharing_enabled: false,
  };
  assertPaused(p);
  return p;
}

/**
 * Ad set (un pays ou une zone). Catégorie spéciale EMPLOYMENT : ciblage conforme uniquement
 * (pays + langue + Advantage+ audience, 18–65, ni genre, ni intérêts, ni code postal) — voir employmentViolations.
 * Objectif « leads » : optimisation sur la conversion Lead du pixel (site web) ; « traffic » : vues de landing.
 */
export function adsetPayload(p: {
  name: string; campaignId: string; country: string; countries?: string[]; langs?: string[]; dailyBudget: number; employment: boolean;
  beneficiary?: string; objective?: MetaObjective; pixelId?: string | null;
}) {
  // Sans pixel, impossible d'optimiser sur le Lead : repli sur le trafic.
  const objective: MetaObjective = p.objective === "traffic" || !p.pixelId ? "traffic" : "leads";
  const targeting = employmentTargeting(p.countries?.length ? p.countries : [p.country], p.langs ?? []);
  const payload: Record<string, unknown> = {
    name: p.name,
    campaign_id: p.campaignId,
    status: "PAUSED" as MetaStatus,
    daily_budget: toMinor(p.dailyBudget),
    billing_event: "IMPRESSIONS",
    optimization_goal: objective === "leads" ? "OFFSITE_CONVERSIONS" : "LANDING_PAGE_VIEWS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    destination_type: "WEBSITE",
    ...(objective === "leads" ? { promoted_object: { pixel_id: p.pixelId, custom_event_type: "LEAD" } } : {}),
    // DSA (UE) : annonceur et payeur obligatoires sur chaque ad set (vérifié le 14/11).
    dsa_beneficiary: p.beneficiary ?? "Vik Studios",
    dsa_payor: p.beneficiary ?? "Vik Studios",
    targeting,
  };
  assertPaused(payload);
  return payload as typeof payload & { targeting: ReturnType<typeof employmentTargeting>; optimization_goal: string };
}

export function adPayload(p: { name: string; adsetId: string; creativeId: string }) {
  const payload = { name: p.name, adset_id: p.adsetId, creative: { creative_id: p.creativeId }, status: "PAUSED" as MetaStatus };
  assertPaused(payload);
  return payload;
}

export function activationAllowed(p: { isAdmin: boolean; dailyBudget: number; cap: number }): { ok: boolean; reason?: string } {
  if (!p.isAdmin) return { ok: false, reason: "admin_only" };
  if (!(p.cap > 0)) return { ok: false, reason: "no_cap" };
  if (p.dailyBudget > p.cap) return { ok: false, reason: "over_cap" };
  return { ok: true };
}

/** Coût par candidature / par signé, par pays. */
export function costPer(spend: number, count: number): number | null {
  return count > 0 ? Math.round((spend / count) * 100) / 100 : null;
}

// ---------------------------------------------------------------------------
// Checklist de lancement (Campagnes Meta) : « Activer » bloqué tant qu'un prérequis critique est ❌.
// ---------------------------------------------------------------------------
export interface ChecklistInput {
  accountStatus: number | null;          // 1 = actif
  hasFunding: boolean;
  pageOk: boolean;
  pixelId: string | null;
  pixelLastFired: string | null;          // ISO
  pixelShared: boolean;                   // pixel aussi utilisé par un autre site
  capiTestedAt: string | null;            // dernier envoi OK avec test_event_code
  landingOk: boolean;                     // landing https joignable
  domainVerified: boolean;                // case manuelle (Business Manager → Domaines)
  emailsSent: number;                     // emails réellement délivrés par Brevo
  translationsReviewed: boolean;          // case manuelle (globale, ancienne)
  /** Relecture par pays de test : FR/ES par Max, autres langues par un natif (16/11). Prioritaire sur la case globale. */
  translations?: TranslationReview[];
  approvedCreatives: number;
  creativesValidated: boolean;            // case manuelle
  globalCap: number;
  committedBudget: number;
  now?: Date;
}
export interface TranslationReview { country: string; lang: string; reviewer: string; done: boolean }
export interface ChecklistItem { key: string; label: string; ok: boolean; critical: boolean; detail: string; manual?: boolean }

const DAY = 86_400_000;
export function launchChecklist(i: ChecklistInput): ChecklistItem[] {
  const now = (i.now ?? new Date()).getTime();
  const fresh = (iso: string | null, days: number) => !!iso && now - Date.parse(iso) < days * DAY;
  return [
    { key: "account", label: "Compte publicitaire actif", ok: i.accountStatus === 1, critical: true, detail: i.accountStatus === 1 ? "account_status = 1" : `account_status = ${i.accountStatus ?? "?"}` },
    { key: "payment", label: "Moyen de paiement", ok: i.hasFunding, critical: true, detail: i.hasFunding ? "moyen de paiement enregistré" : "aucun moyen de paiement" },
    { key: "page", label: "Page Facebook publiée", ok: i.pageOk, critical: true, detail: i.pageOk ? "page publiée" : "page absente ou non publiée" },
    { key: "pixel", label: "Pixel qui reçoit des événements", ok: !!i.pixelId && fresh(i.pixelLastFired, 7), critical: true,
      detail: !i.pixelId ? "aucun pixel réglé" : i.pixelLastFired ? `dernier événement ${i.pixelLastFired.slice(0, 16).replace("T", " ")}${i.pixelShared ? " (pixel partagé : pas forcément notre site)" : ""}` : "aucun événement reçu" },
    { key: "capi", label: "Conversions API vérifiée", ok: fresh(i.capiTestedAt, 30), critical: true, detail: i.capiTestedAt ? `events_received ≥ 1 le ${i.capiTestedAt.slice(0, 10)}` : "pas encore vérifiée : « Vérifier CAPI » ou code de test" },
    { key: "landing", label: "Landing en ligne (https)", ok: i.landingOk, critical: true, detail: i.landingOk ? "répond 200" : "injoignable ou non https" },
    { key: "domain", label: "Domaine vérifié dans le Business Manager", ok: i.domainVerified, critical: false, manual: true, detail: "case à cocher après vérification" },
    { key: "emails", label: "Emails Brevo testés", ok: i.emailsSent > 0, critical: true, detail: i.emailsSent > 0 ? `${i.emailsSent} email(s) délivré(s)` : "aucun email réellement délivré" },
    i.translations?.length
      ? { key: "translations", label: "Traductions relues (pays de test)", ok: i.translations.every((t) => t.done), critical: false,
        detail: i.translations.every((t) => t.done) ? `${i.translations.length} pays relus`
          : `à relire : ${i.translations.filter((t) => !t.done).map((t) => `${t.country} ${t.lang.toUpperCase()} (${t.reviewer})`).join(", ")}` }
      : { key: "translations", label: "Traductions relues", ok: i.translationsReviewed, critical: false, manual: true, detail: "case à cocher après relecture native" },
    { key: "creatives", label: "Créas validées", ok: i.approvedCreatives > 0 && i.creativesValidated, critical: true, manual: true, detail: `${i.approvedCreatives} créa(s) approuvée(s)${i.creativesValidated ? "" : " · validation finale à cocher"}` },
    { key: "budget", label: "Budget global plafonné", ok: i.globalCap > 0 && i.committedBudget <= i.globalCap, critical: true, detail: `${i.committedBudget} € engagés / plafond ${i.globalCap} €/jour` },
  ];
}
export const blockingItems = (items: ChecklistItem[]) => items.filter((x) => x.critical && !x.ok);

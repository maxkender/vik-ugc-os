/**
 * Meta Marketing API : construction des objets. GARDE-FOU : tout objet créé
 * l'est en PAUSED ; `assertPaused` est appelé avant chaque POST de création.
 * L'activation passe par `activationAllowed` (admin + budget sous le plafond).
 */
export type MetaStatus = "PAUSED" | "ACTIVE";

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

export function campaignPayload(name: string, countries: string[] = []) {
  const p = {
    name,
    objective: "OUTCOME_TRAFFIC",
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
 * Ad set par pays. Catégorie spéciale EMPLOYMENT : Meta interdit le ciblage
 * par âge fin, genre et intérêts détaillés — on stocke 18–25 / étudiants comme
 * intention (targeting_intent) et on n'envoie que pays + âge 18–65 si la
 * catégorie est active. Voir DECISIONS.md.
 */
export function adsetPayload(p: { name: string; campaignId: string; country: string; dailyBudget: number; employment: boolean; ageMin?: number; ageMax?: number; beneficiary?: string }) {
  const targeting: Record<string, unknown> = {
    geo_locations: { countries: [p.country.toUpperCase()] },
    age_min: p.employment ? 18 : Math.max(18, p.ageMin ?? 18),
    age_max: p.employment ? 65 : Math.min(65, p.ageMax ?? 25),
    targeting_automation: { advantage_audience: 0 },
  };
  const payload = {
    name: p.name,
    campaign_id: p.campaignId,
    status: "PAUSED" as MetaStatus,
    daily_budget: toMinor(p.dailyBudget),
    billing_event: "IMPRESSIONS",
    optimization_goal: "LANDING_PAGE_VIEWS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    destination_type: "WEBSITE",
    // DSA (UE) : annonceur et payeur obligatoires sur chaque ad set (vérifié le 14/11).
    dsa_beneficiary: p.beneficiary ?? "Vik Studios",
    dsa_payor: p.beneficiary ?? "Vik Studios",
    targeting,
  };
  assertPaused(payload);
  return payload;
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

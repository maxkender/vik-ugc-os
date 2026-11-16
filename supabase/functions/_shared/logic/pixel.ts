/**
 * Suivi des conversions Meta : Pixel (navigateur) + Conversions API (serveur), dédupliqués par event_id.
 * Et contrôle de conformité des ad sets « EMPLOYMENT » (catégorie spéciale offres d'emploi).
 */

/** Email normalisé avant hachage (règles Meta : minuscules, sans espaces). */
export function normEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e.includes("@") ? e : null;
}

/** Téléphone normalisé : chiffres seuls avec indicatif, sans « + » ni zéros de tête (ex. 33600000001). */
export function normPhone(phone: string | null | undefined): string | null {
  const raw = (phone ?? "").trim();
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  d = d.replace(/\D/g, "");
  return d.length >= 8 ? d : null;
}

/** Cookie _fbc à partir du fbclid de l'URL (format fb.1.<ms>.<fbclid>). */
export function fbcFromFbclid(fbclid: string | null | undefined, nowMs = Date.now()): string | null {
  const id = (fbclid ?? "").trim();
  return id ? `fb.1.${nowMs}.${id}` : null;
}

/** Les valeurs _fbc / _fbp acceptées (sinon ignorées). */
export const validFbc = (v: unknown) => typeof v === "string" && /^fb\.1\.\d{10,13}\.[\w-]{10,500}$/.test(v) ? v : null;
export const validFbp = (v: unknown) => typeof v === "string" && /^fb\.1\.\d{10,13}\.\d{5,25}$/.test(v) ? v : null;
export const validEventId = (v: unknown) => typeof v === "string" && /^[\w-]{8,64}$/.test(v) ? v : null;

export interface CapiLeadInput {
  eventId: string;
  eventTimeSec: number;
  sourceUrl: string | null;
  emailHash: string | null;
  phoneHash: string | null;
  countryHash: string | null;
  fbc: string | null;
  fbp: string | null;
  ip: string | null;
  userAgent: string | null;
  customData?: Record<string, unknown>;
}

/** Événement Lead pour POST /{pixel_id}/events (les hachages SHA-256 sont faits par l'appelant). */
export function capiLeadEvent(p: CapiLeadInput) {
  const user_data: Record<string, unknown> = {};
  if (p.emailHash) user_data.em = [p.emailHash];
  if (p.phoneHash) user_data.ph = [p.phoneHash];
  if (p.countryHash) user_data.country = [p.countryHash];
  if (p.fbc) user_data.fbc = p.fbc;
  if (p.fbp) user_data.fbp = p.fbp;
  if (p.ip) user_data.client_ip_address = p.ip;
  if (p.userAgent) user_data.client_user_agent = p.userAgent;
  return {
    event_name: "Lead",
    event_time: p.eventTimeSec,
    event_id: p.eventId,
    action_source: "website",
    ...(p.sourceUrl ? { event_source_url: p.sourceUrl } : {}),
    user_data,
    custom_data: { content_name: "ugc_creator_application", ...(p.customData ?? {}) },
  };
}

// ---------------------------------------------------------------------------
// Conformité EMPLOYMENT
// ---------------------------------------------------------------------------

/**
 * Règles Meta pour la catégorie spéciale EMPLOYMENT :
 *   - âge 18–65+ sans resserrement (age_min 18, age_max 65) ;
 *   - pas de ciblage par genre ;
 *   - pas de code postal ; rayon ≥ 15 miles (25 km) autour d'une ville ;
 *   - ciblage détaillé limité : pas d'intérêts / comportements / démographie ni d'exclusions, pas d'audiences similaires.
 * Retourne la liste des violations (vide = conforme).
 */
export function employmentViolations(t: Record<string, any>): string[] {
  const v: string[] = [];
  if ((t.age_min ?? 18) !== 18) v.push("age_min doit valoir 18");
  if (t.age_max !== undefined && t.age_max !== 65) v.push("age_max doit valoir 65 (65+)");
  if (Array.isArray(t.genders) && t.genders.length) v.push("ciblage par genre interdit");
  const geo = t.geo_locations ?? {};
  if (Array.isArray(geo.zips) && geo.zips.length) v.push("ciblage par code postal interdit");
  for (const c of geo.cities ?? []) {
    const km = c.distance_unit === "kilometer" ? Number(c.radius) : Number(c.radius) * 1.609;
    if (!(km >= 24.1)) v.push(`rayon ville < 15 miles (${c.key ?? "?"})`);
  }
  for (const k of ["interests", "behaviors", "life_events", "industries", "income", "family_statuses", "education_statuses", "education_schools", "work_employers", "work_positions", "relationship_statuses"]) {
    if (t[k] && (!Array.isArray(t[k]) || t[k].length)) v.push(`ciblage détaillé interdit : ${k}`);
  }
  if (Array.isArray(t.flexible_spec) && t.flexible_spec.length) v.push("ciblage détaillé (flexible_spec) interdit");
  if (t.exclusions && Object.keys(t.exclusions).length) v.push("exclusions interdites");
  for (const a of t.custom_audiences ?? []) if (a?.subtype === "LOOKALIKE" || a?.type === "lookalike") v.push("audience similaire interdite");
  return v;
}

/** Locales Meta (adlocale) par langue, vérifiés le 16/11 via search?type=adlocale (noms natifs). */
export const META_LOCALE_IDS: Record<string, number[]> = {
  fr: [1003], en: [6, 24], es: [23, 7], de: [5], it: [10], pt: [16, 31], nl: [14], pl: [15], sv: [18], da: [4], fi: [8],
  no: [13, 84], nb: [13], cs: [2], sk: [33], hu: [30], ro: [32], bg: [37], hr: [38], sl: [34], el: [39], tr: [19], lt: [40],
  lv: [78], et: [58], ja: [11], ko: [12], ar: [28], he: [29], uk: [52], sr: [42],
};

/** Ciblage d'un ad set EMPLOYMENT conforme : pays + langue(s) + Advantage+ audience, 18–65. */
export function employmentTargeting(countries: string[], langs: string[]) {
  const locales = [...new Set(langs.flatMap((l) => META_LOCALE_IDS[l.toLowerCase().slice(0, 2)] ?? []))];
  return {
    geo_locations: { countries: countries.map((c) => c.toUpperCase()) },
    age_min: 18,
    age_max: 65,
    ...(locales.length ? { locales } : {}),
    targeting_automation: { advantage_audience: 1 },
  };
}

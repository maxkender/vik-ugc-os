/** Zones tarifaires A/B/C et tarifs affichés sur la landing. */
export interface ZoneRow {
  code: string;
  price_per_video: number;
  rpm: number;
  rpm_views: number;
  currency: string;
  videos_per_day: number;
  bonus_cap?: number | null;
  active?: boolean;
}
export interface CountryRow {
  code: string;
  name: string;
  zone_code: string | null;
  language: string;
  open: boolean;
}

export function zoneOfCountry(country: string | null | undefined, countries: CountryRow[], zones: ZoneRow[]): ZoneRow | null {
  if (!country) return null;
  const c = countries.find((x) => x.code === country.toUpperCase());
  if (!c || !c.zone_code) return null;
  return zones.find((z) => z.code === c.zone_code && z.active !== false) ?? null;
}

export function formatMoney(amount: number, currency = "USD", locale = "en"): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** Bonus lisible : « +$1 per 1,000 views ». */
export function rpmLabel(z: ZoneRow, locale = "en"): string {
  return `${formatMoney(z.rpm, z.currency, locale)} / ${new Intl.NumberFormat(locale).format(z.rpm_views)}`;
}

/** Âge en années révolues à une date donnée. */
export function ageOn(birthdate: string, on = new Date()): number {
  const b = new Date(`${birthdate}T12:00:00Z`);
  let age = on.getUTCFullYear() - b.getUTCFullYear();
  const m = on.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && on.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

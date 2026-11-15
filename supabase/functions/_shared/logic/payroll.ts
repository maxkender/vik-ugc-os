import { addDays, DAY_MS, inWeek, isoDay } from "./dates.ts";

/**
 * Paie hebdomadaire d'un posteur.
 *
 * Semaine W (lundi → dimanche, UTC) :
 *   - base : chaque vidéo comptée publiée en W × tarif de zone ;
 *   - bonus : chaque vidéo dont le J+7 (posted_at + 7 j) tombe en W
 *     × vues à J+7 × RPM / rpm_views (1 000 par défaut).
 * Le bonus d'une vidéo publiée en fin de semaine est donc payé la semaine
 * suivante, quand ses vues J+7 sont connues. Rien n'est payé deux fois.
 */
export interface ZoneRate {
  code: string;
  price_per_video: number;
  rpm: number;
  rpm_views: number;
  currency: string;
}

export interface PayAssignment {
  id: string;
  brief_title?: string | null;
  status: "todo" | "posted" | "validated" | "rejected";
  posted_url?: string | null;
  posted_at?: string | null;
  views_d7?: number | null;
}

export interface PayLine {
  assignment_id: string;
  kind: "video" | "bonus";
  label: string;
  url: string | null;
  posted_at: string | null;
  views_d7: number | null;
  amount: number;
  note?: string;
}

export interface Payout {
  week_start: string;
  zone_code: string;
  currency: string;
  videos_count: number;
  base_amount: number;
  bonus_amount: number;
  total: number;
  lines: PayLine[];
}

const money = (x: number) => Math.round(x * 100) / 100;

export interface PayrollOptions {
  /** Statuts comptés pour la base. Par défaut seulement « validated ». */
  countStatuses?: PayAssignment["status"][];
  minViewsForBonus?: number;
}

export function bonusFor(views: number | null | undefined, zone: ZoneRate, minViews = 0): number {
  const v = Math.max(0, views ?? 0);
  if (v < minViews) return 0;
  return money((v * zone.rpm) / Math.max(1, zone.rpm_views));
}

export function computePayout(
  weekStart: string,
  zone: ZoneRate,
  assignments: PayAssignment[],
  opts: PayrollOptions = {},
): Payout {
  const statuses = opts.countStatuses ?? ["validated"];
  const lines: PayLine[] = [];
  for (const a of assignments) {
    if (!a.posted_at || !statuses.includes(a.status)) continue;
    if (inWeek(a.posted_at, weekStart)) {
      lines.push({
        assignment_id: a.id, kind: "video", label: a.brief_title ?? "Video", url: a.posted_url ?? null,
        posted_at: a.posted_at, views_d7: null, amount: money(zone.price_per_video),
      });
    }
    const d7 = isoDay(new Date(new Date(a.posted_at).getTime() + 7 * DAY_MS));
    if (d7 >= weekStart && d7 <= addDays(weekStart, 6)) {
      const measured = a.views_d7 !== null && a.views_d7 !== undefined;
      lines.push({
        assignment_id: a.id, kind: "bonus", label: `Views bonus (D+7) — ${a.brief_title ?? "Video"}`,
        url: a.posted_url ?? null, posted_at: a.posted_at, views_d7: measured ? a.views_d7! : null,
        amount: measured ? bonusFor(a.views_d7, zone, opts.minViewsForBonus ?? 0) : 0,
        note: measured ? undefined : "D+7 views not measured yet",
      });
    }
  }
  lines.sort((x, y) => String(x.posted_at).localeCompare(String(y.posted_at)) || x.kind.localeCompare(y.kind));
  const base = money(lines.filter((l) => l.kind === "video").reduce((s, l) => s + l.amount, 0));
  const bonus = money(lines.filter((l) => l.kind === "bonus").reduce((s, l) => s + l.amount, 0));
  return {
    week_start: weekStart, zone_code: zone.code, currency: zone.currency,
    videos_count: lines.filter((l) => l.kind === "video").length,
    base_amount: base, bonus_amount: bonus, total: money(base + bonus), lines,
  };
}

/** Export CSV de la paie (une ligne par posteur). */
export function payoutsCsv(rows: Array<{ name: string; email: string; ruul_email: string | null; country: string | null; payout: Payout }>): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["week_start", "name", "email", "ruul_email", "country", "zone", "videos", "base", "bonus", "total", "currency"];
  const body = rows.map((r) => [r.payout.week_start, r.name, r.email, r.ruul_email ?? "", r.country ?? "", r.payout.zone_code,
    r.payout.videos_count, r.payout.base_amount.toFixed(2), r.payout.bonus_amount.toFixed(2), r.payout.total.toFixed(2), r.payout.currency].map(esc).join(","));
  return [header.join(","), ...body].join("\n");
}

// ───────────────────────── Paie du lundi (V3) ─────────────────────────

/** Lignes bonus dont les vues J+7 ne sont pas encore relevées. */
export function missingD7(lines: Pick<PayLine, "kind" | "views_d7">[]): number {
  return lines.filter((l) => l.kind === "bonus" && (l.views_d7 === null || l.views_d7 === undefined)).length;
}

/** Total d'un paiement : base + bonus + ajustement manuel, jamais négatif, au centime. */
export function payoutTotal(base: number, bonus: number, adjustment = 0): number {
  return Math.max(0, money(Number(base || 0) + Number(bonus || 0) + Number(adjustment || 0)));
}

export type AdjustmentCheck = { ok: true } | { ok: false; error: "invalid_amount" | "reason_required" | "too_large" | "negative_total" };

/** Un ajustement exige un motif (sauf remise à 0), reste raisonnable et ne rend pas le total négatif. */
export function checkAdjustment(amount: number, reason: string | null | undefined, base: number, bonus: number, maxAbs = 10_000): AdjustmentCheck {
  if (!Number.isFinite(amount)) return { ok: false, error: "invalid_amount" };
  if (Math.abs(amount) > maxAbs) return { ok: false, error: "too_large" };
  if (amount !== 0 && !String(reason ?? "").trim()) return { ok: false, error: "reason_required" };
  if (base + bonus + amount < 0) return { ok: false, error: "negative_total" };
  return { ok: true };
}

export type ReviewStatus = "to_review" | "validated";

/**
 * Peut-on valider ce paiement ? Pas s'il est déjà payé ou annulé, et pas si des vues J+7 manquent
 * (sauf validation forcée explicite, ex. après ajustement manuel).
 */
export function canValidate(p: { status: string; review_status: ReviewStatus; lines: Pick<PayLine, "kind" | "views_d7">[] }, force = false):
  { ok: true } | { ok: false; reason: "already_paid" | "void" | "missing_d7" | "already_validated" } {
  if (p.status === "paid") return { ok: false, reason: "already_paid" };
  if (p.status === "void") return { ok: false, reason: "void" };
  if (p.review_status === "validated") return { ok: false, reason: "already_validated" };
  if (!force && missingD7(p.lines) > 0) return { ok: false, reason: "missing_d7" };
  return { ok: true };
}

/** « 9 Nov 2026 » (référence des virements Ruul). */
export function weekReference(monday: string): string {
  const [y, m, d] = monday.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `Vik UGC week of ${d} ${months[m - 1]} ${y}`;
}

/** CSV pour Ruul : une ligne par créateur à payer (montant > 0). */
export function ruulCsv(rows: Array<{ name: string; ruul_email: string | null; total: number; currency: string; week_start: string }>): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["name", "ruul_email", "amount", "currency", "reference"];
  const body = rows.filter((r) => r.total > 0)
    .map((r) => [r.name, r.ruul_email ?? "", r.total.toFixed(2), r.currency, weekReference(r.week_start)].map(esc).join(","));
  return [header.join(","), ...body].join("\n");
}

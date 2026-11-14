/** Helpers de dates en UTC (AAAA-MM-JJ). La semaine de paie commence le lundi. */
export const DAY_MS = 86_400_000;

export function isoDay(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

/** Lundi (AAAA-MM-JJ) de la semaine qui contient la date. */
export function mondayOf(d: Date | string): string {
  const x = new Date(typeof d === "string" && d.length === 10 ? `${d}T12:00:00Z` : d);
  const dow = x.getUTCDay() || 7; // 1 = lundi … 7 = dimanche
  x.setUTCDate(x.getUTCDate() - (dow - 1));
  return isoDay(x);
}

export function addDays(day: string, n: number): string {
  const x = new Date(`${day}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return isoDay(x);
}

/** La semaine terminée la plus récente (lundi). */
export function lastCompletedWeek(now = new Date()): string {
  return addDays(mondayOf(now), -7);
}

export function inWeek(ts: string | Date | null | undefined, weekStart: string): boolean {
  if (!ts) return false;
  const d = isoDay(ts);
  return d >= weekStart && d <= addDays(weekStart, 6);
}

/** « 9 Nov » */
export function shortWeekLabel(monday: string): string {
  const [, m, j] = monday.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return m && j ? `${j} ${months[m - 1]}` : monday;
}

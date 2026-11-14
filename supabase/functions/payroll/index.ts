// payroll — paie hebdo et parcours Ruul (mode manuel, comme sophia-os).
//   compute { week_start? }        cron (lundi) / admin : calcule la semaine (par défaut la dernière terminée)
//   mark_paid { payout_id }        admin : « Payé sur Ruul » → email « You received X $ for the week of … »
//   csv { week_start }             admin : export CSV
//   ruul_added { poster_id }       admin : « Ajouté sur Ruul » → invitation tout de suite, relances J+1 / J+3
//   ruul_cron                      cron : relances Ruul ; J+5 sans « It's done » → liste « problèmes »
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { appUrl, audit, caller, HttpError, requireAdmin, serve, userId } from "../_shared/http.ts";
import { queueEmail } from "../_shared/outbox.ts";
import { computePayout, payoutsCsv, type Payout } from "../_shared/logic/payroll.ts";
import { addDays, lastCompletedWeek, mondayOf, shortWeekLabel } from "../_shared/logic/dates.ts";
import { ruulStep } from "../_shared/logic/reminders.ts";
import { formatMoney } from "../_shared/logic/zones.ts";

async function compute(db: SupabaseClient, weekStart: string) {
  const { data: zones } = await db.from("zones").select("*");
  const { data: posters } = await db.from("posters").select("id, zone_code, status");
  const from = `${addDays(weekStart, -8)}T00:00:00Z`, to = `${addDays(weekStart, 7)}T00:00:00Z`;
  const { data: assignments } = await db.from("brief_assignments").select("id, poster_id, status, posted_url, posted_at, views_d7, briefs(title)")
    .gte("posted_at", from).lt("posted_at", to);
  const { data: settings } = await db.from("settings").select("value").eq("key", "payroll").maybeSingle();
  const minViews = Number(settings?.value?.min_views_for_bonus ?? 0);
  const { data: paid } = await db.from("payouts").select("poster_id").eq("week_start", weekStart).eq("status", "paid");
  const paidSet = new Set((paid ?? []).map((p) => p.poster_id));
  let n = 0;
  for (const p of posters ?? []) {
    if (paidSet.has(p.id)) continue;
    const zone = zones?.find((z) => z.code === p.zone_code);
    if (!zone) continue;
    const mine = (assignments ?? []).filter((a) => a.poster_id === p.id).map((a: any) => ({ ...a, brief_title: a.briefs?.title }));
    const payout = computePayout(weekStart, { ...zone, price_per_video: Number(zone.price_per_video), rpm: Number(zone.rpm) }, mine, { minViewsForBonus: minViews });
    if (payout.lines.length === 0) continue;
    await db.from("payouts").upsert({
      poster_id: p.id, week_start: weekStart, zone_code: payout.zone_code, currency: payout.currency, videos_count: payout.videos_count,
      base_amount: payout.base_amount, bonus_amount: payout.bonus_amount, total: payout.total, lines: payout.lines,
      status: "pending", computed_at: new Date().toISOString(),
    }, { onConflict: "poster_id,week_start" });
    n++;
  }
  return { ok: true, week_start: weekStart, payouts: n };
}

serve(async (req, body, db) => {
  const c = await caller(req, db);
  requireAdmin(c);
  switch (body.action) {
    case "compute": {
      const week = body.week_start ? mondayOf(String(body.week_start)) : lastCompletedWeek();
      return await compute(db, week);
    }
    case "mark_paid": {
      const { data: p } = await db.from("payouts").select("*, posters(id, ruul_email, display_name, profiles(email, full_name, locale))").eq("id", body.payout_id).single();
      if (!p) throw new HttpError(404, "payout not found");
      if (p.status === "paid") return { ok: true, already: true };
      await db.from("payouts").update({ status: "paid", paid_at: new Date().toISOString(), paid_by: userId(c) }).eq("id", p.id);
      const prof = p.posters?.profiles;
      const cur = p.currency;
      await queueEmail(db, {
        template: "payout_paid", to: prof.email, language: prof.locale,
        vars: {
          first_name: (prof.full_name ?? "").split(" ")[0], total: formatMoney(Number(p.total), cur), week: shortWeekLabel(p.week_start),
          videos: p.videos_count, base: formatMoney(Number(p.base_amount), cur), bonus: formatMoney(Number(p.bonus_amount), cur),
        },
        buttonUrl: appUrl("/creator/payments"), relatedType: "payout", relatedId: p.id,
      });
      await audit(db, userId(c), "payout.paid", "payout", p.id, { total: p.total });
      return { ok: true };
    }
    case "csv": {
      const week = mondayOf(String(body.week_start ?? lastCompletedWeek()));
      const { data } = await db.from("payouts").select("*, posters(ruul_email, country, profiles(email, full_name))").eq("week_start", week).neq("status", "void");
      const csv = payoutsCsv((data ?? []).map((p: any) => ({
        name: p.posters?.profiles?.full_name ?? "", email: p.posters?.profiles?.email ?? "", ruul_email: p.posters?.ruul_email, country: p.posters?.country,
        payout: { ...p, base_amount: Number(p.base_amount), bonus_amount: Number(p.bonus_amount), total: Number(p.total) } as Payout,
      })));
      return { ok: true, week_start: week, csv };
    }
    case "ruul_added": {
      const { data: p } = await db.from("posters").select("id, ruul_email, ruul_status").eq("id", body.poster_id).single();
      if (!p) throw new HttpError(404, "poster not found");
      if (!p.ruul_email) throw new HttpError(409, "ruul_email_missing");
      await db.from("posters").update({ ruul_status: "added", ruul_added_at: new Date().toISOString(), ruul_reminders: 0 }).eq("id", p.id);
      return await ruulCron(db, p.id);
    }
    case "ruul_cron":
      return await ruulCron(db, null);
    default:
      throw new HttpError(400, "unknown action");
  }
});

async function ruulCron(db: SupabaseClient, onlyId: string | null) {
  let q = db.from("posters").select("id, ruul_email, ruul_status, ruul_added_at, ruul_reminders, profiles(email, full_name, locale)").eq("ruul_status", "added");
  if (onlyId) q = q.eq("id", onlyId);
  const { data } = await q;
  const now = new Date();
  const out = { invites: 0, reminders: 0, problems: [] as string[] };
  for (const p of data ?? []) {
    const step = ruulStep({ status: p.ruul_status, added_at: p.ruul_added_at, reminders: p.ruul_reminders }, now);
    if (!step) continue;
    const prof: any = p.profiles;
    if (step === "problem") {
      out.problems.push(p.id);
      await db.from("posters").update({ ruul_reminders: 4 }).eq("id", p.id);
      await audit(db, null, "ruul.problem", "poster", p.id, { reason: "J+5 sans It's done" });
      continue;
    }
    await queueEmail(db, {
      template: step === "invite" ? "ruul_invite" : "ruul_reminder", to: prof.email, language: prof.locale,
      vars: { first_name: (prof.full_name ?? "").split(" ")[0], ruul_email: p.ruul_email },
      buttonUrl: appUrl("/creator/payments"), relatedType: "poster", relatedId: p.id,
    });
    await db.from("posters").update({ ruul_reminders: p.ruul_reminders + 1, ruul_last_reminder_at: now.toISOString() }).eq("id", p.id);
    step === "invite" ? out.invites++ : out.reminders++;
  }
  return { ok: true, ...out };
}

// payroll — paie hebdo et parcours Ruul (mode manuel, comme sophia-os).
//   compute { week_start? }        cron (lundi) / admin : calcule la semaine (par défaut la dernière terminée) ;
//                                  relance le relevé des vues J+7 manquantes ; par cron, envoie le récap aux admins
//   adjust { payout_id, amount, reason }    admin : ajustement manuel (motif obligatoire)
//   validate { payout_id, force? }          admin : « à vérifier » → « validé »
//   validate_all { week_start }             admin : valide tout ce qui est complet (vues J+7 relevées)
//   ruul_csv { week_start }                 admin : CSV pour Ruul (nom, email Ruul, montant, devise, référence)
//   mark_paid { payout_id }        admin : « Payé sur Ruul » → email « You received X $ for the week of … »
//   csv { week_start }             admin : export CSV
//   ruul_added { poster_id }       admin : « Ajouté sur Ruul » → invitation tout de suite, relances J+1 / J+3
//   ruul_cron                      cron : relances Ruul ; J+5 sans « It's done » → liste « problèmes »
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { appUrl, audit, caller, HttpError, requireAdmin, serve, userId } from "../_shared/http.ts";
import { queueEmail } from "../_shared/outbox.ts";
import { canValidate, checkAdjustment, computePayout, missingD7, payoutTotal, payoutsCsv, ruulCsv, type Payout } from "../_shared/logic/payroll.ts";
import { addDays, lastCompletedWeek, mondayOf, shortWeekLabel } from "../_shared/logic/dates.ts";
import { ruulStep } from "../_shared/logic/reminders.ts";
import { formatMoney } from "../_shared/logic/zones.ts";

async function compute(db: SupabaseClient, weekStart: string) {
  const { data: zones } = await db.from("zones").select("*");
  const { data: allPosters } = await db.from("posters").select("id, zone_code, status, profiles(is_test)");
  // Comptes de test exclus de la paie.
  const posters = (allPosters ?? []).filter((p: any) => !p.profiles?.is_test);
  const from = `${addDays(weekStart, -8)}T00:00:00Z`, to = `${addDays(weekStart, 7)}T00:00:00Z`;
  const { data: assignments } = await db.from("brief_assignments").select("id, poster_id, status, posted_url, posted_at, views_d7, briefs(title)")
    .gte("posted_at", from).lt("posted_at", to);
  const { data: settings } = await db.from("settings").select("value").eq("key", "payroll").maybeSingle();
  const minViews = Number(settings?.value?.min_views_for_bonus ?? 0);
  // On ne recalcule jamais une semaine payée ; on garde l'ajustement et la revue des autres.
  const { data: existing } = await db.from("payouts").select("poster_id, status, adjustment, review_status").eq("week_start", weekStart);
  const prev = new Map((existing ?? []).map((p) => [p.poster_id, p]));
  let n = 0, flagged = 0, videos = 0, total = 0;
  for (const p of posters ?? []) {
    const before = prev.get(p.id);
    if (before?.status === "paid") continue;
    const zone = zones?.find((z) => z.code === p.zone_code);
    if (!zone) continue;
    const mine = (assignments ?? []).filter((a) => a.poster_id === p.id).map((a: any) => ({ ...a, brief_title: a.briefs?.title }));
    const payout = computePayout(weekStart, { ...zone, price_per_video: Number(zone.price_per_video), rpm: Number(zone.rpm) }, mine, { minViewsForBonus: minViews });
    if (payout.lines.length === 0) continue;
    const missing = missingD7(payout.lines);
    const adjustment = Number(before?.adjustment ?? 0);
    const sum = payoutTotal(payout.base_amount, payout.bonus_amount, adjustment);
    await db.from("payouts").upsert({
      poster_id: p.id, week_start: weekStart, zone_code: payout.zone_code, currency: payout.currency, videos_count: payout.videos_count,
      base_amount: payout.base_amount, bonus_amount: payout.bonus_amount, adjustment, total: sum, lines: payout.lines,
      missing_d7: missing,
      // Des vues manquent : retour en « à vérifier » même si la ligne avait été validée.
      review_status: missing > 0 ? "to_review" : (before?.review_status ?? "to_review"),
      status: "pending", computed_at: new Date().toISOString(),
    }, { onConflict: "poster_id,week_start" });
    n++; videos += payout.videos_count; total += sum;
    if (missing > 0 || (before?.review_status ?? "to_review") === "to_review") flagged++;
  }
  // Vues J+7 manquantes : on relance le relevé (le prochain calcul les prendra en compte).
  const { count: missingRows } = await db.from("payouts").select("id", { count: "exact", head: true }).eq("week_start", weekStart).gt("missing_d7", 0);
  let measure: unknown = null;
  if ((missingRows ?? 0) > 0) {
    try {
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-secret": Deno.env.get("CRON_SECRET") ?? "" },
        body: JSON.stringify({ action: "measure_due", force: true }),
      });
      measure = await res.json().catch(() => ({ status: res.status }));
    } catch (e) {
      measure = { error: String(e) };
    }
  }
  return { ok: true, week_start: weekStart, payouts: n, videos, total: Math.round(total * 100) / 100, flagged, missing_d7_rows: missingRows ?? 0, measure };
}

/** Récap du lundi : un email (via la file, donc derrière le garde-fou) à chaque admin réel. */
async function sendRecap(db: SupabaseClient, r: { week_start: string; payouts: number; videos: number; total: number; flagged: number }) {
  const { data: admins } = await db.from("profiles").select("email, locale").eq("role", "admin").eq("is_test", false);
  const { data: zone } = await db.from("zones").select("currency").limit(1).maybeSingle();
  for (const a of admins ?? []) {
    await queueEmail(db, {
      template: "payroll_recap", to: a.email, language: a.locale === "en" ? "en" : "fr",
      vars: { week: shortWeekLabel(r.week_start), total: formatMoney(r.total, zone?.currency ?? "USD"), creators: r.payouts, videos: r.videos, flagged: r.flagged },
      buttonUrl: appUrl("/admin/payroll"), relatedType: "payroll",
    });
  }
  return admins?.length ?? 0;
}

serve(async (req, body, db) => {
  const c = await caller(req, db);
  requireAdmin(c);
  switch (body.action) {
    case "compute": {
      const week = body.week_start ? mondayOf(String(body.week_start)) : lastCompletedWeek();
      const r = await compute(db, week);
      // Le cron du lundi envoie le récap ; un calcul manuel non (sauf recap: true).
      const recap = (c.kind === "cron" || body.recap === true) && r.payouts > 0 ? await sendRecap(db, r) : 0;
      return { ...r, recap_sent_to: recap };
    }
    case "adjust": {
      if (c.kind !== "user") throw new HttpError(403, "ajustement manuel uniquement");
      const { data: p } = await db.from("payouts").select("*").eq("id", body.payout_id).single();
      if (!p) throw new HttpError(404, "payout not found");
      if (p.status === "paid") throw new HttpError(409, "déjà payé");
      const amount = Math.round(Number(body.amount) * 100) / 100;
      const check = checkAdjustment(amount, body.reason, Number(p.base_amount), Number(p.bonus_amount));
      if (!check.ok) throw new HttpError(422, check.error);
      const total = payoutTotal(Number(p.base_amount), Number(p.bonus_amount), amount);
      await db.from("payouts").update({ adjustment: amount, adjustment_reason: amount === 0 ? null : String(body.reason).trim(), total, review_status: "to_review", validated_at: null, validated_by: null }).eq("id", p.id);
      await audit(db, userId(c), "payout.adjust", "payout", p.id, { amount, reason: body.reason });
      return { ok: true, total };
    }
    case "validate": {
      if (c.kind !== "user") throw new HttpError(403, "validation manuelle uniquement");
      const { data: p } = await db.from("payouts").select("*").eq("id", body.payout_id).single();
      if (!p) throw new HttpError(404, "payout not found");
      const ok = canValidate({ status: p.status, review_status: p.review_status, lines: p.lines ?? [] }, body.force === true);
      if (!ok.ok) throw new HttpError(409, ok.reason);
      await db.from("payouts").update({ review_status: "validated", validated_at: new Date().toISOString(), validated_by: userId(c) }).eq("id", p.id);
      await audit(db, userId(c), "payout.validate", "payout", p.id, { forced: body.force === true });
      return { ok: true };
    }
    case "validate_all": {
      if (c.kind !== "user") throw new HttpError(403, "validation manuelle uniquement");
      const week = mondayOf(String(body.week_start ?? lastCompletedWeek()));
      const { data: rows } = await db.from("payouts").select("id, status, review_status, lines").eq("week_start", week).eq("review_status", "to_review");
      let validated = 0, skipped = 0;
      for (const p of rows ?? []) {
        if (!canValidate({ status: p.status, review_status: p.review_status, lines: p.lines ?? [] }).ok) { skipped++; continue; }
        await db.from("payouts").update({ review_status: "validated", validated_at: new Date().toISOString(), validated_by: userId(c) }).eq("id", p.id);
        validated++;
      }
      await audit(db, userId(c), "payout.validate_all", "payouts", week, { validated, skipped });
      return { ok: true, validated, skipped };
    }
    case "ruul_csv": {
      const week = mondayOf(String(body.week_start ?? lastCompletedWeek()));
      const { data } = await db.from("payouts").select("total, currency, week_start, status, review_status, posters(ruul_email, display_name, profiles(full_name))")
        .eq("week_start", week).neq("status", "void");
      const rows = (data ?? []).filter((p: any) => p.review_status === "validated" || p.status === "paid").map((p: any) => ({
        name: p.posters?.profiles?.full_name ?? p.posters?.display_name ?? "", ruul_email: p.posters?.ruul_email ?? null,
        total: Number(p.total), currency: p.currency, week_start: p.week_start,
      }));
      return { ok: true, week_start: week, rows: rows.length, csv: ruulCsv(rows) };
    }
    case "mark_paid": {
      const { data: p } = await db.from("payouts").select("*, posters(id, ruul_email, display_name, profiles(email, full_name, locale))").eq("id", body.payout_id).single();
      if (!p) throw new HttpError(404, "payout not found");
      if (p.status === "paid") return { ok: true, already: true };
      if (p.review_status !== "validated") throw new HttpError(409, "à valider avant de marquer payé");
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

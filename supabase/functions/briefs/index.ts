// briefs — création / assignation des briefs et répartition sur la file du jour.
//   create { title, instructions?, hook?, app_id?, video_id?, language?, target_countries?, poster_ids?, pool_id?, quantity?, due_date?, origin? }
//   dispatch { date? }                        cron (chaque matin) / admin
//   review { assignment_id, verdict: validated|changes_requested|rejected, comment?, checks?, timestamps? }   staff (admin / contrôleur)
//          → statut de l'assignation, ligne post_reviews, email « post_feedback » dans la langue du posteur.
//          (compatibilité : status + reason)
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { audit, caller, getSetting, HttpError, requireAdmin, requireStaff, serve, userId } from "../_shared/http.ts";
import { dispatchBriefs } from "../_shared/logic/dispatch.ts";
import { isoDay } from "../_shared/logic/dates.ts";
import { appUrl } from "../_shared/http.ts";
import { queueEmail } from "../_shared/outbox.ts";
import { feedbackEmailVars, parseTimestamp, REVIEW_CHECKS, type Verdict } from "../_shared/logic/review.ts";

async function dispatch(db: SupabaseClient, day: string) {
  const cfg = await getSetting(db, "briefs");
  const { data: posters } = await db.from("posters").select("id, country, language, daily_quota").eq("status", "active");
  const { data: today } = await db.from("brief_assignments").select("poster_id").eq("due_date", day);
  const { data: totals } = await db.from("brief_assignments").select("poster_id").gte("due_date", isoDay(new Date(Date.now() - 30 * 86_400_000)));
  const count = (rows: any[] | null, id: string) => (rows ?? []).filter((r) => r.poster_id === id).length;
  const perDay = Number(cfg.per_day ?? 1);
  const dp = (posters ?? []).map((p) => ({
    id: p.id, country: p.country, language: p.language, daily_quota: p.daily_quota ?? perDay,
    assigned_today: count(today, p.id), total_assigned: count(totals, p.id),
  }));
  const { data: briefs } = await db.from("briefs").select("id, created_at, pool_id, quantity, target_countries, language, brief_assignments(poster_id)")
    .eq("status", "active").not("pool_id", "is", null);
  const { data: members } = await db.from("pool_members").select("pool_id, poster_id");
  const db2 = (briefs ?? []).map((b: any) => {
    const assigned = (b.brief_assignments ?? []).map((x: any) => x.poster_id);
    return {
      id: b.id, created_at: b.created_at, target_countries: b.target_countries ?? [], language: b.language,
      member_ids: (members ?? []).filter((m) => m.pool_id === b.pool_id).map((m) => m.poster_id),
      remaining: Math.max(0, b.quantity - assigned.length), already_assigned: assigned,
    };
  }).filter((b) => b.remaining > 0);
  const out = dispatchBriefs(dp, db2, day);
  if (out.length) {
    const { error } = await db.from("brief_assignments").insert(out);
    if (error) throw error;
  }
  return { ok: true, date: day, assigned: out.length };
}

serve(async (req, body, db) => {
  const c = await caller(req, db);
  switch (body.action) {
    case "create": {
      requireStaff(c);
      const title = String(body.title ?? "").trim();
      if (!title) throw new HttpError(400, "title");
      const posterIds: string[] = Array.isArray(body.poster_ids) ? body.poster_ids : [];
      const { data: b, error } = await db.from("briefs").insert({
        title, instructions: body.instructions ?? null, hook: body.hook ?? null, app_id: body.app_id ?? null,
        reference_video_id: body.video_id ?? null, language: body.language || null,
        target_countries: Array.isArray(body.target_countries) ? body.target_countries : [],
        pool_id: body.pool_id ?? null, quantity: Math.max(1, Number(body.quantity ?? posterIds.length ?? 1)),
        origin: ["library", "ad", "manual"].includes(body.origin) ? body.origin : "library", created_by: userId(c),
      }).select("id").single();
      if (error) throw error;
      const due = body.due_date ?? isoDay(new Date());
      if (posterIds.length) {
        const { error: e2 } = await db.from("brief_assignments").insert(posterIds.map((p) => ({ brief_id: b.id, poster_id: p, due_date: due })));
        if (e2) throw e2;
      }
      let dispatched = null;
      if (body.pool_id && body.dispatch_now !== false) dispatched = await dispatch(db, due);
      await audit(db, userId(c), "brief.create", "brief", b.id, { posters: posterIds.length, pool: body.pool_id ?? null });
      return { ok: true, brief_id: b.id, assigned: posterIds.length, dispatched };
    }
    case "dispatch": {
      requireAdmin(c);
      return await dispatch(db, body.date ?? isoDay(new Date()));
    }
    case "review": {
      requireStaff(c);
      const verdict = String(body.verdict ?? body.status) as Verdict;
      if (!["validated", "changes_requested", "rejected"].includes(verdict)) throw new HttpError(400, "verdict");
      const comment = String(body.comment ?? body.reason ?? "").trim().slice(0, 2000);
      if (verdict !== "validated" && !comment) throw new HttpError(422, "Un commentaire est obligatoire pour « À corriger » et « Refusé »");
      const checks = (Array.isArray(body.checks) ? body.checks : []).filter((x: string) => (REVIEW_CHECKS as readonly string[]).includes(x));
      const timestamps = (Array.isArray(body.timestamps) ? body.timestamps : [])
        .map((t: any) => ({ t: String(t?.t ?? "").trim().slice(0, 8), note: String(t?.note ?? "").trim().slice(0, 300) }))
        .filter((t: any) => parseTimestamp(t.t) !== null).slice(0, 20);
      const { data: a } = await db.from("brief_assignments").select("id, poster_id, posted_url, briefs(title)").eq("id", body.assignment_id).single();
      if (!a) throw new HttpError(404, "assignment not found");
      const { error } = await db.from("brief_assignments").update({
        status: verdict, validated_at: verdict === "validated" ? new Date().toISOString() : null,
        rejection_reason: verdict === "validated" ? null : comment,
      }).eq("id", a.id);
      if (error) throw error;
      const { data: rv } = await db.from("post_reviews").insert({
        assignment_id: a.id, poster_id: a.poster_id, reviewer_id: userId(c), verdict, comment: comment || null, checks, timestamps, posted_url: a.posted_url,
      }).select("id").single();
      // Notification email (et in-app via post_reviews non lus) : toujours, sauf « validé » sans commentaire.
      if (verdict !== "validated" || comment) {
        const { data: p } = await db.from("profiles").select("email, full_name, locale, posters(language)").eq("id", a.poster_id).maybeSingle();
        if (p?.email) {
          const language = (p as any).posters?.language ?? p.locale ?? "en";
          await queueEmail(db, {
            template: "post_feedback", to: p.email, language,
            vars: feedbackEmailVars({ firstName: String(p.full_name ?? "").split(" ")[0], briefTitle: (a as any).briefs?.title ?? "", verdict, comment, checks, timestamps, language }),
            buttonUrl: appUrl("/creator/feedback"), relatedType: "post_review", relatedId: rv?.id ?? null,
          });
        }
      }
      await audit(db, userId(c), `post.${verdict}`, "brief_assignment", a.id, { checks });
      return { ok: true, review_id: rv?.id };
    }
    default:
      throw new HttpError(400, "unknown action");
  }
});

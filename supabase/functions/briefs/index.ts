// briefs — création / assignation des briefs et répartition sur la file du jour.
//   create { title, instructions?, hook?, app_id?, video_id?, language?, target_countries?, poster_ids?, pool_id?, quantity?, due_date?, origin? }
//   dispatch { date? }                        cron (chaque matin) / admin
//   review { assignment_id, status: validated|rejected, reason? }   staff
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { audit, caller, getSetting, HttpError, requireAdmin, requireStaff, serve, userId } from "../_shared/http.ts";
import { dispatchBriefs } from "../_shared/logic/dispatch.ts";
import { isoDay } from "../_shared/logic/dates.ts";

async function dispatch(db: SupabaseClient, day: string) {
  const cfg = await getSetting(db, "briefs");
  const { data: posters } = await db.from("posters").select("id, country, language, daily_quota").eq("status", "active");
  const { data: today } = await db.from("brief_assignments").select("poster_id").eq("due_date", day);
  const { data: totals } = await db.from("brief_assignments").select("poster_id").gte("due_date", isoDay(new Date(Date.now() - 30 * 86_400_000)));
  const count = (rows: any[] | null, id: string) => (rows ?? []).filter((r) => r.poster_id === id).length;
  const perDay = Number(cfg.per_day ?? 2);
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
      const status = String(body.status);
      if (!["validated", "rejected", "posted"].includes(status)) throw new HttpError(400, "status");
      const { error } = await db.from("brief_assignments").update({
        status, validated_at: status === "validated" ? new Date().toISOString() : null,
        rejection_reason: status === "rejected" ? String(body.reason ?? "") : null,
      }).eq("id", body.assignment_id);
      if (error) throw error;
      return { ok: true };
    }
    default:
      throw new HttpError(400, "unknown action");
  }
});

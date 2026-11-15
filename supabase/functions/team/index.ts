// team — équipe et rôles (admin uniquement).
//   list                                   profils + dernière connexion
//   invite { email, role, countries? }     invitation Supabase Auth (email envoyé par Supabase, pas par Brevo)
//   set_role { user_id, role, countries? } change le rôle (admin | recruiter | controller | poster)
//   remove { user_id }                     retire l'accès : redevient posteur s'il a une fiche posteur, sinon compte supprimé
// Garde-fous : jamais se retirer soi-même, jamais retirer le dernier admin.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { appUrl, audit, caller, HttpError, requireAdmin, serve, userId } from "../_shared/http.ts";

const ROLES = ["admin", "recruiter", "controller", "poster"] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function adminCount(db: SupabaseClient) {
  const { count } = await db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return count ?? 0;
}

async function guardDemotion(db: SupabaseClient, me: string | null, target: string, newRole: string | null) {
  const { data: p } = await db.from("profiles").select("role").eq("id", target).maybeSingle();
  if (!p) throw new HttpError(404, "user not found");
  if (p.role === "admin" && newRole !== "admin") {
    if (target === me) throw new HttpError(409, "Vous ne pouvez pas retirer votre propre rôle admin.");
    if ((await adminCount(db)) <= 1) throw new HttpError(409, "Impossible : c'est le dernier admin.");
  }
  return p.role as string;
}

serve(async (req, body, db) => {
  const c = await caller(req, db);
  requireAdmin(c, false);
  const me = userId(c);
  switch (body.action) {
    case "list": {
      const { data: profiles } = await db.from("profiles").select("*").order("created_at");
      const last = new Map<string, string | null>();
      for (let page = 1; page <= 10; page++) {
        const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 });
        for (const u of data?.users ?? []) last.set(u.id, u.last_sign_in_at ?? null);
        if (!data || data.users.length < 1000) break;
      }
      return { ok: true, users: (profiles ?? []).map((p) => ({ ...p, last_sign_in_at: last.get(p.id) ?? null })) };
    }
    case "invite": {
      const email = String(body.email ?? "").trim().toLowerCase();
      const role = String(body.role ?? "");
      if (!EMAIL_RE.test(email)) throw new HttpError(400, "email invalide");
      if (!["admin", "recruiter", "controller"].includes(role)) throw new HttpError(400, "rôle invalide");
      const countries = Array.isArray(body.countries) ? body.countries.map((x: string) => String(x).toUpperCase()).filter((x: string) => /^[A-Z]{2}$/.test(x)) : [];
      const { data: existing } = await db.from("profiles").select("id, role").ilike("email", email).maybeSingle();
      let id = existing?.id as string | undefined;
      if (!id) {
        const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: appUrl("/login"), data: { invited_role: role } });
        if (error) throw new HttpError(400, `invitation : ${error.message}`);
        id = data.user.id;
      }
      await db.from("profiles").update({ role, recruiter_countries: role === "recruiter" ? countries : [] }).eq("id", id);
      await audit(db, me, "team.invite", "profile", id, { email, role, existed: !!existing });
      return { ok: true, user_id: id, existed: !!existing };
    }
    case "set_role": {
      const role = String(body.role ?? "");
      if (!(ROLES as readonly string[]).includes(role)) throw new HttpError(400, "rôle invalide");
      const target = String(body.user_id ?? "");
      await guardDemotion(db, me, target, role);
      const patch: Record<string, unknown> = { role };
      if (Array.isArray(body.countries)) patch.recruiter_countries = role === "recruiter" ? body.countries : [];
      else if (role !== "recruiter") patch.recruiter_countries = [];
      const { error } = await db.from("profiles").update(patch).eq("id", target);
      if (error) throw error;
      await audit(db, me, "team.set_role", "profile", target, patch);
      return { ok: true };
    }
    case "remove": {
      const target = String(body.user_id ?? "");
      if (target === me) throw new HttpError(409, "Vous ne pouvez pas vous retirer vous-même.");
      await guardDemotion(db, me, target, null);
      const { data: poster } = await db.from("posters").select("id").eq("id", target).maybeSingle();
      if (poster) {
        await db.from("profiles").update({ role: "poster", recruiter_countries: [] }).eq("id", target);
        await audit(db, me, "team.remove", "profile", target, { kept_as_poster: true });
        return { ok: true, kept_as_poster: true };
      }
      const { error } = await db.auth.admin.deleteUser(target);
      if (error) throw new HttpError(400, error.message);
      await audit(db, me, "team.remove", "profile", target, { deleted: true });
      return { ok: true, deleted: true };
    }
    default:
      throw new HttpError(400, "unknown action");
  }
});

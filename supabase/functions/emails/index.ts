// emails — file d'envoi (email_outbox) et lecture de l'état Brevo.
//   process            cron/admin : envoie ce qui est dû (garde-fou : mode test → admin de test ; sans expéditeur → rien)
//   brevo_check        admin : lecture seule (compte, expéditeurs, templates) pour Réglages → Emails
//   requeue { id? }    admin : remet en file les emails « held » (après changement des réglages)
//   cancel { id }      admin
import { caller, getSetting, HttpError, requireAdmin, serve } from "../_shared/http.ts";
import { processOutbox } from "../_shared/outbox.ts";
import { routeEmail } from "../_shared/logic/emailGuard.ts";

async function brevo(path: string) {
  const key = Deno.env.get("BREVO_API_KEY");
  if (!key) return { ok: false, error: "BREVO_API_KEY missing" };
  const res = await fetch(`https://api.brevo.com/v3${path}`, { headers: { "api-key": key, accept: "application/json" } });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

serve(async (req, body, db) => {
  const c = await caller(req, db);
  requireAdmin(c);
  switch (body.action) {
    case "process": {
      const s = await getSetting(db, "email");
      // Les emails « held » repartent si les réglages le permettent désormais.
      if (routeEmail("probe@example.com", s as any).send) {
        await db.from("email_outbox").update({ status: "queued", hold_reason: null }).eq("status", "held");
      }
      return { ok: true, ...(await processOutbox(db, Number(body.limit ?? 50))) };
    }
    case "brevo_check": {
      const [account, senders, templates] = await Promise.all([brevo("/account"), brevo("/senders"), brevo("/smtp/templates?limit=20&offset=0")]);
      return {
        ok: account.ok,
        account: account.ok ? { email: account.data?.email, company: account.data?.companyName, plan: account.data?.plan } : account,
        senders: senders.ok ? (senders.data?.senders ?? []).map((s: any) => ({ id: s.id, name: s.name, email: s.email, active: s.active })) : [],
        templates: templates.ok ? (templates.data?.templates ?? []).map((t: any) => ({ id: t.id, name: t.name, active: t.isActive })) : [],
      };
    }
    case "requeue": {
      let q = db.from("email_outbox").update({ status: "queued", hold_reason: null, send_after: new Date().toISOString() }).in("status", ["held", "failed"]);
      if (body.id) q = q.eq("id", body.id);
      const { error } = await q;
      if (error) throw error;
      return { ok: true };
    }
    case "cancel":
      await db.from("email_outbox").update({ status: "cancelled" }).eq("id", body.id).neq("status", "sent");
      return { ok: true };
    default:
      throw new HttpError(400, "unknown action");
  }
});

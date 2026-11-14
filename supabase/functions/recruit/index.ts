// recruit — décisions sur les candidatures et relances de signature.
//   decide { application_id, decision: accept|reject|review|new, notes? }   staff (recruteur : ses pays)
//   resend_contract { application_id }                                     staff
//   cron                                                                  cron : relances J+1/J+3/J+6, expiration J+7, refus différés
import { appUrl, audit, caller, getSetting, HttpError, requireAdmin, requireStaff, serve, userId } from "../_shared/http.ts";
import { queueEmail } from "../_shared/outbox.ts";
import { createContract } from "../_shared/contracts.ts";
import { signatureStep } from "../_shared/logic/reminders.ts";

serve(async (req, body, db) => {
  const c = await caller(req, db);
  switch (body.action) {
    case "decide": {
      requireStaff(c);
      const { data: a } = await db.from("applications").select("*").eq("id", body.application_id).single();
      if (!a) throw new HttpError(404, "application not found");
      if (c.kind === "user" && c.role === "recruiter" && !c.countries.includes(a.country)) throw new HttpError(403, "country_not_assigned");
      const decision = String(body.decision);
      const patch: Record<string, unknown> = { decided_by: userId(c), decided_at: new Date().toISOString() };
      if (typeof body.notes === "string") patch.notes = body.notes;
      if (decision === "accept") {
        if (["signed", "active"].includes(a.status)) throw new HttpError(409, "already_signed");
        await db.from("applications").update({ ...patch, status: "accepted" }).eq("id", a.id);
        const contract = await createContract(db, a.id);
        await audit(db, userId(c), "application.accept", "application", a.id);
        return { ok: true, status: "contract_sent", contract_id: contract.id };
      }
      if (decision === "reject") {
        const email = await getSetting(db, "email");
        const due = email.send_rejection_emails ? new Date(Date.now() + Number(email.rejection_delay_hours ?? 24) * 3600_000).toISOString() : null;
        await db.from("applications").update({ ...patch, status: "rejected", rejection_email_due_at: due }).eq("id", a.id);
        await db.from("contracts").update({ status: "cancelled" }).eq("application_id", a.id).eq("status", "sent");
        await audit(db, userId(c), "application.reject", "application", a.id);
        return { ok: true, status: "rejected", rejection_email_due_at: due };
      }
      if (decision === "review" || decision === "new") {
        await db.from("applications").update({ ...patch, status: decision }).eq("id", a.id);
        return { ok: true, status: decision };
      }
      throw new HttpError(400, "decision");
    }
    case "resend_contract": {
      requireStaff(c);
      const contract = await createContract(db, String(body.application_id));
      return { ok: true, contract_id: contract.id };
    }
    case "cron": {
      requireAdmin(c);
      const now = new Date();
      const out = { reminders: 0, expired: 0, rejections: 0 };
      const { data: open } = await db.from("contracts").select("id, token, sent_at, reminders, expires_at, application_id, applications(first_name, email, locale)").eq("status", "sent");
      for (const k of open ?? []) {
        const step = signatureStep(k.sent_at, k.reminders, now);
        if (!step) continue;
        const app: any = k.applications;
        if (step === "expire") {
          await db.from("contracts").update({ status: "expired" }).eq("id", k.id);
          await db.from("applications").update({ notes: "Contrat expiré (J+7 sans signature)" }).eq("id", k.application_id).eq("status", "contract_sent");
          out.expired++;
          continue;
        }
        await queueEmail(db, { template: "contract_reminder", to: app.email, language: app.locale, vars: { first_name: app.first_name, expires_on: k.expires_at.slice(0, 10) }, buttonUrl: appUrl(`/sign/${k.token}`), relatedType: "contract", relatedId: k.id });
        await db.from("contracts").update({ reminders: k.reminders + 1, last_reminder_at: now.toISOString() }).eq("id", k.id);
        out.reminders++;
      }
      const { data: rej } = await db.from("applications").select("id, first_name, email, locale").eq("status", "rejected")
        .not("rejection_email_due_at", "is", null).is("rejection_email_sent_at", null).lte("rejection_email_due_at", now.toISOString()).limit(100);
      for (const a of rej ?? []) {
        await queueEmail(db, { template: "application_rejected", to: a.email, language: a.locale, vars: { first_name: a.first_name }, relatedType: "application", relatedId: a.id });
        await db.from("applications").update({ rejection_email_sent_at: now.toISOString() }).eq("id", a.id);
        out.rejections++;
      }
      return { ok: true, ...out };
    }
    default:
      throw new HttpError(400, "unknown action");
  }
});

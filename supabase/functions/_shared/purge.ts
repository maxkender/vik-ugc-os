// Suppression définitive d'un candidat et de ses données (bouton admin), et purge des comptes de test.
// Ne touche jamais : bibliothèque, réglages, assets, campagnes, ni un compte staff qui n'est pas de test.
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface PurgeCounts {
  applications: number; contracts: number; contract_pdfs: number; yap_videos: number; emails: number;
  users: number; meta_events: number; orphan_yaps: number;
}
const zero = (): PurgeCounts => ({ applications: 0, contracts: 0, contract_pdfs: 0, yap_videos: 0, emails: 0, users: 0, meta_events: 0, orphan_yaps: 0 });

/** Domaines de test (jamais de vraies personnes). */
export const TEST_DOMAINS = ["@vik-qa.test", "@example.com"];
export const isTestEmail = (e: string | null | undefined) => TEST_DOMAINS.some((d) => (e ?? "").toLowerCase().endsWith(d));

/**
 * Un candidat : candidature, contrats + PDF signés, vidéo yap, emails, événements Meta liés,
 * et son compte posteur (auth user → profil → posteur, assignations, paie, conversations en cascade).
 * Le compte n'est supprimé que s'il est posteur, ou s'il est de test (jamais un admin réel).
 */
export async function purgeApplication(db: SupabaseClient, appId: string, dryRun = false, c: PurgeCounts = zero()): Promise<PurgeCounts> {
  const { data: app } = await db.from("applications").select("id, email, poster_id, yap_video_path").eq("id", appId).maybeSingle();
  if (!app) return c;
  const { data: contracts } = await db.from("contracts").select("id, pdf_path").eq("application_id", app.id);
  const pdfs = (contracts ?? []).map((k) => k.pdf_path).filter(Boolean) as string[];
  const { count: emails } = await db.from("email_outbox").select("id", { count: "exact", head: true }).or(`application_id.eq.${app.id},to_email.eq.${app.email}`);
  const { count: events } = await db.from("meta_events").select("id", { count: "exact", head: true }).eq("application_id", app.id);
  let deleteUser: string | null = null;
  if (app.poster_id) {
    const { data: p } = await db.from("profiles").select("id, role, is_test, email").eq("id", app.poster_id).maybeSingle();
    if (p && (p.role === "poster" || p.is_test)) deleteUser = p.id;
  }
  c.applications++; c.contracts += contracts?.length ?? 0; c.contract_pdfs += pdfs.length; c.yap_videos += app.yap_video_path ? 1 : 0;
  c.emails += emails ?? 0; c.meta_events += events ?? 0; c.users += deleteUser ? 1 : 0;
  if (dryRun) return c;

  if (pdfs.length) await db.storage.from("contracts").remove(pdfs);
  if (app.yap_video_path) await db.storage.from("yap-videos").remove([app.yap_video_path]);
  await db.from("email_outbox").delete().or(`application_id.eq.${app.id},to_email.eq.${app.email}`);
  await db.from("meta_events").delete().eq("application_id", app.id);
  await db.from("applications").delete().eq("id", app.id); // contrats et étapes d'onboarding en cascade
  if (deleteUser) {
    const { error } = await db.auth.admin.deleteUser(deleteUser); // profil, posteur, assignations, paie, assistant en cascade
    if (error) throw new Error(`deleteUser: ${error.message}`);
  }
  return c;
}

/** Tous les comptes et données de test (domaines de test ou profiles.is_test). */
export async function purgeTestData(db: SupabaseClient, dryRun = true) {
  const c = zero();
  const { data: profs } = await db.from("profiles").select("id, email, role, is_test");
  const testProfiles = (profs ?? []).filter((p) => p.is_test || isTestEmail(p.email));
  const testIds = new Set(testProfiles.map((p) => p.id));
  const testEmails = new Set(testProfiles.map((p) => String(p.email).toLowerCase()));
  const { data: apps } = await db.from("applications").select("id, email, poster_id");
  const testApps = (apps ?? []).filter((a) => isTestEmail(a.email) || testEmails.has(String(a.email).toLowerCase()) || (a.poster_id && testIds.has(a.poster_id)));
  for (const a of testApps) await purgeApplication(db, a.id, dryRun, c);

  // Comptes de test restants (admin / contrôleur / posteur QA sans candidature).
  const handled = new Set(testApps.map((a) => a.poster_id).filter(Boolean));
  const rest = testProfiles.filter((p) => !handled.has(p.id));
  c.users += rest.length;
  // Emails vers des adresses de test restants.
  const { data: outbox } = await db.from("email_outbox").select("id, to_email");
  const testMails = (outbox ?? []).filter((m) => isTestEmail(m.to_email) || testEmails.has(String(m.to_email).toLowerCase()));
  c.emails += testMails.length;
  // Lead de test sans candidature (test bout en bout supprimé) et tests avec test_event_code.
  // Les vérifications techniques « VikCapiCheck » sont gardées : elles prouvent la CAPI dans la checklist.
  const { data: ev } = await db.from("meta_events").select("id, event_name, application_id, test_code");
  const testEvents = (ev ?? []).filter((e) => e.event_name === "Lead" && (!e.application_id || e.test_code));
  c.meta_events += testEvents.length;
  // Vidéos yap orphelines (candidature supprimée ou jamais soumise), plus vieilles que 24 h.
  const { data: files } = await db.storage.from("yap-videos").list("pending", { limit: 1000 });
  const { data: used } = await db.from("applications").select("yap_video_path");
  const usedSet = new Set((used ?? []).map((u) => u.yap_video_path));
  const orphans = (files ?? []).filter((f) => !usedSet.has(`pending/${f.name}`) && Date.now() - Date.parse(f.created_at ?? "") > 86_400_000).map((f) => `pending/${f.name}`);
  c.orphan_yaps = orphans.length;

  if (!dryRun) {
    for (const p of rest) {
      const { error } = await db.auth.admin.deleteUser(p.id);
      if (error) throw new Error(`deleteUser ${p.email}: ${error.message}`);
    }
    if (testMails.length) await db.from("email_outbox").delete().in("id", testMails.map((m) => m.id));
    if (testEvents.length) await db.from("meta_events").delete().in("id", testEvents.map((e) => e.id));
    if (orphans.length) await db.storage.from("yap-videos").remove(orphans);
  }
  return { dry_run: dryRun, counts: c, users: testProfiles.map((p) => `${p.email} (${p.role})`), applications: testApps.map((a) => a.email) };
}

// Création d'un contrat à partir du modèle du pays (sinon le modèle par défaut).
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { renderContract, sha256Hex } from "./logic/contract.ts";
import { composeContract } from "./logic/contractSummary.ts";
import { formatMoney } from "./logic/zones.ts";
import { appUrl } from "./http.ts";
import { queueEmail } from "./outbox.ts";

export async function createContract(db: SupabaseClient, applicationId: string) {
  const { data: a } = await db.from("applications").select("*").eq("id", applicationId).single();
  if (!a) throw new Error("application not found");
  const { data: country } = await db.from("countries").select("code, name, language, zone_code, contract_clauses").eq("code", a.country).single();
  const { data: zone } = await db.from("zones").select("*").eq("code", country?.zone_code ?? "A").single();
  const { data: tpls } = await db.from("contract_templates").select("*").eq("active", true).order("version", { ascending: false });
  const tpl = tpls?.find((t) => t.country_code === a.country) ?? tpls?.find((t) => !t.country_code && t.language === "en") ?? tpls?.[0];
  if (!tpl) throw new Error("no contract template");
  const { data: company } = await db.from("settings").select("value").eq("key", "company").maybeSingle();
  const cur = zone?.currency ?? "USD";
  const full = renderContract(tpl.body_md, {
    company_name: company?.value?.name ?? "Vik Studios SAS",
    company_address: company?.value?.legal_address ?? "30 boulevard de Sébastopol, 75004 Paris, France",
    company_siren: company?.value?.siren ? `, SIREN ${company.value.siren}` : "",
    full_name: `${a.first_name} ${a.last_name}`,
    birthdate: a.birthdate,
    country_name: country?.name ?? a.country,
    date: new Date().toISOString().slice(0, 10),
    videos_per_day: zone?.videos_per_day ?? 2,
    price_per_video: formatMoney(Number(zone?.price_per_video ?? 0), cur),
    rpm: formatMoney(Number(zone?.rpm ?? 0), cur),
    rpm_views: new Intl.NumberFormat("en").format(zone?.rpm_views ?? 1000),
    bonus_cap: zone?.bonus_cap ? formatMoney(Number(zone.bonus_cap), cur) : "no cap",
    zone_code: zone?.code ?? "?",
    currency: cur,
    country_clauses: country?.contract_clauses ?? "",
  });
  // Résumé en langage simple dans la langue du créateur (+ anglais), puis le contrat complet.
  // Le texte juridique complet reste en anglais : c'est la version de référence (voir DECISIONS.md).
  const { body } = composeContract(a.locale ?? country?.language, {
    price: formatMoney(Number(zone?.price_per_video ?? 0), cur),
    rpm: formatMoney(Number(zone?.rpm ?? 0), cur),
    rpmViews: new Intl.NumberFormat("en").format(zone?.rpm_views ?? 1000),
    bonusCap: zone?.bonus_cap ? formatMoney(Number(zone.bonus_cap), cur) : null,
    videosPerDay: zone?.videos_per_day ?? 2,
    zone: zone?.code ?? "?",
    companyName: company?.value?.name ?? "Vik Studios SAS",
  }, full);
  const hash = await sha256Hex(body);
  // un seul contrat ouvert par candidature
  await db.from("contracts").update({ status: "cancelled" }).eq("application_id", a.id).eq("status", "sent");
  const { data: c, error } = await db.from("contracts").insert({
    application_id: a.id, template_id: tpl.id, body_rendered: body, doc_hash: hash,
  }).select("id, token, expires_at").single();
  if (error) throw error;
  await db.from("applications").update({ status: "contract_sent" }).eq("id", a.id);
  await queueEmail(db, {
    template: "contract_to_sign", to: a.email, language: a.locale,
    vars: {
      first_name: a.first_name, expires_on: c.expires_at.slice(0, 10),
      price_per_video: formatMoney(Number(zone?.price_per_video ?? 0), cur), rpm: formatMoney(Number(zone?.rpm ?? 0), cur),
      rpm_views: new Intl.NumberFormat("en").format(zone?.rpm_views ?? 1000),
    },
    buttonUrl: appUrl(`/sign/${c.token}`), relatedType: "contract", relatedId: c.id,
    applicationId: a.id, onboardingStep: "contract_email_sent",
  });
  return c;
}

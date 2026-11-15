// meta — campagnes de recrutement Meta (Marketing API). GARDE-FOU : tout est créé en PAUSED.
//   status                              admin : compte pub, pages, plafond
//   create_campaign { name, countries[], daily_budget, landing_base_url? }   admin : 1 campagne + 1 ad set par pays, PAUSED
//   create_ad { adset_id, creative_id, message?, headline? }                admin : image → adcreative → ad PAUSED
//   create_campaign accepte budgets {pays|zone: €} et by_zone ; set_budget { adset_id, daily_budget } (clic admin) ; create_ads_bulk { campaign_id, creative_ids? }
//   activate { level: campaign|adset|ad, id }                                 admin (jamais cron) : budget ≤ plafond
//   pause { level, id }                                                      admin
//   sync_insights                                                            cron / admin : dépense, clics, CPC (7 derniers jours)
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { audit, caller, getSetting, HttpError, requireAdmin, serve, userId } from "../_shared/http.ts";
import { activationAllowed, adPayload, adsetPayload, campaignPayload, landingUrl, toMinor } from "../_shared/logic/meta.ts";

interface MetaCfg { ad_account_id: string; page_id: string; api_version: string; max_daily_budget: number; global_daily_cap: number; beneficiary?: string }

async function graph(cfg: MetaCfg, path: string, init: { method?: string; params?: Record<string, unknown> } = {}) {
  const token = Deno.env.get("META_ACCESS_TOKEN");
  if (!token) throw new HttpError(500, "META_ACCESS_TOKEN missing (Supabase → Edge Functions → Secrets)");
  const url = new URL(`https://graph.facebook.com/${cfg.api_version}/${path.replace(/^\//, "")}`);
  let body: FormData | undefined;
  if (init.method === "POST") {
    body = new FormData();
    for (const [k, v] of Object.entries(init.params ?? {})) if (v !== undefined) body.append(k, typeof v === "string" ? v : JSON.stringify(v));
  } else for (const [k, v] of Object.entries(init.params ?? {})) url.searchParams.set(k, typeof v === "string" ? v : JSON.stringify(v));
  const res = await fetch(url, { method: init.method ?? "GET", headers: { Authorization: `Bearer ${token}` }, body });
  const data = await res.json();
  if (!res.ok || data.error) throw new HttpError(502, `Meta: ${data.error?.error_user_msg ?? data.error?.message ?? res.status}`);
  return data;
}

/** Garde-fou ultime : un POST de création doit porter status=PAUSED. */
async function createPaused(cfg: MetaCfg, edge: string, params: Record<string, unknown>) {
  if (params.status !== "PAUSED") throw new HttpError(500, "Garde-fou Meta : création hors PAUSED refusée");
  return await graph(cfg, `${cfg.ad_account_id}/${edge}`, { method: "POST", params });
}

async function syncInsights(db: SupabaseClient, cfg: MetaCfg) {
  const rows: any[] = [];
  for (const level of ["campaign", "adset", "ad"] as const) {
    const data = await graph(cfg, `${cfg.ad_account_id}/insights`, {
      params: { level, time_increment: "1", date_preset: "last_7d", fields: `${level}_id,spend,impressions,clicks,cpc,actions,account_currency`, limit: "500" },
    });
    for (const r of data.data ?? []) {
      const leads = (r.actions ?? []).filter((a: any) => ["lead", "landing_page_view", "offsite_conversion.fb_pixel_lead"].includes(a.action_type))
        .reduce((s: number, a: any) => s + Number(a.value ?? 0), 0);
      rows.push({ level, meta_id: r[`${level}_id`], date: r.date_start, spend: Number(r.spend ?? 0), impressions: Number(r.impressions ?? 0), clicks: Number(r.clicks ?? 0), leads, cpc: r.cpc ? Number(r.cpc) : null, currency: r.account_currency });
    }
  }
  if (rows.length) await db.from("meta_insights").upsert(rows, { onConflict: "level,meta_id,date" });
  // statuts à jour
  const { data: camps } = await db.from("meta_campaigns").select("id, meta_id").not("meta_id", "is", null);
  for (const c of camps ?? []) {
    try {
      const s = await graph(cfg, c.meta_id, { params: { fields: "effective_status" } });
      await db.from("meta_campaigns").update({ status: s.effective_status, last_synced_at: new Date().toISOString() }).eq("id", c.id);
    } catch { /* supprimée côté Meta */ }
  }
  return { ok: true, rows: rows.length };
}

/** Somme des budgets/jour des ad sets ACTIVE ou PAUSED (ce qui pourrait dépenser si tout était activé). */
async function committedBudget(db: SupabaseClient): Promise<number> {
  const { data } = await db.from("meta_adsets").select("daily_budget, status").in("status", ["ACTIVE", "PAUSED"]);
  return Math.round((data ?? []).reduce((sum, r) => sum + Number(r.daily_budget ?? 0), 0) * 100) / 100;
}

/** Image → adcreative → ad (PAUSED). */
async function createAd(db: SupabaseClient, cfg: MetaCfg, adset: any, cr: any, o: { message?: string; headline?: string }) {
  const { data: file } = await db.storage.from("creatives").download(cr.image_path);
  if (!file) throw new HttpError(404, "creative image missing");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const img = await graph(cfg, `${cfg.ad_account_id}/adimages`, { method: "POST", params: { bytes: btoa(bin) } });
  const hash = Object.values(img.images ?? {})[0] as any;
  const base = adset.meta_campaigns?.landing_url || Deno.env.get("APP_URL") || "https://example.com";
  const link = landingUrl(base, { country: cr.country ?? adset.country, lang: cr.language, campaign: adset.meta_campaigns?.name ?? "recruit", adset: adset.meta_id, ad: cr.id });
  const creative = await graph(cfg, `${cfg.ad_account_id}/adcreatives`, {
    method: "POST",
    params: {
      name: `${cr.headline.slice(0, 60)} – ${cr.format}`,
      object_story_spec: { page_id: cfg.page_id, link_data: { image_hash: hash.hash, link, message: o.message ?? cr.subline ?? cr.headline, name: o.headline ?? cr.headline, call_to_action: { type: "APPLY_NOW", value: { link } } } },
    },
  });
  const name = `${adset.name} – ${cr.country} ${cr.format}`;
  const ad = await createPaused(cfg, "ads", adPayload({ name, adsetId: adset.meta_id, creativeId: creative.id }));
  await db.from("meta_ads").insert({ adset_id: adset.id, creative_id: cr.id, meta_id: ad.id, meta_creative_id: creative.id, name, landing_url: link, status: "PAUSED" });
  await db.from("recruitment_creatives").update({ status: "sent_to_meta", meta_image_hash: hash.hash }).eq("id", cr.id);
  return { ad_id: ad.id };
}

serve(async (req, body, db) => {
  const c = await caller(req, db);
  requireAdmin(c);
  const stored = await getSetting<Partial<MetaCfg>>(db, "meta");
  const cfg: MetaCfg = { ad_account_id: stored.ad_account_id ?? "", page_id: stored.page_id ?? "", api_version: stored.api_version ?? "v21.0", max_daily_budget: Number(stored.max_daily_budget ?? 50), global_daily_cap: Number(stored.global_daily_cap ?? 100) };
  const company = await getSetting(db, "company");
  switch (body.action) {
    case "status": {
      const account = await graph(cfg, cfg.ad_account_id, { params: { fields: "name,currency,account_status,amount_spent,min_daily_budget,timezone_name" } });
      const pages = await graph(cfg, "me/accounts", { params: { fields: "id,name", limit: "50" } });
      return { ok: true, account, pages: pages.data ?? [], page_id: cfg.page_id, max_daily_budget: cfg.max_daily_budget };
    }
    case "create_campaign": {
      // Une campagne PAUSED, puis un ad set PAUSED par pays (budget par pays) ou par zone (by_zone).
      const countries: string[] = (body.countries ?? []).map((x: string) => String(x).toUpperCase()).filter((x: string) => /^[A-Z]{2}$/.test(x));
      if (!countries.length) throw new HttpError(400, "countries");
      const def = Number(body.daily_budget ?? 5);
      const budgets: Record<string, number> = body.budgets && typeof body.budgets === "object" ? body.budgets : {};
      const { data: ctryRows } = await db.from("countries").select("code, zone_code").in("code", countries);
      const zoneOf = new Map((ctryRows ?? []).map((r) => [r.code, r.zone_code as string | null]));
      const groups: Array<{ key: string; countries: string[]; zone: string | null; budget: number }> = body.by_zone
        ? [...new Set(countries.map((x) => zoneOf.get(x) ?? "?"))].map((z) => ({
          key: `Zone ${z}`, zone: z, countries: countries.filter((x) => (zoneOf.get(x) ?? "?") === z), budget: Number(budgets[z] ?? def),
        }))
        : countries.map((x) => ({ key: x, zone: zoneOf.get(x) ?? null, countries: [x], budget: Number(budgets[x] ?? def) }));
      for (const g of groups) {
        if (!(g.budget > 0) || g.budget > cfg.max_daily_budget) throw new HttpError(400, `Budget ${g.key} : entre 0 et ${cfg.max_daily_budget} €/jour par ad set`);
      }
      const used = await committedBudget(db);
      const adding = groups.reduce((sum, g) => sum + g.budget, 0);
      if (used + adding > cfg.global_daily_cap) throw new HttpError(400, `Plafond global dépassé : ${used} + ${adding} > ${cfg.global_daily_cap} €/jour`);
      const name = String(body.name ?? `Recrutement créateurs ${countries.join("-")}`).slice(0, 200);
      const camp = await createPaused(cfg, "campaigns", campaignPayload(name, countries));
      const { data: local } = await db.from("meta_campaigns").insert({ meta_id: camp.id, name, status: "PAUSED", daily_budget_cap: cfg.max_daily_budget, countries, landing_url: body.landing_base_url ?? null, created_by: userId(c) }).select("id").single();
      const adsets = [];
      for (const g of groups) {
        const p = adsetPayload({ name: `${name} – ${g.key}`, campaignId: camp.id, country: g.countries[0], dailyBudget: g.budget, employment: true, beneficiary: company.brand ?? "Vik Studios" });
        (p.targeting as any).geo_locations = { countries: g.countries };
        const a = await createPaused(cfg, "adsets", p);
        await db.from("meta_adsets").insert({
          campaign_id: local!.id, meta_id: a.id, name: p.name, country: g.countries.length === 1 ? g.countries[0] : null, zone_code: g.zone,
          daily_budget: g.budget, age_min: 18, age_max: 25, status: "PAUSED",
          targeting: { sent: p.targeting, countries: g.countries, intent: "18-25, étudiants (non envoyé : catégorie EMPLOYMENT)" },
        });
        adsets.push({ key: g.key, countries: g.countries, budget: g.budget, meta_id: a.id });
      }
      await audit(db, userId(c), "meta.create_campaign", "meta_campaign", local!.id, { meta_id: camp.id, countries, by_zone: !!body.by_zone });
      return { ok: true, campaign_id: local!.id, meta_id: camp.id, adsets };
    }
    case "set_budget": {
      // Clic admin uniquement (jamais cron) : plafond par ad set + plafond global (ACTIVE + PAUSED).
      if (c.kind !== "user") throw new HttpError(403, "changement de budget manuel uniquement");
      const amount = Number(body.daily_budget);
      if (!(amount > 0) || amount > cfg.max_daily_budget) throw new HttpError(400, `Budget entre 0 et ${cfg.max_daily_budget} €/jour par ad set`);
      const { data: row } = await db.from("meta_adsets").select("*").eq("id", body.adset_id).single();
      if (!row) throw new HttpError(404, "adset not found");
      const used = await committedBudget(db);
      const next = used - Number(row.daily_budget) + amount;
      if (next > cfg.global_daily_cap) throw new HttpError(400, `Plafond global dépassé : ${next} > ${cfg.global_daily_cap} €/jour`);
      await graph(cfg, row.meta_id, { method: "POST", params: { daily_budget: String(toMinor(amount)) } });
      await db.from("meta_adsets").update({ daily_budget: amount }).eq("id", row.id);
      await audit(db, userId(c), "meta.set_budget", "meta_adsets", row.id, { from: row.daily_budget, to: amount });
      return { ok: true, daily_budget: amount, committed: next, global_daily_cap: cfg.global_daily_cap };
    }
    case "create_ads_bulk": {
      // Pour chaque ad set de la campagne : les créas validées de son pays (ou des pays de sa zone). Tout en PAUSED.
      if (!cfg.page_id) throw new HttpError(409, "page_id manquant (Réglages → Intégrations → Meta)");
      const { data: sets } = await db.from("meta_adsets").select("*, meta_campaigns(name, landing_url)").eq("campaign_id", body.campaign_id);
      const ids: string[] = Array.isArray(body.creative_ids) ? body.creative_ids : [];
      let q = db.from("recruitment_creatives").select("*").eq("status", "approved").not("image_path", "is", null);
      if (ids.length) q = q.in("id", ids);
      const { data: crs } = await q.limit(200);
      const results: any[] = [];
      for (const set of sets ?? []) {
        const setCountries: string[] = set.country ? [set.country] : (set.targeting?.countries ?? []);
        const mine = (crs ?? []).filter((cr) => setCountries.includes(cr.country)).slice(0, 6);
        for (const cr of mine) {
          try {
            results.push({ adset: set.name, creative: cr.id, ...(await createAd(db, cfg, set, cr, {})) });
          } catch (e) {
            results.push({ adset: set.name, creative: cr.id, error: e instanceof Error ? e.message : String(e) });
          }
        }
      }
      return { ok: true, created: results.filter((r) => !r.error).length, results };
    }
    case "create_ad": {
      if (!cfg.page_id) throw new HttpError(409, "page_id manquant (Réglages → Meta)");
      const { data: adset } = await db.from("meta_adsets").select("*, meta_campaigns(name, landing_url)").eq("id", body.adset_id).single();
      const { data: cr } = await db.from("recruitment_creatives").select("*").eq("id", body.creative_id).single();
      if (!adset || !cr?.image_path) throw new HttpError(404, "adset or creative not found");
      return { ok: true, ...(await createAd(db, cfg, adset, cr, { message: body.message, headline: body.headline })) };
    }
    case "activate": {
      if (c.kind !== "user") throw new HttpError(403, "activation manuelle uniquement");
      const level = String(body.level);
      const table = level === "campaign" ? "meta_campaigns" : level === "adset" ? "meta_adsets" : "meta_ads";
      const { data: row } = await db.from(table).select("*").eq("id", body.id).single();
      if (!row) throw new HttpError(404, "not found");
      let budget = 0;
      if (level === "campaign") {
        const { data: sets } = await db.from("meta_adsets").select("daily_budget").eq("campaign_id", row.id);
        budget = (sets ?? []).reduce((s, x) => s + Number(x.daily_budget), 0);
      } else if (level === "adset") budget = Number(row.daily_budget);
      // Plafond par ad set pour un ad set ; plafond global pour une campagne entière.
      const ok = activationAllowed({ isAdmin: c.role === "admin", dailyBudget: budget, cap: level === "campaign" ? cfg.global_daily_cap : cfg.max_daily_budget });
      if (!ok.ok) throw new HttpError(403, `activation refusée : ${ok.reason} (budget ${budget} / plafond ${level === "campaign" ? cfg.global_daily_cap : cfg.max_daily_budget})`);
      await graph(cfg, row.meta_id, { method: "POST", params: { status: "ACTIVE" } });
      await db.from(table).update({ status: "ACTIVE" }).eq("id", row.id);
      await audit(db, userId(c), `meta.activate.${level}`, table, row.id, { budget });
      return { ok: true };
    }
    case "pause": {
      const level = String(body.level);
      const table = level === "campaign" ? "meta_campaigns" : level === "adset" ? "meta_adsets" : "meta_ads";
      const { data: row } = await db.from(table).select("id, meta_id").eq("id", body.id).single();
      if (!row) throw new HttpError(404, "not found");
      await graph(cfg, row.meta_id, { method: "POST", params: { status: "PAUSED" } });
      await db.from(table).update({ status: "PAUSED" }).eq("id", row.id);
      return { ok: true };
    }
    case "sync_insights":
      return await syncInsights(db, cfg);
    default:
      throw new HttpError(400, "unknown action");
  }
});

// Instantané des pays ouverts + zones (données publiques) embarqué dans le build : la landing s'affiche sans attendre
// l'aller-retour Supabase (LCP mobile), puis les vraies données remplacent l'instantané. À relancer si la grille change.
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=… npx tsx scripts/snapshot-public-countries.mts
import { writeFileSync } from "node:fs";
const REF = "lnytuhsgzkqrkehemasu";
const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { authorization: `Bearer sbp_${"0".repeat(40)}`, "content-type": "application/json" },
  body: JSON.stringify({ query: "select json_agg(x order by x.name) j from (select c.code, c.name, c.language, c.open, c.zone_code, case when z.code is null then null else json_build_object('code', z.code, 'price_per_video', z.price_per_video, 'rpm', z.rpm, 'rpm_views', z.rpm_views, 'currency', z.currency, 'videos_per_day', z.videos_per_day, 'bonus_cap', z.bonus_cap, 'active', z.active) end zones from countries c left join zones z on z.code = c.zone_code) x" }) });
const rows = (await r.json())[0].j;
writeFileSync("src/data/publicCountries.json", JSON.stringify(rows));
console.log(rows.length, "pays");

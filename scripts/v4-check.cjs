// Vérification V4 en prod (connecté) : lecture dans la carte, badges, panneau IA, tags, filtre compatible, assets → brief → posteur.
//   QA_ADMIN_PW=… QA_CANDIDATE_PW=… node scripts/v4-check.cjs <baseUrl> <outDir>
// Crée un asset de test, le joint au brief de démo, vérifie l'espace posteur, puis supprime l'asset (aucune trace).
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const [, , base, out = "/tmp/v4"] = process.argv;
fs.mkdirSync(out, { recursive: true });
const MICABO = "9006541e-924e-4ba0-98af-a066acbe6fcf";

async function login(page, email, pw) {
  await page.goto(base + "/login", { waitUntil: "domcontentloaded" });
  await page.locator("input[type=email]").waitFor();
  if ((await page.locator("input[type=password]").count()) === 0) await page.getByText(/password|mot de passe/i).last().click();
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", pw);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

(async () => {
  const browser = await chromium.launch();
  const log = [];
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => r.status() >= 400 && /supabase\.co\/(rest|functions|storage)/.test(r.url()) && errors.push(`${r.status()} ${r.url().replace(/\?.*/, "").slice(-70)}`));
  await login(page, "qa-admin@vik-qa.test", process.env.QA_ADMIN_PW);

  // 1. Grille triée par pertinence Micabo
  await page.goto(base + "/admin/library?sort=relevance", { waitUntil: "domcontentloaded" });
  await page.locator("[data-testid=inline-play]").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  log.push({ relevanceBadges: await page.getByText(/^Micabo \d+$/).count(), categoryBadges: await page.locator("button[title*='Format'], button[title*='format']").count() });
  await page.screenshot({ path: `${out}/1-grid-relevance.png` });

  // 2. Lecture dans la carte, une seule à la fois
  await page.locator("[data-testid=inline-play]").nth(0).click();
  await page.waitForTimeout(800);
  const after1 = await page.locator("[data-source]").count();
  await page.screenshot({ path: `${out}/2-inline-play.png` });
  await page.locator("[data-testid=inline-play]").nth(1).click();
  await page.waitForTimeout(800);
  log.push({ inlineAfterFirst: after1, inlineAfterSecond: await page.locator("[data-source]").count(), modalOpen: await page.locator("[data-testid=video-player]").count() });
  await page.getByRole("button", { name: "Arrêter" }).first().click();

  // 3. Lecteur agrandi : panneau format / pertinence / tags ; ajout puis retrait d'un tag
  await page.locator("[class*='aspect-[9/16]']").nth(2).click({ position: { x: 20, y: 300 } });
  const player = page.locator("[data-testid=video-player]");
  await player.waitFor();
  await page.waitForTimeout(800);
  log.push({ panelRelevance: await player.getByText(/Pertinence Micabo/).count() });
  await player.locator("input[placeholder='ajouter un tag']").fill("qa-v4");
  await player.locator("input[placeholder='ajouter un tag']").press("Enter");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/3-player-insights.png` });
  log.push({ tagAdded: await player.getByText("#qa-v4").count() });
  await player.getByRole("button", { name: "Retirer qa-v4" }).click();
  await page.waitForTimeout(1200);
  log.push({ tagRemoved: (await player.getByText("#qa-v4").count()) === 0 });
  await page.keyboard.press("Escape");

  // 4. Filtre « Compatible Micabo »
  await page.goto(base + `/admin/library?compat=${MICABO}&sort=relevance&view=table`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);
  log.push({ compatFilterHeader: (await page.locator("main").textContent()).match(/[\d  ]+vidéos/)?.[0] });

  // 5. Assets : upload d'une image de test
  const png = path.join(out, "qa-logo.png");
  fs.writeFileSync(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"));
  await page.goto(base + "/admin/assets", { waitUntil: "domcontentloaded" });
  await page.locator("[data-testid=asset-input]").waitFor({ state: "attached" });
  await page.locator("select").first().selectOption({ label: "Micabo" });
  await page.locator("[data-testid=asset-input]").setInputFiles(png);
  await page.getByText("qa-logo.png").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/4-assets.png` });
  log.push({ assetUploaded: true });

  // 6. Joindre au brief de démo
  await page.goto(base + "/admin/briefs", { waitUntil: "domcontentloaded" });
  await page.getByText("Briefs", { exact: true }).last().waitFor();
  await page.waitForTimeout(1500);
  const tab = page.getByRole("button", { name: /^Briefs/ });
  if (await tab.count()) await tab.last().click();
  await page.waitForTimeout(1000);
  await page.getByText(/\[E2E\] Format green screen/).first().click();
  await page.getByText(/Assets joints/).waitFor({ timeout: 10000 });
  await page.locator("button[title='qa-logo.png']").click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/5-brief-assets.png` });
  log.push({ attached: (await page.getByText(/Assets joints \(1\)/).count()) > 0 });

  // 7. Espace posteur (mobile)
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  p2.on("pageerror", (e) => errors.push("creator: " + e.message));
  await login(p2, "qa-candidate@vik-qa.test", process.env.QA_CANDIDATE_PW);
  await p2.goto(base + "/creator", { waitUntil: "domcontentloaded" });
  await p2.getByText("qa-logo.png").first().waitFor({ timeout: 20000 }).catch(() => {});
  log.push({ posterSeesAsset: await p2.getByText("qa-logo.png").count() });
  await p2.getByText("qa-logo.png").first().scrollIntoViewIfNeeded().catch(() => {});
  await p2.screenshot({ path: `${out}/6-creator-assets-390.png` });
  await ctx2.close();

  // 8. Nettoyage : suppression de l'asset de test
  page.on("dialog", (d) => d.accept());
  await page.goto(base + "/admin/assets", { waitUntil: "domcontentloaded" });
  await page.getByText("qa-logo.png").first().waitFor();
  await page.locator("button[title='Supprimer']").first().click();
  await page.waitForTimeout(2000);
  log.push({ assetDeleted: (await page.getByText("qa-logo.png").count()) === 0 });

  console.log(JSON.stringify({ log, errors: [...new Set(errors)].slice(0, 10) }, null, 1));
  await browser.close();
})().catch((e) => { console.error("ERREUR", e.message.split("\n")[0]); process.exit(1); });

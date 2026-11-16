// Génère les créas pilotes via la page Créas (rendu canvas du navigateur), connecté en admin QA.
//   QA_ADMIN_PW=… node scripts/pilot-creatives.cjs <baseUrl> MX,CO
const { chromium } = require("playwright");
const [, , base, list = "MX,CO", hooks = "student,earn,nofollow"] = process.argv;
const countries = list.split(",");
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base + "/login");
  if ((await p.locator("input[type=password]").count()) === 0) await p.getByText(/mot de passe|password/i).last().click();
  await p.fill("input[type=email]", "qa-admin@vik-qa.test");
  await p.fill("input[type=password]", process.env.QA_ADMIN_PW);
  await p.locator("button[type=submit]").click();
  await p.waitForURL((u) => !u.pathname.startsWith("/login"));
  await p.goto(base + "/admin/recruitment/creatives", { waitUntil: "domcontentloaded" });
  await p.getByText("Générer en lot").waitFor();
  await p.waitForTimeout(2000);
  for (const code of countries) {
    const name = { MX: "Mexico", CO: "Colombia" }[code] ?? code;
    await p.locator("label", { hasText: name }).first().locator("input[type=checkbox]").check();
  }
  await p.getByRole("button", { name: /^4:5/ }).click(); // garder 1:1 et 9:16
  const hookSelect = p.locator("select").first();
  for (const hook of hooks.split(",")) {
    await hookSelect.selectOption(hook);
    await p.getByRole("button", { name: /Générer \d+ créas/ }).click();
    // Attendre la fin du lot : la barre « Rendu et envoi… » disparaît.
    await p.getByText("Rendu et envoi…").waitFor({ timeout: 20000 });
    await p.getByText("Rendu et envoi…").waitFor({ state: "detached", timeout: 180000 });
    await p.waitForTimeout(1000);
  }
  // Visuel IA réaliste (fal) sur chaque brouillon du lot, puis re-rendu dans le navigateur.
  if (process.env.PHOTO === "1") {
    await p.getByRole("button", { name: "Brouillons", exact: true }).first().click();
    await p.waitForTimeout(2500);
    const n = await p.locator("button[title='Visuel IA réaliste (fal)']").count();
    for (let i = 0; i < n; i++) {
      await p.locator("button[title='Visuel IA réaliste (fal)']").nth(i).click();
      await p.getByText(/Visuel IA appliqué|fal:|refusée|missing/).first().waitFor({ timeout: 180000 });
      await p.waitForTimeout(1200);
    }
  }
  console.log(JSON.stringify({ ok: true, errors }));
  await b.close();
})().catch((e) => { console.error("ERREUR", e.message.split("\n")[0]); process.exit(1); });

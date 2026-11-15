// Parcours complet connecté (Playwright) contre un front (local ou prod) branché sur Supabase.
//   node scripts/e2e-journey.cjs <baseUrl> <étape> [args]
// Étapes : apply | accept | sign <token> | creator | controller | admin-payroll
// Identifiants lus dans l'environnement (QA_*_PW, QA_CANDIDATE_PW), jamais écrits dans le repo.
const { chromium } = require("playwright");
const fs = require("fs");

const [, , base, step, arg] = process.argv;
const OUT = process.env.E2E_OUT || "/tmp/e2e";
fs.mkdirSync(OUT, { recursive: true });

async function session(viewport = { width: 1440, height: 900 }) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/TUNNEL|ERR_NAME|tiktokcdn|fbcdn|cdninstagram/i.test(m.text()) && errors.push(m.text().slice(0, 200)));
  page.on("response", (r) => r.status() >= 400 && /supabase\.co\/(rest|functions)/.test(r.url()) && errors.push(`${r.status()} ${r.url().replace(/\?.*/, "").slice(-80)}`));
  return { browser, page, errors };
}

async function login(page, email, password) {
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  if ((await page.locator("input[type=password]").count()) === 0) await page.getByText(/password|mot de passe|contraseña/i).last().click();
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });

(async () => {
  const { browser, page, errors } = await session(step === "creator" || step === "apply" ? { width: 390, height: 844 } : undefined);
  const log = [];
  try {
    if (step === "apply") {
      await page.goto(base + "/apply/fr?utm_source=e2e&lang=fr", { waitUntil: "networkidle" });
      const t = await page.locator("input:not([type]):visible, input[type=text]:visible").all();
      const visible = [];
      for (const i of t) if ((await i.getAttribute("name")) !== "website") visible.push(i);
      await visible[0].fill("Qa");
      await visible[1].fill("Candidate");
      await page.fill("input[type=date]", "2003-03-03");
      await page.fill("input[type=email]", "qa-candidate@vik-qa.test");
      await page.fill("input[type=tel]", "+33600000001");
      await page.setInputFiles("input[type=file]", process.env.YAP_FILE);
      await page.waitForSelector("text=/Vidéo envoyée|Video uploaded|Vídeo subido/", { timeout: 90000 });
      for (const c of await page.locator("input[type=checkbox]").all()) await c.check();
      await shot(page, "1-apply-filled");
      await page.locator("button[type=submit]").click();
      await page.waitForTimeout(6000);
      await shot(page, "1-apply-done");
      log.push((await page.textContent("body")).replace(/\s+/g, " ").slice(0, 160));
    }
    if (step === "accept") {
      await login(page, "qa-admin@vik-qa.test", process.env.QA_ADMIN_PW);
      await page.goto(base + "/admin/recruitment/candidates", { waitUntil: "networkidle" });
      await page.waitForTimeout(2500);
      await shot(page, "2-candidates-review");
      const body = await page.textContent("body");
      log.push(body.includes("Candidate") ? "candidat visible" : "CANDIDAT ABSENT");
      await page.keyboard.press("a");
      await page.waitForTimeout(5000);
      await shot(page, "2-candidates-accepted");
    }
    if (step === "sign") {
      await page.goto(base + "/sign/" + arg, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      await shot(page, "3-sign");
      const inputs = await page.locator("input:not([type]):visible, input[type=text]:visible").all();
      await inputs[inputs.length - 1].fill("Qa Candidate");
      await page.locator("input[type=checkbox]").last().check();
      await page.locator("button", { hasText: /Signer|Sign|Firmar/ }).last().click();
      await page.waitForTimeout(9000);
      await shot(page, "3-signed");
      log.push((await page.textContent("body")).replace(/\s+/g, " ").slice(-200));
    }
    if (step === "creator") {
      await login(page, "qa-candidate@vik-qa.test", process.env.QA_CANDIDATE_PW);
      await page.goto(base + "/creator", { waitUntil: "networkidle" });
      await page.waitForTimeout(2500);
      await shot(page, "4-creator-today");
      const link = page.locator("input[type=url], input[placeholder*='tiktok' i]").first();
      if (await link.count()) {
        await link.fill("https://www.tiktok.com/@qa_candidate/video/7000000000000000099");
        await page.locator("button", { hasText: /Envoyer|Submit|Enviar/ }).first().click();
        await page.waitForTimeout(3000);
        log.push("lien soumis");
      } else log.push("PAS DE CHAMP DE LIEN");
      await shot(page, "4-creator-submitted");
      await page.goto(base + "/creator/account", { waitUntil: "networkidle" });
      await page.waitForTimeout(8000);
      await shot(page, "5-creator-account");
      await page.goto(base + "/creator/payments", { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      const ruul = page.locator("input[type=email]").first();
      if (await ruul.count()) {
        await ruul.fill("qa-candidate-ruul@vik-qa.test");
        await page.locator("button", { hasText: /Enregistrer|Save|Guardar/ }).first().click();
        await page.waitForTimeout(2500);
        log.push("email Ruul enregistré");
      }
      await shot(page, "6-creator-payments");
    }
    if (step === "controller") {
      await login(page, "qa-controller@vik-qa.test", process.env.QA_CONTROLLER_PW);
      await page.goto(base + "/admin/briefs", { waitUntil: "networkidle" });
      await page.waitForTimeout(2500);
      await shot(page, "7-controller-briefs");
      const btn = page.locator("button", { hasText: /^\s*Valider\s*$/ }).first();
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(3000);
        log.push("post validé");
      } else log.push("PAS DE BOUTON VALIDER");
      await shot(page, "7-controller-validated");
      for (const p of ["/admin/payroll", "/admin/settings/team", "/admin/recruitment/candidates"]) {
        await page.goto(base + p, { waitUntil: "networkidle" });
        await page.waitForTimeout(1500);
        log.push(`${p} → ${new URL(page.url()).pathname}`);
      }
    }
    if (step === "admin-payroll") {
      await login(page, "qa-admin@vik-qa.test", process.env.QA_ADMIN_PW);
      await page.goto(base + "/admin/payroll", { waitUntil: "networkidle" });
      await page.waitForTimeout(2500);
      const thisWeek = page.locator("button", { hasText: /Cette semaine/ }).first();
      if (await thisWeek.count()) await thisWeek.click();
      await page.waitForTimeout(1000);
      const calc = page.locator("button", { hasText: /Calculer/ }).first();
      if (await calc.count()) { await calc.click(); await page.waitForTimeout(5000); log.push("paie calculée"); }
      await shot(page, "8-admin-payroll");
      log.push((await page.textContent("main")).replace(/\s+/g, " ").slice(0, 400));
    }
  } catch (e) {
    log.push(`ERREUR ${e.message.split("\n")[0]}`);
    await shot(page, `x-${step}-error`).catch(() => {});
  }
  console.log(JSON.stringify({ step, log, errors: [...new Set(errors)].slice(0, 12) }, null, 1));
  await browser.close();
})();

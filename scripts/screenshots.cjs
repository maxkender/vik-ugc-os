// Captures des pages clés, connecté avec un compte de test (QA).
//   QA_EMAIL=… QA_PASSWORD=… node scripts/screenshots.cjs <baseUrl> <outDir> [paths…]
// Les identifiants sont lus dans l'environnement, jamais écrits dans le repo.
const { chromium } = require("playwright");
const fs = require("fs");

const [, , base = "http://localhost:5173", out = "docs/screenshots/after", ...paths] = process.argv;
const PAGES = paths.length ? paths : ["/admin", "/admin/library?view=table", "/admin/library", "/admin/competitors", "/admin/recruitment/onboarding", "/admin/recruitment/candidates", "/admin/briefs"];

async function login(page, email, password) {
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  const toggle = page.getByText(/password|mot de passe|contraseña/i).last();
  if (await page.locator("input[type=password]").count() === 0) await toggle.click();
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const report = [];
  for (const vp of [{ name: "1440", width: 1440, height: 900 }, { name: "390", width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
    await login(page, process.env.QA_EMAIL, process.env.QA_PASSWORD);
    for (const p of PAGES) {
      errors.length = 0;
      await page.goto(base + p, { waitUntil: "networkidle" });
      await page.waitForTimeout(2500);
      const file = `${out}/${p.replace(/^\//, "").replace(/[/?=&]+/g, "_") || "home"}-${vp.name}.png`;
      await page.screenshot({ path: file, fullPage: vp.name === "1440" });
      report.push({ page: p, vp: vp.name, file, errors: [...errors] });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(report.map((r) => ({ ...r, errors: r.errors.slice(0, 3) })), null, 1));
})();

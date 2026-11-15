// Vérifie le lecteur vidéo (connecté) : ouverture au clic, source choisie, ← → et Échap.
//   QA_EMAIL=… QA_PASSWORD=… node scripts/player-check.cjs <baseUrl> <outDir>
// Le réseau de la session de build bloque TikTok / Instagram / fbcdn : on vérifie la source choisie
// (iframe officielle, MP4, lien) et l'URL, pas la lecture elle-même.
const { chromium } = require("playwright");
const fs = require("fs");
const [, , base, out = "/tmp/player"] = process.argv;
fs.mkdirSync(out, { recursive: true });

async function login(page) {
  await page.goto(base + "/login", { waitUntil: "networkidle" });
  if ((await page.locator("input[type=password]").count()) === 0) await page.getByText(/password|mot de passe/i).last().click();
  await page.fill("input[type=email]", process.env.QA_EMAIL);
  await page.fill("input[type=password]", process.env.QA_PASSWORD);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
}

async function inspect(page) {
  const p = page.locator("[data-testid=video-player]");
  await p.waitFor({ timeout: 8000 });
  await page.waitForTimeout(700);
  const surf = p.locator("[data-source]").first();
  const kind = await surf.getAttribute("data-source");
  const attr = async (sel, name) => ((await p.locator(sel).count()) ? p.locator(sel).first().getAttribute(name) : null);
  const iframe = await attr("iframe", "src");
  const video = await attr("video", "src");
  const link = await attr("[data-source] a", "href");
  const counter = (await p.locator("span.tabular").first().textContent({ timeout: 3000 }))?.trim();
  return { counter, kind, url: (iframe ?? video ?? link ?? "").replace(/\?.*$/, "").slice(0, 90) };
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const results = [];
  const runs = [
    ["/admin/library?view=grid", "library-grid", 8, "[class*='aspect-[9/16]']"],
    ["/admin/library?view=table", "library-table", 4, "tbody tr"],
    ["/admin/library?platform=instagram&scope=all", "library-ig", 4, "[class*='aspect-[9/16]']"],
    ["/admin/winning-ads", "winning-ads", 5, "[class*='aspect-[9/16]']"],
  ];
  for (const [path, name, n, sel] of runs) {
    await page.goto(base + path, { waitUntil: "domcontentloaded" });
    await page.locator(sel).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.locator(sel).first().click();
    for (let i = 0; i < n; i++) {
      const r = await inspect(page);
      results.push({ page: name, ...r });
      if (i === 0) await page.screenshot({ path: `${out}/${name}.png` });
      await page.keyboard.press("ArrowRight");
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    results.push({ page: name, closedWithEsc: (await page.locator("[data-testid=video-player]").count()) === 0 });
  }
  console.log(JSON.stringify({ results, errors: [...new Set(errors)] }, null, 1));
  await browser.close();
})();

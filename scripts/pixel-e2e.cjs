// Bout en bout du suivi Meta en prod : consentement → candidature → Lead navigateur (fbq) + Lead serveur (CAPI),
// même event_id (dédupliqué par Meta). fbevents.js est remplacé par un enregistreur : le pixel navigateur
// n'envoie rien, seule la CAPI parle à Meta. Ensuite : SQL pour vérifier meta_events puis nettoyer la candidature.
//   YAP_FILE=… node scripts/pixel-e2e.cjs <baseUrl> <outDir> <email>
const { chromium } = require("playwright");
const fs = require("fs");
const [, , base, out = "/tmp/pixel", email] = process.argv;
fs.mkdirSync(out, { recursive: true });

const STUB = `window.__fbqCalls = window.__fbqCalls || [];
(function(){ var f = window.fbq; if (f && f.queue) { f.queue.forEach(function(a){ window.__fbqCalls.push(a); }); f.queue.length = 0;
  f.callMethod = function(){ window.__fbqCalls.push([].slice.call(arguments)); }; } })();`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/connect.facebook.net/**", (r) => r.fulfill({ status: 200, contentType: "application/javascript", body: STUB }));
  await page.route("**://www.facebook.com/tr**", (r) => r.fulfill({ status: 204, body: "" }));

  await page.goto(`${base}/join/fr?lang=fr&utm_source=meta&fbclid=IwAR1pixelE2Etest42`, { waitUntil: "domcontentloaded" });
  await page.locator("[data-testid=consent-banner]").waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Accepter" }).click();
  await page.waitForTimeout(1500);
  // Le lien vers /apply garde fbclid (keptParams) ; on y va directement.
  await page.goto(`${base}/apply/fr?lang=fr&utm_source=meta&fbclid=IwAR1pixelE2Etest42`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  const inputs = [];
  for (const i of await page.locator("input:not([type]):visible, input[type=text]:visible").all()) if ((await i.getAttribute("name")) !== "website") inputs.push(i);
  await inputs[0].fill("Pixel");
  await inputs[1].fill("Test");
  await page.fill("input[type=date]", "2001-02-03");
  await page.fill("input[type=email]", email);
  await page.fill("input[type=tel]", "+33600000042");
  await page.setInputFiles("input[type=file]", process.env.YAP_FILE);
  await page.waitForSelector("text=/Vidéo envoyée|Video uploaded/", { timeout: 90000 });
  for (const c of await page.locator("input[type=checkbox]").all()) await c.check();
  await page.locator("button[type=submit]").click();
  await page.waitForTimeout(8000);
  await page.screenshot({ path: `${out}/apply-submitted-390.png` });
  const calls = await page.evaluate(() => window.__fbqCalls || []);
  const lead = calls.find((c) => c[0] === "track" && c[1] === "Lead");
  console.log(JSON.stringify({
    init: calls.filter((c) => c[0] === "init").map((c) => c[1]),
    events: calls.filter((c) => c[0] === "track").map((c) => c[1]),
    lead_event_id: lead?.[3]?.eventID ?? null,
    fbc: await page.evaluate(() => (document.cookie.match(/_fbc=([^;]+)/) || [])[1] || null),
    errors,
  }));
  await browser.close();
})().catch((e) => { console.error("ERREUR", e.message.split("\n")[0]); process.exit(1); });

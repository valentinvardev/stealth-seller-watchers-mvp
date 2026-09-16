// Drives the built SPA with system Chrome and screenshots the four Deals
// surfaces in both themes: the inbox, a store page, the search page in "by
// store" mode, and one email with its framed body. Same harness as
// snap-mentions.cjs. Exists so visual bugs get seen instead of guessed at.
//
//   node scripts/snap-deals.cjs [baseURL]   (default http://localhost:3010)
const path = require("path");
const { chromium } = require("playwright-core");

const BASE = process.argv[2] || "http://localhost:3010";
const OUT = path.join(__dirname, "..", "snaps");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

// the served entry hash, which is also the storage guard's key
let BUILD_KEY = null;

async function open(browser, theme) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  // the app reads its theme from localStorage, not prefers-color-scheme.
  // set it before any page script runs, together with the build key, or the
  // sandbox storage guard wipes it on this fresh context's first load.
  await context.addInitScript(
    ({ wanted, buildKey }) => {
      try {
        if (buildKey) localStorage.setItem("__sandbox_build", buildKey);
        localStorage.setItem("v3-theme", wanted);
      } catch {}
    },
    { wanted: theme, buildKey: BUILD_KEY },
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message.split("\n")[0].slice(0, 200)}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text().slice(0, 200)}`);
  });
  return { context, page, errors };
}

async function shoot(browser, theme, tag, route, ready, actions) {
  const { context, page, errors } = await open(browser, theme);
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
  await page.getByText(ready).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await actions?.(page);
  await page.screenshot({ path: path.join(OUT, `deals-${tag}-${theme}.png`), fullPage: false });
  console.log(`${tag} ${theme}: ${errors.length ? `ERRORS\n${errors.join("\n")}` : "no console errors"}`);
  await context.close();
}

(async () => {
  const html = await (await fetch(`${BASE}/`)).text();
  BUILD_KEY = (html.match(/assets\/(index-[A-Za-z0-9_-]+)\.js/) || [])[1] ?? null;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  for (const theme of ["dark", "light"]) {
    await shoot(browser, theme, "inbox", "/deals", "Deals inbox");
    await shoot(browser, theme, "brands", "/deals/brands", "Every store we receive email from");
    await shoot(browser, theme, "brand", "/deals/brands/kohl-s", "Active codes");
    // "30% off" parses into a pure filter (no leftover words), so the ready
    // signal is the subtitle, then a by-store row's open button
    await shoot(browser, theme, "search", "/deals/search?q=30%25%20off", "Reading it as", async (page) => {
      await page.getByRole("tab", { name: "By store" }).click();
      // the by-store row's chevron is a Link wearing Button chrome, so role link
      await page.getByRole("link", { name: /^Open / }).first().waitFor({ timeout: 15000 });
      await page.waitForTimeout(800);
    });
    // the Kohl's FALL30 row: an email that carries a code, so the offer card
    // shows the copy button; the iframe needs a beat to paint
    await shoot(browser, theme, "email", "/deals", "Deals inbox", async (page) => {
      await page.getByRole("link", { name: /FALL30/ }).first().click();
      await page.getByText("Copy code").first().waitFor({ timeout: 15000 });
      await page.waitForTimeout(1500);
    });
  }
  console.log("shots in", OUT);
  await browser.close();
})().catch((err) => {
  console.error("driver failed:", err.message);
  process.exit(1);
});

// Drives the built SPA with system Chrome and screenshots the mentions page:
// the fold and the bottom band in both themes (the page scrolls inside <main>,
// so a full-page shot would not reach the roster's lower bands), then the page
// after "About us" on the first inbox row so the handled line and the toast get
// looked at too. Exists so visual bugs get seen instead of guessed at.
//
//   node scripts/snap-mentions.cjs [baseURL]   (default http://localhost:3010)
const path = require("path");
const { chromium } = require("playwright-core");

const BASE = process.argv[2] || "http://localhost:3010";
const OUT = path.join(__dirname, "..", "snaps");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function shoot(browser, theme, tag, actions) {
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
  await page.goto(`${BASE}/mentions`, { waitUntil: "domcontentloaded" });
  await page.getByText("Who talked about us").first().waitFor({ timeout: 30000 });
  // a cold sandbox instance sweeps YouTube on the first overview call; give
  // the query, the entrance animation and the thumbnails time to settle
  await page.waitForTimeout(3500);
  await actions?.(page);
  await page.screenshot({ path: path.join(OUT, `me-${tag}-top.png`), fullPage: false });
  await page.evaluate(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = main.scrollHeight;
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `me-${tag}-bottom.png`), fullPage: false });
  console.log(`${tag}: ${errors.length ? `ERRORS\n${errors.join("\n")}` : "no console errors"}`);
  await context.close();
}

// the served entry hash, which is also the storage guard's key
let BUILD_KEY = null;

(async () => {
  const html = await (await fetch(`${BASE}/`)).text();
  BUILD_KEY = (html.match(/assets\/(index-[A-Za-z0-9_-]+)\.js/) || [])[1] ?? null;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  await shoot(browser, "dark", "dark");
  await shoot(browser, "light", "light");
  // the decision path: confirm the first candidate, expect the handled line
  await shoot(browser, "dark", "confirmed", async (page) => {
    // exact, or "Not about us" matches first and the shot shows a dismissal
    await page.getByRole("button", { name: "About us", exact: true }).first().click();
    await page.getByText(/About us:/).first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
  });
  console.log("shots in", OUT);
  await browser.close();
})().catch((err) => {
  console.error("driver failed:", err.message);
  process.exit(1);
});

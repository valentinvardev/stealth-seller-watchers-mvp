// Visits the app's main routes and reports page errors per route, so a crash
// that lives outside the watchers path gets found instead of guessed at.
//   node scripts/probe-routes.cjs [baseURL]
const { chromium } = require("playwright-core");

const BASE = process.argv[2] || "http://localhost:3010";
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ROUTES = ["/", "/product-feed", "/watchers", "/folders", "/sellers", "/bookmarks"];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await (await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  })).newPage();

  for (const route of ROUTES) {
    const errors = [];
    const onError = (err) => errors.push(err.message.split("\n")[0].slice(0, 160));
    page.on("pageerror", onError);
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(4000);
      const boundary = await page
        .getByText(/something went wrong/i)
        .count()
        .catch(() => 0);
      const url = page.url().replace(BASE, "");
      console.log(
        `${route.padEnd(14)} -> ${url.padEnd(16)} boundary:${boundary > 0 ? "SI" : "no"} pageerrors:${errors.length}`,
      );
      for (const e of errors.slice(0, 3)) console.log(`    ${e}`);
    } catch (err) {
      console.log(`${route.padEnd(14)} NAV FAIL: ${err.message.slice(0, 100)}`);
    }
    page.off("pageerror", onError);
  }
  await browser.close();
})().catch((err) => {
  console.error("probe failed:", err.message);
  process.exit(1);
});

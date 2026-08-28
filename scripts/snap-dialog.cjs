// Drives the built SPA with system Chrome and screenshots the three states
// under review: overview, the manage rows, and the watch detail dialog.
// Exists so visual bugs get looked at instead of guessed at.
//
//   node scripts/snap-dialog.cjs [baseURL]   (default http://localhost:3010)
const path = require("path");
const { chromium } = require("playwright-core");

const BASE = process.argv[2] || "http://localhost:3010";
const OUT = path.join(__dirname, "..", "snaps");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await (await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // 2x so 1px chrome (dot borders, inset lines) is actually judgeable
    deviceScaleFactor: 2,
    // the app reads prefers-color-scheme; take the dark shots, Will reviews in dark
    colorScheme: "dark",
  })).newPage();

  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text().slice(0, 200)}`);
  });

  await page.goto(`${BASE}/watchers`, { waitUntil: "domcontentloaded" });
  await page.getByText("My watches").first().waitFor({ timeout: 30000 });
  // let the framer entrance + dither canvases settle
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(OUT, "1-overview.png"), fullPage: false });

  await page.getByRole("tab", { name: "Manage" }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "2-manage.png") });
  // one row, cropped: the blinker's border chrome lives at 1px scale
  await page
    .locator('[role="button"]', { hasText: "BYRD" })
    .first()
    .screenshot({ path: path.join(OUT, "2b-row-zoom.png") });

  // second row = BYRD shampoo, the one from Will's screenshot
  const rows = page.locator('[role="button"]', { hasText: "BYRD" });
  await rows.first().click();
  await page.getByText("Price across checks").waitFor({ timeout: 10000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "3-dialog.png") });

  // hover the chart about two thirds across and capture the tooltip
  const chart = page.getByText("Price across checks").locator("..").locator("..").locator("div").last();
  const box = await chart.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.66, box.y + box.height * 0.5, { steps: 8 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(OUT, "4-dialog-hover.png") });
  } else {
    console.log("chart box not found, skipped hover shot");
  }

  console.log("shots in", OUT);
  console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "no console errors");
  await browser.close();
})().catch((err) => {
  console.error("driver failed:", err.message);
  process.exit(1);
});

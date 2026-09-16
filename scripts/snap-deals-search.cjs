// Drives the built SPA with system Chrome and screenshots the rebuilt
// three-pane search: by email, by store, and a words-plus-filter query.
// Also checks that picking a tile and a store row moves the pane and
// ?email=, keeping ?q=. Same harness as snap-deals.cjs.
//
//   node scripts/snap-deals-search.cjs [baseURL]   (default http://localhost:3010)
const path = require("path");
const { chromium } = require("playwright-core");

const BASE = process.argv[2] || "http://localhost:3010";
const OUT = path.join(__dirname, "..", "snaps");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const COUNT_LINE = /^\d+ (emails?|stores?) · \d+ (emails?|stores?)$/;

let BUILD_KEY = null;
const failures = [];

function check(label, ok, detail) {
  console.log((ok ? "ok   " : "FAIL ") + label + (detail ? "  (" + detail + ")" : ""));
  if (!ok) failures.push(label);
}

async function open(browser, theme) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
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
  page.on("pageerror", (err) => errors.push("pageerror: " + err.message.split("\n")[0].slice(0, 200)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("console: " + msg.text().slice(0, 200));
  });
  return { context, page, errors };
}

// the pane's subject line and the store link in its header
const paneSubject = async (page) => ((await page.locator("aside h3").first().textContent()) || "").trim();
const paneStore = async (page) => ((await page.locator("aside a[href^='/deals/brands/']").first().textContent()) || "").trim();
const emailParam = (page) => new URL(page.url()).searchParams.get("email");
const ready = (page) => page.locator("aside h3").first().waitFor({ timeout: 15000 });

async function shot(page, name) {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, "deals-search-v2-" + name + ".png"), fullPage: false });
  console.log("shot " + name);
}

function report(tag, errors) {
  console.log(errors.length ? tag + " ERRORS\n" + errors.join("\n") : tag + ": no console errors");
}

(async () => {
  const html = await (await fetch(BASE + "/")).text();
  BUILD_KEY = (html.match(/assets\/(index-[A-Za-z0-9_-]+)\.js/) || [])[1] || null;
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  // 1. by email: "30% off" reads as a pure filter (min 30%), tiles in the grid
  {
    const { context, page, errors } = await open(browser, "light");
    await page.goto(BASE + "/deals/search?q=30%25%20off", { waitUntil: "domcontentloaded" });
    await page.getByText("Reading it as").waitFor({ timeout: 30000 });
    await page.getByText(COUNT_LINE).waitFor({ timeout: 30000 });
    await ready(page);
    check("by email: intent chip", (await page.getByText("min 30%", { exact: true }).count()) === 1);
    console.log("by email: " + (await page.getByText(COUNT_LINE).first().textContent()));
    await shot(page, "1-by-email");

    const before = { subject: await paneSubject(page), email: emailParam(page) };
    check("by email: pane defaults to the first tile without writing ?email=", before.email === null && before.subject.length > 0, before.subject);
    const second = page.locator("button.group[aria-pressed]").nth(1);
    const subject = ((await second.locator("span.mt-2 > span").first().textContent()) || "").trim();
    await second.click();
    await page.waitForTimeout(600);
    const url = new URL(page.url());
    check("by email: tile click writes ?email= and keeps ?q=", url.searchParams.get("email") !== null && url.searchParams.get("q") === "30% off", url.search);
    check("by email: tile click moves the pane", (await paneSubject(page)) === subject && subject !== before.subject, before.subject + " -> " + subject);
    check("by email: clicked tile is the pressed one", (await second.getAttribute("aria-pressed")) === "true");
    report("by email", errors);
    await context.close();
  }

  // 2. by store: one row per store, the row body selects, the chevron links out
  for (const theme of ["light", "dark"]) {
    const { context, page, errors } = await open(browser, theme);
    await page.goto(BASE + "/deals/search?q=30%25%20off", { waitUntil: "domcontentloaded" });
    await page.getByText("Reading it as").waitFor({ timeout: 30000 });
    await page.getByRole("tab", { name: "By store" }).click();
    await page.getByRole("link", { name: /^Open / }).first().waitFor({ timeout: 15000 });
    await page.getByText(COUNT_LINE).waitFor({ timeout: 15000 });
    await ready(page);
    if (theme === "light") console.log("by store: " + (await page.getByText(COUNT_LINE).first().textContent()));
    await shot(page, theme === "light" ? "2-by-store" : "4-by-store-dark");
    if (theme === "light") {
      const rows = page.getByRole("button").filter({ hasText: /\d+ emails?/ });
      check("by store: rows rendered", (await rows.count()) > 1, (await rows.count()) + " rows");
      const before = { store: await paneStore(page), email: emailParam(page) };
      check("by store: first row is selected by default", (await rows.first().getAttribute("aria-pressed")) === "true" && before.store.length > 0, before.store);
      const second = rows.nth(1);
      const storeName = ((await second.locator("span.truncate").first().textContent()) || "").trim();
      await second.click();
      await page.waitForTimeout(600);
      const url = new URL(page.url());
      check("by store: row click writes ?email= and keeps ?q=", url.searchParams.get("email") !== null && url.searchParams.get("q") === "30% off", url.search);
      check("by store: row click moves the pane to that store", (await paneStore(page)) === storeName && storeName !== before.store, before.store + " -> " + storeName);
      check("by store: clicked row is the pressed one", (await second.getAttribute("aria-pressed")) === "true");
      const href = (await page.getByRole("link", { name: /^Open / }).nth(1).getAttribute("href")) || "";
      check("by store: chevron links to the store page", /^\/deals\/brands\/[a-z0-9-]+$/.test(href), href);
      await shot(page, "2b-by-store-selected");
    }
    report("by store " + theme, errors);
    await context.close();
  }

  // 3. words plus a filter: "skincare" stays a term, "free shipping" becomes a chip
  {
    const { context, page, errors } = await open(browser, "light");
    await page.goto(BASE + "/deals/search?q=skincare%20free%20shipping", { waitUntil: "domcontentloaded" });
    await page.getByText("Reading it as").waitFor({ timeout: 30000 });
    await page.getByText(COUNT_LINE).or(page.getByText("Nothing matches")).first().waitFor({ timeout: 30000 });
    check("skincare: term chip", (await page.getByText("\u201cskincare\u201d", { exact: true }).count()) === 1);
    check("skincare: free shipping chip", (await page.getByText("free shipping", { exact: true }).count()) === 1);
    const isEmpty = (await page.getByText("Nothing matches").count()) > 0;
    console.log("skincare free shipping: " + (isEmpty ? "no results (empty state shown)" : await page.getByText(COUNT_LINE).first().textContent()));
    check("skincare: filters still rendered", (await page.getByRole("tab", { name: "By store" }).count()) === 1);
    if (!isEmpty) await ready(page);
    await shot(page, "3-skincare-free-shipping");
    report("skincare", errors);
    await context.close();
  }

  await browser.close();
  console.log(failures.length ? "\n" + failures.length + " check(s) failed:\n- " + failures.join("\n- ") : "\nall checks passed; shots in " + OUT);
  process.exit(failures.length ? 1 : 0);
})().catch((err) => {
  console.error("driver failed:", err.message);
  process.exit(1);
});

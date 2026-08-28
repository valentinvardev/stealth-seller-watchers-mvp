// Scrapes the seed product URLs through Firecrawl and writes a fixture the
// backend loads at startup.
//
// Done once, offline, rather than at boot: the demo runs on a serverless
// function, so scraping on cold start would make every wake slow and burn
// Firecrawl credits for data that does not change between deploys.
//
//   FIRECRAWL_API_KEY=... node scripts/scrape-seed.mjs
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const KEY = process.env.FIRECRAWL_API_KEY;
if (!KEY) {
  console.error("set FIRECRAWL_API_KEY");
  process.exit(1);
}

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../backend/src/seed-products.json");

const URLS = [
  ["walmart", "https://www.walmart.com/ip/Musselman-s-Apple-Butter-28-oz-Jar/10291187"],
  ["walmart", "https://www.walmart.com/ip/BYRD-Purifying-Shampoo-Clear-Pump-Bottle-16-oz-All-Hair-Types/191709014"],
  ["target", "https://www.target.com/p/aphmau-mystery-squishy-figure-bakery/-/A-94992643"],
  ["homedepot", "https://www.homedepot.com/p/RYOBI-ONE-18V-Lithium-Ion-Cordless-Grass-Shear-and-Shrubber-Trimmer-Battery-and-Charger-Not-Included-P2900B/206485338"],
  ["homedepot", "https://www.homedepot.com/p/Andersen-Storm-Door-Black-Bump-Closer-Kit-42486/317248411"],
  ["jellycat", "https://us.jellycat.com/bashful-giraffe/"],
  ["jellycat", "https://us.jellycat.com/otto-sausage-dog/"],
  ["jellycat", "https://us.jellycat.com/little-fox/"],
  ["shopify", "https://www.rhodeskin.com/products/pocket-blush-toasted-teddy"],
  ["shopify", "https://www.onlynaturalpet.com/products/dr-marty-nature-s-blend-healthy-growth-freeze-dried-dog-food"],
  ["shopify", "https://creations.mattel.com/products/barbie-signature-birthday-wishes-fashion-doll-jjx78"],
  ["hobbylobby", "https://www.hobbylobby.com/fabric-sewing/fabric-stabilizer-interfacing/forcefield-fabric-protector-spray/p/81282677"],
  ["kohls", "https://www.kohls.com/product/prd-5530047/huda-beauty-liquid-matte-ultra-comfort-transfer-proof-lipstick.jsp"],
  ["nordstrom", "https://www.nordstrom.com/s/jellycat-bashful-giraffe-stuffed-animal/4906558"],
  ["gamestop", "https://www.gamestop.com/home/bedroom/throws-blankets/products/marvel-comics-oversized-fleece-sherpa-54-x-72-in-throw-blanket/20015189.html"],
];

// First plausible retail price. Skips $0 and anything with 3+ digits of cents,
// which is usually a phone number or an id that happens to follow a dollar sign.
function findPrice(text) {
  const matches = [...text.matchAll(/\$\s?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/g)];
  for (const m of matches) {
    const value = parseFloat(m[1].replace(/,/g, ""));
    if (value > 0 && value < 5000) return Math.round(value * 100);
  }
  return null;
}

// Titles arrive with the retailer and marketing tacked on; keep the product.
// The fallback takes the longest hyphenated path segment rather than the last
// one, which on most retailers is a numeric product id and reads as garbage.
function cleanTitle(raw, url) {
  if (!raw) {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    const slug = segments
      .filter((s) => /[a-z]{3}/i.test(s))
      .sort((a, b) => b.length - a.length)[0];
    return (slug ?? segments.pop() ?? url)
      .replace(/\.(html?|jsp)$/i, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 90);
  }
  return raw
    .split(/\s+[|\-–]\s+/)[0]
    .replace(/\s*:\s*Target$/i, "")
    .trim()
    .slice(0, 90);
}

async function scrape(url) {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, timeout: 45000 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || "scrape failed");
  return body.data ?? {};
}

const out = [];
for (const [retailer, url] of URLS) {
  process.stdout.write(`${retailer.padEnd(11)} ${url.slice(0, 62)} ... `);
  try {
    const data = await scrape(url);
    const meta = data.metadata ?? {};
    const entry = {
      url,
      retailer,
      title: cleanTitle(meta.ogTitle || meta.title, url),
      image: meta.ogImage || null,
      priceCents: findPrice(data.markdown ?? ""),
    };
    out.push(entry);
    console.log(`ok  ${entry.priceCents ? "$" + (entry.priceCents / 100).toFixed(2) : "sin precio"}`);
  } catch (err) {
    // A retailer that blocks scraping still belongs in the list -- the UI has a
    // "can't read the page" state and seeding one exercises it honestly.
    out.push({ url, retailer, title: cleanTitle(null, url), image: null, priceCents: null, failed: true });
    console.log(`FALLO (${err.message})`);
  }
}

writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log(`\n${out.length} productos -> ${OUT}`);
console.log(`con precio: ${out.filter((p) => p.priceCents).length}`);

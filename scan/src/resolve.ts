// Mock of the future UPC -> ASIN endpoint. Deterministic per code so the same
// barcode always shows the same product, with enough variety across codes to
// exercise every state the card has to handle: found, several ASINs behind
// one barcode, not on Amazon, and no signal. Swap the body for a tRPC call
// when the endpoint exists; the return shape is the contract.

export type Eligibility =
  | { status: "approved"; checkedAgo: string; source: string }
  | { status: "gated"; reason: string; checkedAgo: string; source: string }
  | { status: "unknown"; reason: string };

export type Product = {
  asin: string;
  title: string;
  brand: string;
  category: string;
  rank: number;
  rankPct: number;
  rating: number;
  reviews: number;
  avg90: number;
  buyBox: number;
  offersFba: number;
  offersFbm: number;
  soldMonthly: number | null; // Amazon only reports 50+
  fees: number;
  amazonOnListing: boolean;
  hazmat: boolean;
  consumable: boolean;
  eligibility: Eligibility;
};

export type Resolved =
  | { kind: "found"; product: Product }
  | { kind: "multi"; candidates: Product[] }
  | { kind: "notfound" };

export class OfflineError extends Error {
  constructor() {
    super("offline");
    this.name = "OfflineError";
  }
}

const CATALOG: Product[] = [
  {
    asin: "B0C4YGSCRB",
    title: "Yo Glow Enzyme Scrub, 2.5 oz",
    brand: "Wishful",
    category: "Beauty",
    rank: 4120,
    rankPct: 1,
    rating: 4.5,
    reviews: 3980,
    avg90: 50.23,
    buyBox: 48.72,
    offersFba: 2,
    offersFbm: 32,
    soldMonthly: 400,
    fees: 11.56,
    amazonOnListing: false,
    hazmat: false,
    consumable: false,
    eligibility: { status: "gated", reason: "Beauty needs approval on this account", checkedAgo: "3 d ago", source: "Seller Central" },
  },
  {
    asin: "B07QN7FZ7L",
    title: "Ninja Professional Blender 1000W, 72 oz",
    brand: "Ninja",
    category: "Home & Kitchen",
    rank: 890,
    rankPct: 1,
    rating: 4.7,
    reviews: 61200,
    avg90: 89.0,
    buyBox: 94.99,
    offersFba: 6,
    offersFbm: 2,
    soldMonthly: 250,
    fees: 21.4,
    amazonOnListing: true,
    hazmat: false,
    consumable: false,
    eligibility: { status: "approved", checkedAgo: "3 d ago", source: "Seller Central" },
  },
  {
    asin: "B08L6ZCS4Q",
    title: "Campbell's Chunky Chicken Noodle Soup, 12 pack",
    brand: "Campbell's",
    category: "Grocery",
    rank: 15300,
    rankPct: 2,
    rating: 1.9,
    reviews: 412,
    avg90: 24.1,
    buyBox: 23.5,
    offersFba: 0,
    offersFbm: 14,
    soldMonthly: 120,
    fees: 8.9,
    amazonOnListing: false,
    hazmat: false,
    consumable: true,
    eligibility: { status: "gated", reason: "Grocery needs approval on this account", checkedAgo: "9 d ago", source: "Seller Central" },
  },
  {
    asin: "B0BKJ8N5PL",
    title: "LEGO Icons Bonsai Tree 10281",
    brand: "LEGO",
    category: "Toys & Games",
    rank: 310,
    rankPct: 1,
    rating: 4.9,
    reviews: 28400,
    avg90: 34.99,
    buyBox: 41.5,
    offersFba: 18,
    offersFbm: 5,
    soldMonthly: 900,
    fees: 12.1,
    amazonOnListing: false,
    hazmat: false,
    consumable: false,
    eligibility: { status: "approved", checkedAgo: "12 d ago", source: "Seller Central" },
  },
  {
    asin: "B01N1UX8RW",
    title: "OPI Nail Lacquer, Big Apple Red, 0.5 fl oz",
    brand: "OPI",
    category: "Beauty",
    rank: 2210,
    rankPct: 1,
    rating: 4.6,
    reviews: 9870,
    avg90: 12.5,
    buyBox: 12.2,
    offersFba: 3,
    offersFbm: 9,
    soldMonthly: null,
    fees: 5.6,
    amazonOnListing: false,
    hazmat: true,
    consumable: false,
    eligibility: { status: "unknown", reason: "Sign in to Seller Central to check" },
  },
];

const BOOK: Product = {
  asin: "B09XY5Z2K1",
  title: "Atomic Habits (Hardcover)",
  brand: "Avery",
  category: "Books",
  rank: 12,
  rankPct: 1,
  rating: 4.8,
  reviews: 145000,
  avg90: 18.4,
  buyBox: 18.99,
  offersFba: 4,
  offersFbm: 22,
  soldMonthly: 60,
  fees: 6.2,
  amazonOnListing: true,
  hazmat: false,
  consumable: false,
  eligibility: { status: "approved", checkedAgo: "today", source: "Seller Central" },
};

function hash(code: string): number {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function resolve(code: string): Promise<Resolved> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new OfflineError();
  }
  const h = hash(code);
  await delay(350 + (h % 350)); // the real endpoint: local hit ~100 ms, Keepa miss 1 to 2 s

  // ISSN prefix: magazines and newspapers. Not sold on Amazon by barcode.
  if (code.startsWith("977")) return { kind: "notfound" };
  // ISBN prefixes: books.
  if (/^97[89]/.test(code)) return { kind: "found", product: BOOK };
  // One barcode, several ASINs (multipacks, variations). Keepa warns about this.
  if (code.endsWith("7")) {
    return { kind: "multi", candidates: [CATALOG[h % CATALOG.length], CATALOG[(h + 1) % CATALOG.length]] };
  }
  return { kind: "found", product: CATALOG[h % CATALOG.length] };
}

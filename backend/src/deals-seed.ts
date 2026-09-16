// Seed for the Deals pages: the brands, promo emails and extracted offers the
// deals-engine API reads out of Postgres, here as in-memory rows. Same rule as
// db.ts and overview-seed.ts: every id and timestamp is deterministic and
// anchored to the hour, so every serverless instance answers identically.
//
// Row shapes mirror deals-engine/packages/db/src/schema.ts ($inferSelect), down
// to numeric columns arriving as strings, so the frontend built against this
// seed keeps working when it is pointed at the real API.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const anchor = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;

export type BrandStatus = "pending" | "subscribed" | "confirmed" | "dead";
export type EmailKind = "promo" | "confirmation" | "transactional" | "other";
export type EmailSource = "file" | "imap" | "s3";
export type OfferKind = "percent" | "amount" | "bogo" | "free_shipping" | "gift_card" | "clearance" | "other";
export type OfferScope = "sitewide" | "category" | "product" | "unknown";

export type Brand = {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  logoUrl: string | null;
  category: string | null;
  signupUrl: string | null;
  signupProvider: string | null;
  signupRecipe: unknown;
  signupCheckedAt: Date | null;
  inboxAlias: string;
  status: BrandStatus;
  firstEmailAt: Date | null;
  lastEmailAt: Date | null;
  emailCount: number;
  followerCount: number;
  createdAt: Date;
};

export type Email = {
  id: string;
  brandId: string;
  messageId: string;
  kind: EmailKind;
  source: EmailSource;
  subject: string;
  preheader: string | null;
  fromName: string | null;
  fromAddress: string | null;
  recipient: string | null;
  receivedAt: Date;
  rawKey: string;
  htmlKey: string | null;
  screenshotKey: string | null;
  text: string;
  unsubscribeUrl: string | null;
  confirmationUrl: string | null;
  hasOffer: boolean;
  spamVerdict: string | null;
  tsv: string | null;
  createdAt: Date;
};

export type Offer = {
  id: string;
  emailId: string;
  brandId: string;
  kind: OfferKind;
  // numeric(10,2) in Postgres: drizzle hands it back as a string ("30.00")
  value: string | null;
  code: string | null;
  scope: OfferScope;
  categories: string[];
  minPurchase: string | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  exclusions: string | null;
  confidence: number;
  extractedBy: string;
  extractedAt: Date;
};

export const deals = {
  brands: [] as Brand[],
  emails: [] as Email[],
  offers: [] as Offer[],
  // email id -> sanitized HTML body; the blob store the real API reads from
  html: new Map<string, string>(),
  // the demo seller's follows, by brand slug. Per instance memory like
  // everything else here; seeded from FROM_STEALTH_SEED on boot.
  follows: new Set<string>(),
};

// --- deterministic ids -------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// RFC 4122 v4 shape from the seeded generator: the real ids are uuids and the
// html route plus emails.get validate the format
function uuidFrom(rng: () => number) {
  const chars: string[] = [];
  for (let i = 0; i < 32; i += 1) chars.push(Math.floor(rng() * 16).toString(16));
  chars[12] = "4";
  chars[16] = "89ab"[Math.floor(rng() * 4)];
  const s = chars.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

// deals-engine/packages/core/src/email/alias.ts, so "Kohl's" lands on kohl-s
// here exactly as it does in the real brands table
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// --- brands --------------------------------------------------------------------

// First wave of deals-engine/scripts/seed-brands.ts, minus the ones with no
// campaign written below. Chewy stays pending with no email so the directory
// has a "never emailed" row at the bottom, the way the real ordering puts it.
const BRAND_SEED: { name: string; domain: string; category: string; status: BrandStatus; accent: string; followers: number }[] = [
  { name: "Walmart", domain: "walmart.com", category: "general", status: "confirmed", accent: "#0053E2", followers: 412 },
  { name: "Target", domain: "target.com", category: "general", status: "confirmed", accent: "#CC0100", followers: 388 },
  { name: "Kohl's", domain: "kohls.com", category: "department", status: "confirmed", accent: "#870035", followers: 301 },
  { name: "Macy's", domain: "macys.com", category: "department", status: "confirmed", accent: "#E11B2B", followers: 264 },
  { name: "JCPenney", domain: "jcpenney.com", category: "department", status: "confirmed", accent: "#C8102E", followers: 158 },
  { name: "Sephora", domain: "sephora.com", category: "beauty", status: "confirmed", accent: "#000000", followers: 233 },
  { name: "Ulta Beauty", domain: "ulta.com", category: "beauty", status: "confirmed", accent: "#F97316", followers: 219 },
  { name: "Bath & Body Works", domain: "bathandbodyworks.com", category: "beauty", status: "confirmed", accent: "#4F8ABE", followers: 176 },
  { name: "Best Buy", domain: "bestbuy.com", category: "electronics", status: "confirmed", accent: "#0046BE", followers: 205 },
  { name: "GameStop", domain: "gamestop.com", category: "electronics", status: "subscribed", accent: "#D42026", followers: 97 },
  { name: "Home Depot", domain: "homedepot.com", category: "home", status: "confirmed", accent: "#F96302", followers: 142 },
  { name: "Nike", domain: "nike.com", category: "apparel", status: "confirmed", accent: "#111111", followers: 187 },
  { name: "Crocs", domain: "crocs.com", category: "apparel", status: "confirmed", accent: "#1E8E3E", followers: 121 },
  { name: "Old Navy", domain: "oldnavy.gap.com", category: "apparel", status: "confirmed", accent: "#003764", followers: 168 },
  { name: "Michaels", domain: "michaels.com", category: "crafts", status: "subscribed", accent: "#D6001C", followers: 64 },
  { name: "Chewy", domain: "chewy.com", category: "pets", status: "pending", accent: "#1C49C2", followers: 12 },
  // second wave, the community suggestions on the onboarding screen
  { name: "Dick's Sporting Goods", domain: "dickssportinggoods.com", category: "sports", status: "confirmed", accent: "#038D75", followers: 212 },
  { name: "Walgreens", domain: "walgreens.com", category: "pharmacy", status: "confirmed", accent: "#E31837", followers: 180 },
  { name: "LEGO", domain: "lego.com", category: "toys", status: "confirmed", accent: "#FFD504", followers: 154 },
];

// --- onboarding ------------------------------------------------------------------

// Why a store is on the onboarding screen. saved / found / watching come from
// the seller's own Stealth data (bookmarks, product searches, watchers);
// followers is the community signal for stores Stealth knows nothing about.
export type SuggestionReason = { kind: "saved" | "found" | "watching" | "followers"; count: number };

export type SuggestionSeed = {
  brand: string;
  reason: SuggestionReason;
  following: boolean;
  // the three numbers on the card. Pinned to the figures the design was
  // approved with rather than derived from the campaigns above, so the screen
  // demos the same story every time (a code-heavy Ulta, a sales-only Walmart).
  codesLive: number;
  bestPercent30d: number | null;
  emails30d: number;
  // "30% off", "up to 40%", "$10 off": the second half of the live line
  headline: string | null;
  // what the card says when nothing is live
  note: string | null;
  // the stealth-side categories a store belongs to, for the chips. A store can
  // sit in several; the client dedupes.
  categories: string[];
  // Chewy has no email in the seed at all; the quiet card needs a date to count from
  lastEmailAtOverride?: Date;
};

export const ONBOARDING_CATEGORIES: { id: string; label: string; selected: boolean }[] = [
  { id: "beauty", label: "Beauty", selected: true },
  { id: "home", label: "Home", selected: true },
  { id: "electronics", label: "Electronics", selected: true },
  { id: "toys", label: "Toys", selected: false },
  { id: "apparel", label: "Apparel", selected: false },
  { id: "grocery", label: "Grocery", selected: false },
  { id: "pets", label: "Pets", selected: false },
  { id: "office", label: "Office", selected: false },
];

// "Stores you already buy from": what the seller's Stealth account says about
// each store, pre-followed except the weakest signal
export const FROM_STEALTH_SEED: SuggestionSeed[] = [
  { brand: "Kohl's", reason: { kind: "saved", count: 14 }, following: true, codesLive: 1, bestPercent30d: 30, emails30d: 7, headline: "30% off", note: null, categories: ["home", "apparel"] },
  { brand: "Target", reason: { kind: "found", count: 9 }, following: true, codesLive: 1, bestPercent30d: 40, emails30d: 5, headline: "up to 40%", note: null, categories: ["home", "grocery", "toys"] },
  { brand: "Walmart", reason: { kind: "found", count: 7 }, following: true, codesLive: 0, bestPercent30d: null, emails30d: 4, headline: null, note: "Sales, rarely codes", categories: ["home", "grocery", "electronics"] },
  { brand: "Ulta Beauty", reason: { kind: "watching", count: 3 }, following: true, codesLive: 2, bestPercent30d: 50, emails30d: 12, headline: "50% off", note: null, categories: ["beauty"] },
  { brand: "Sephora", reason: { kind: "saved", count: 4 }, following: true, codesLive: 1, bestPercent30d: 20, emails30d: 6, headline: "20% off", note: null, categories: ["beauty"] },
  { brand: "Best Buy", reason: { kind: "found", count: 2 }, following: true, codesLive: 0, bestPercent30d: null, emails30d: 5, headline: null, note: "Last sale 2 days ago", categories: ["electronics"] },
  { brand: "Macy's", reason: { kind: "saved", count: 2 }, following: true, codesLive: 1, bestPercent30d: 70, emails30d: 8, headline: "70% off", note: null, categories: ["home", "apparel", "beauty"] },
  { brand: "Bath & Body Works", reason: { kind: "found", count: 1 }, following: false, codesLive: 0, bestPercent30d: null, emails30d: 9, headline: null, note: "Candle Day in 4 days", categories: ["beauty", "home"] },
];

// "More stores in what you sell": the community's picks per category. The
// four the design shows sit under the pre-selected chips (Beauty, Home,
// Electronics); the rest appear as chips get toggled on.
export const BY_CATEGORY_SEED: SuggestionSeed[] = [
  { brand: "Dick's Sporting Goods", reason: { kind: "followers", count: 212 }, following: false, codesLive: 3, bestPercent30d: 25, emails30d: 9, headline: null, note: null, categories: ["home", "apparel"] },
  { brand: "Walgreens", reason: { kind: "followers", count: 180 }, following: false, codesLive: 2, bestPercent30d: 25, emails30d: 6, headline: "25% off", note: null, categories: ["beauty", "grocery"] },
  { brand: "LEGO", reason: { kind: "followers", count: 154 }, following: false, codesLive: 0, bestPercent30d: null, emails30d: 3, headline: null, note: "Sales, rarely codes", categories: ["home", "toys"] },
  { brand: "GameStop", reason: { kind: "followers", count: 97 }, following: false, codesLive: 1, bestPercent30d: 20, emails30d: 3, headline: "$10 off", note: null, categories: ["electronics", "toys"] },
  { brand: "Nike", reason: { kind: "followers", count: 187 }, following: false, codesLive: 2, bestPercent30d: 25, emails30d: 4, headline: "25% off", note: null, categories: ["apparel"] },
  { brand: "Old Navy", reason: { kind: "followers", count: 168 }, following: false, codesLive: 3, bestPercent30d: 40, emails30d: 5, headline: "40% off", note: null, categories: ["apparel"] },
  { brand: "Crocs", reason: { kind: "followers", count: 121 }, following: false, codesLive: 2, bestPercent30d: 25, emails30d: 4, headline: "25% off", note: null, categories: ["apparel"] },
  { brand: "Michaels", reason: { kind: "followers", count: 64 }, following: false, codesLive: 1, bestPercent30d: 40, emails30d: 2, headline: "40% off", note: null, categories: ["office"] },
  { brand: "Chewy", reason: { kind: "followers", count: 12 }, following: false, codesLive: 0, bestPercent30d: null, emails30d: 0, headline: null, note: null, categories: ["pets"], lastEmailAtOverride: new Date(anchor - 45 * DAY_MS) },
];

// --- campaigns ------------------------------------------------------------------

type OfferSpec = {
  kind: OfferKind;
  value?: number;
  code?: string;
  scope?: OfferScope;
  // days after receipt the offer ends (end of that day, UTC); omit for no deadline
  endsIn?: number;
  minPurchase?: number;
  exclusions?: string;
  categories?: string[];
};

type Campaign = {
  brand: string;
  // days before the anchor the email arrived
  day: number;
  subject: string;
  preheader: string;
  body: string;
  offers: OfferSpec[];
};

// ~70 promo emails over the last 30 days. Subjects and offers are the shapes
// the rules extractor pulls out of real retail mail: a headline number, a
// printed code, a deadline, a minimum. Kohl's carries the FALL30 example the
// pages are demoed with.
const CAMPAIGNS: Campaign[] = [
  // Kohl's
  { brand: "Kohl's", day: 0.3, subject: "30% off with code FALL30, plus Kohl's Cash!", preheader: "Sitewide savings end Sunday. Earn $10 Kohl's Cash for every $50 you spend.", body: "Fall is here and so is your biggest offer of the season. Take 30% off sitewide with promo code FALL30, and earn $10 Kohl's Cash for every $50 you spend.", offers: [{ kind: "percent", value: 30, code: "FALL30", scope: "sitewide", endsIn: 3 }, { kind: "gift_card", value: 10, minPurchase: 50, endsIn: 3 }] },
  { brand: "Kohl's", day: 2.5, subject: "Extra 20% off your order: use code SAVE20", preheader: "Stack it on sale prices. Online only, ends Tuesday.", body: "Take an extra 20% off your entire order with promo code SAVE20 at checkout. Stacks on top of sale and clearance prices.", offers: [{ kind: "percent", value: 20, code: "SAVE20", scope: "sitewide", endsIn: 2 }] },
  { brand: "Kohl's", day: 6, subject: "Home sale: up to 50% off bedding and bath", preheader: "Plus free shipping on orders of $49 or more.", body: "Refresh every room. Up to 50% off bedding, bath towels, kitchen electrics and more, with free shipping on orders of $49 or more.", offers: [{ kind: "percent", value: 50, scope: "category", categories: ["home"], endsIn: 4 }, { kind: "free_shipping", minPurchase: 49, endsIn: 4 }] },
  { brand: "Kohl's", day: 11, subject: "Your $10 Kohl's Cash is here", preheader: "Spend it by Thursday, in store or online.", body: "You earned $10 Kohl's Cash on your last order. Redeem it on anything in store or online through Thursday.", offers: [{ kind: "gift_card", value: 10, endsIn: 4 }] },
  { brand: "Kohl's", day: 17, subject: "Flash sale: 40% off Nike and Under Armour", preheader: "Today only. Sneakers, hoodies, leggings and more.", body: "One day only: 40% off Nike and Under Armour apparel and footwear for the whole family. Sale ends tonight.", offers: [{ kind: "percent", value: 40, scope: "category", categories: ["activewear"], endsIn: 1 }] },
  { brand: "Kohl's", day: 24, subject: "Friends & Family: 25% off with code FAMILY25", preheader: "Five days of savings on everything you love.", body: "It's Friends & Family time. Take 25% off with promo code FAMILY25 through Sunday, in store and online.", offers: [{ kind: "percent", value: 25, code: "FAMILY25", scope: "sitewide", endsIn: 5 }] },
  { brand: "Kohl's", day: 29, subject: "Labor Day: up to 60% off + extra 15% with code LABORDAY", preheader: "Doorbusters on apparel, home and toys.", body: "Save up to 60% on select apparel, home and toys, then take an extra 15% off with promo code LABORDAY. Ends Monday.", offers: [{ kind: "percent", value: 60, scope: "category", endsIn: 2 }, { kind: "percent", value: 15, code: "LABORDAY", scope: "sitewide", endsIn: 2 }] },

  // Target
  { brand: "Target", day: 0.8, subject: "Circle Week starts now: save up to 40% on home, tech and more", preheader: "Members-only deals all week long.", body: "Target Circle Week is here. Save up to 40% on home, tech, apparel and toys through Saturday.", offers: [{ kind: "percent", value: 40, scope: "category", endsIn: 6 }] },
  { brand: "Target", day: 4, subject: "Buy 2 get 1 free on toys, books and movies", preheader: "Mix and match. Ends Sunday.", body: "Buy two, get one free on toys, books, movies and video games. Mix and match across categories, online and in store.", offers: [{ kind: "bogo", scope: "category", categories: ["toys", "books", "movies"], endsIn: 3 }] },
  { brand: "Target", day: 9, subject: "$10 gift card when you spend $50 on household essentials", preheader: "Paper towels, laundry, cleaning and more.", body: "Get a $10 Target gift card when you spend $50 or more on household essentials. Offer valid through Saturday.", offers: [{ kind: "gift_card", value: 10, minPurchase: 50, scope: "category", categories: ["household"], endsIn: 6 }] },
  { brand: "Target", day: 15, subject: "20% off one pantry item with Target Circle", preheader: "Snacks, coffee, cereal, your pick.", body: "Save 20% on one pantry item of your choice with Target Circle. Add the offer in the app and it applies at checkout.", offers: [{ kind: "percent", value: 20, scope: "product", categories: ["grocery"], endsIn: 7 }] },
  { brand: "Target", day: 22, subject: "Back-to-school clearance: up to 70% off", preheader: "Backpacks, lunch boxes and supplies while they last.", body: "Back-to-school clearance is on. Up to 70% off backpacks, lunch boxes, notebooks and dorm essentials while supplies last.", offers: [{ kind: "clearance", scope: "category", categories: ["school"], endsIn: 6 }, { kind: "percent", value: 70, scope: "category", categories: ["school"], endsIn: 6 }] },
  { brand: "Target", day: 27, subject: "Free same-day delivery on $35+ this week", preheader: "No membership needed, through Sunday.", body: "Get free same-day delivery on orders of $35 or more all week, no membership required.", offers: [{ kind: "free_shipping", minPurchase: 35, endsIn: 6 }] },

  // Walmart
  { brand: "Walmart", day: 1.2, subject: "Rollbacks on everything for fall", preheader: "Up to 25% off home, apparel and outdoor.", body: "New rollbacks just dropped. Save up to 25% on fall home decor, apparel, outdoor gear and more.", offers: [{ kind: "percent", value: 25, scope: "category", endsIn: 10 }] },
  { brand: "Walmart", day: 5.5, subject: "Flash Deals: up to 65% off electronics, today only", preheader: "TVs, laptops, headphones. Gone at midnight.", body: "Flash Deals are live. Up to 65% off TVs, laptops, tablets and headphones, today only while supplies last.", offers: [{ kind: "percent", value: 65, scope: "category", categories: ["electronics"], endsIn: 0 }] },
  { brand: "Walmart", day: 13, subject: "Free shipping, no minimum, with Walmart+", preheader: "Try it free for 30 days.", body: "Walmart+ members get free shipping with no order minimum, plus free delivery from your store. Start a free 30-day trial.", offers: [{ kind: "free_shipping", endsIn: 14 }] },
  { brand: "Walmart", day: 19, subject: "Clearance: thousands of items under $10", preheader: "Home, toys, beauty and more.", body: "Thousands of clearance items are now under $10 across home, toys, beauty and pantry. Shop before they're gone.", offers: [{ kind: "clearance", scope: "category", endsIn: 10 }] },
  { brand: "Walmart", day: 26, subject: "Deals for Days: up to 50% off", preheader: "Four days of deals across every department.", body: "Deals for Days is on: up to 50% off across every department, online and in store, through Monday.", offers: [{ kind: "percent", value: 50, scope: "category", endsIn: 4 }] },

  // Macy's
  { brand: "Macy's", day: 0.6, subject: "One Day Sale: 50-70% off + extra 20% with code ONEDAY", preheader: "Today only. Specials all day long.", body: "It's our One Day Sale: 50-70% off select styles, plus take an extra 20% off with promo code ONEDAY. Ends tonight.", offers: [{ kind: "percent", value: 70, scope: "category", endsIn: 1 }, { kind: "percent", value: 20, code: "ONEDAY", scope: "sitewide", endsIn: 1 }] },
  { brand: "Macy's", day: 3.2, subject: "Free shipping on $25+ today", preheader: "Plus free returns, always.", body: "Free shipping on orders of $25 or more, today only. Free returns on everything, always.", offers: [{ kind: "free_shipping", minPurchase: 25, endsIn: 0 }] },
  { brand: "Macy's", day: 8, subject: "Extra 30% off with code VIP", preheader: "VIP Sale: three days of extra savings.", body: "The VIP Sale is on. Take an extra 30% off with promo code VIP on select styles through Sunday. Excludes Specials and Everyday Values.", offers: [{ kind: "percent", value: 30, code: "VIP", scope: "sitewide", endsIn: 3, exclusions: "Excludes Specials, Everyday Values, Last Act" }] },
  { brand: "Macy's", day: 14, subject: "Beauty: pick your free gift with any $50 purchase", preheader: "Choose from Clinique, Lancome and more.", body: "Pick your free 7-piece beauty gift with any $50 purchase from Clinique, Lancome, Estee Lauder and more.", offers: [{ kind: "other", minPurchase: 50, scope: "category", categories: ["beauty"], endsIn: 5 }] },
  { brand: "Macy's", day: 21, subject: "Star Money Days: $10 off every $50 with code STAR", preheader: "Star Rewards members earn 3x points too.", body: "Star Money Days are here. Take $10 off every $50 you spend with promo code STAR, and earn bonus points on every purchase.", offers: [{ kind: "amount", value: 10, code: "STAR", minPurchase: 50, scope: "sitewide", endsIn: 4 }] },
  { brand: "Macy's", day: 28, subject: "Labor Day Sale: 40-60% off + extra 15% with code LABOR", preheader: "Plus Specials all weekend.", body: "Labor Day Sale: 40-60% off select styles, plus an extra 15% off with promo code LABOR. Ends Monday.", offers: [{ kind: "percent", value: 60, scope: "category", endsIn: 3 }, { kind: "percent", value: 15, code: "LABOR", scope: "sitewide", endsIn: 3 }] },

  // JCPenney
  { brand: "JCPenney", day: 1.7, subject: "Extra 30% off with code SHOP4FALL", preheader: "Sweaters, denim, boots and more.", body: "Take an extra 30% off select apparel, shoes and home with promo code SHOP4FALL. Ends Sunday.", offers: [{ kind: "percent", value: 30, code: "SHOP4FALL", scope: "sitewide", endsIn: 3 }] },
  { brand: "JCPenney", day: 7, subject: "$10 off $25 in store and online: code 10OFF25", preheader: "Your coupon is inside.", body: "Here's your coupon: $10 off a purchase of $25 or more with promo code 10OFF25, in store and online through Saturday.", offers: [{ kind: "amount", value: 10, code: "10OFF25", minPurchase: 25, scope: "sitewide", endsIn: 4 }] },
  { brand: "JCPenney", day: 12, subject: "Buy one get one 50% off on kids apparel", preheader: "Arizona, Okie Dokie and Thereabouts.", body: "Buy one, get one 50% off on kids apparel from Arizona, Okie Dokie and Thereabouts. Mix and match sizes.", offers: [{ kind: "bogo", scope: "category", categories: ["kids"], endsIn: 6 }] },
  { brand: "JCPenney", day: 20, subject: "Doorbusters: up to 60% off, ends tonight", preheader: "Towels, cookware, sheets and more.", body: "Doorbusters end tonight: up to 60% off towels, cookware, sheets and small appliances.", offers: [{ kind: "percent", value: 60, scope: "category", categories: ["home"], endsIn: 0 }] },
  { brand: "JCPenney", day: 25, subject: "Extra 25% off sale styles with code GOBIG", preheader: "Two days only.", body: "Take an extra 25% off sale styles with promo code GOBIG. Two days only, online and in store.", offers: [{ kind: "percent", value: 25, code: "GOBIG", scope: "category", endsIn: 2 }] },

  // Sephora
  { brand: "Sephora", day: 0.4, subject: "Beauty Insider: 20% off with code YAYSAVE", preheader: "The Savings Event is on for all members.", body: "The Beauty Insider Savings Event is here. Take 20% off with promo code YAYSAVE, online and in store, through the 24th.", offers: [{ kind: "percent", value: 20, code: "YAYSAVE", scope: "sitewide", endsIn: 9 }] },
  { brand: "Sephora", day: 5, subject: "Free shipping on every order this week", preheader: "No minimum. Ends Sunday.", body: "Free standard shipping on every order this week, no minimum required.", offers: [{ kind: "free_shipping", endsIn: 6 }] },
  { brand: "Sephora", day: 10, subject: "New: 15% off fragrance for Rouge members", preheader: "Fall scents from Dior, YSL and Valentino.", body: "Rouge members: take 15% off fragrance this week, including new arrivals from Dior, YSL and Valentino.", offers: [{ kind: "percent", value: 15, scope: "category", categories: ["fragrance"], endsIn: 5 }] },
  { brand: "Sephora", day: 18, subject: "Sale: up to 50% off select brands", preheader: "Makeup, skincare and hair, while supplies last.", body: "Up to 50% off select makeup, skincare and hair care brands while supplies last.", offers: [{ kind: "percent", value: 50, scope: "category", endsIn: 7 }] },
  { brand: "Sephora", day: 23, subject: "Get a free 4-piece gift with $75 purchase, code GLOW", preheader: "Skincare minis from Drunk Elephant and Tatcha.", body: "Spend $75 and get a free 4-piece skincare gift with promo code GLOW at checkout. While supplies last.", offers: [{ kind: "other", code: "GLOW", minPurchase: 75, scope: "sitewide", endsIn: 5 }] },

  // Ulta Beauty
  { brand: "Ulta Beauty", day: 1.1, subject: "21 Days of Beauty: 50% off daily beauty steals", preheader: "New steals every day through the 30th.", body: "21 Days of Beauty is back. Get 50% off a new set of beauty steals every day through the 30th.", offers: [{ kind: "percent", value: 50, scope: "product", endsIn: 18 }] },
  { brand: "Ulta Beauty", day: 4.5, subject: "$3.50 off $15: use code 350OFF", preheader: "Your coupon is ready.", body: "Save $3.50 on any purchase of $15 or more with coupon code 350OFF. Valid through Saturday.", offers: [{ kind: "amount", value: 3.5, code: "350OFF", minPurchase: 15, scope: "sitewide", endsIn: 4 }] },
  { brand: "Ulta Beauty", day: 9.5, subject: "20% off your entire purchase with code 20OFF", preheader: "Excludes prestige brands. Ends Sunday.", body: "Take 20% off your entire purchase with promo code 20OFF. Excludes prestige brands and gift cards.", offers: [{ kind: "percent", value: 20, code: "20OFF", scope: "sitewide", endsIn: 5, exclusions: "Excludes prestige brands, gift cards" }] },
  { brand: "Ulta Beauty", day: 16, subject: "Free shipping on $35+ orders", preheader: "Every day, no code needed.", body: "Free standard shipping on every order of $35 or more, no code needed.", offers: [{ kind: "free_shipping", minPurchase: 35, endsIn: 30 }] },
  { brand: "Ulta Beauty", day: 22.5, subject: "Buy 2 get 1 free on skincare", preheader: "Cleansers, serums, moisturizers and more.", body: "Buy two, get one free on select skincare from CeraVe, The Ordinary, Good Molecules and more.", offers: [{ kind: "bogo", scope: "category", categories: ["skincare"], endsIn: 6 }] },

  // Bath & Body Works
  { brand: "Bath & Body Works", day: 0.2, subject: "Candle Day preview: 3-wick candles $9.95", preheader: "Rewards members shop early.", body: "Rewards members get early access to Candle Day: all 3-wick candles are $9.95 for two days.", offers: [{ kind: "other", scope: "category", categories: ["candles"], endsIn: 2 }] },
  { brand: "Bath & Body Works", day: 3.8, subject: "Buy 3 get 3 free on body care", preheader: "Lotions, creams, mists and washes.", body: "Buy three, get three free on all body care: lotions, body creams, fragrance mists and shower gels.", offers: [{ kind: "bogo", scope: "category", categories: ["body care"], endsIn: 3 }] },
  { brand: "Bath & Body Works", day: 8.5, subject: "$10 off $30 with code AUTUMN10", preheader: "Your fall coupon is here.", body: "Save $10 on any purchase of $30 or more with promo code AUTUMN10, in store and online through Saturday.", offers: [{ kind: "amount", value: 10, code: "AUTUMN10", minPurchase: 30, scope: "sitewide", endsIn: 4 }] },
  { brand: "Bath & Body Works", day: 13.5, subject: "20% off everything with code FALLYALL", preheader: "Two days only.", body: "Take 20% off everything with promo code FALLYALL. Two days only.", offers: [{ kind: "percent", value: 20, code: "FALLYALL", scope: "sitewide", endsIn: 2 }] },
  { brand: "Bath & Body Works", day: 19.5, subject: "Semi-annual sale: up to 75% off", preheader: "Candles, soaps and body care while they last.", body: "The Semi-Annual Sale is here. Up to 75% off candles, hand soaps and body care while supplies last.", offers: [{ kind: "percent", value: 75, scope: "category", endsIn: 9 }, { kind: "clearance", scope: "category", endsIn: 9 }] },
  { brand: "Bath & Body Works", day: 26.5, subject: "Free shipping on $50+ today only", preheader: "No code needed.", body: "Free shipping on orders of $50 or more, today only. No code needed.", offers: [{ kind: "free_shipping", minPurchase: 50, endsIn: 0 }] },

  // Best Buy
  { brand: "Best Buy", day: 0.9, subject: "3-day sale: save up to $500 on laptops", preheader: "MacBook, Surface, Lenovo and more.", body: "Three days only: save up to $500 on select laptops from Apple, Microsoft, Lenovo and HP.", offers: [{ kind: "amount", value: 500, scope: "category", categories: ["laptops"], endsIn: 2 }] },
  { brand: "Best Buy", day: 6.5, subject: "Open-box deals: extra 10% off with code OPENBOX10", preheader: "Certified open-box, full warranty.", body: "Take an extra 10% off certified open-box products with promo code OPENBOX10. Full manufacturer warranty included.", offers: [{ kind: "percent", value: 10, code: "OPENBOX10", scope: "category", categories: ["open-box"], endsIn: 5 }] },
  { brand: "Best Buy", day: 14.5, subject: "Weekend deals: TVs from $299", preheader: "Samsung, LG, Sony and TCL.", body: "This weekend only: 4K TVs from $299, plus deals on soundbars and streaming devices.", offers: [{ kind: "other", scope: "category", categories: ["tv"], endsIn: 2 }] },
  { brand: "Best Buy", day: 21.5, subject: "Members save an extra $20 on $100+", preheader: "My Best Buy Plus and Total members only.", body: "My Best Buy Plus and Total members: save an extra $20 on purchases of $100 or more through Sunday.", offers: [{ kind: "amount", value: 20, minPurchase: 100, scope: "sitewide", endsIn: 3 }] },
  { brand: "Best Buy", day: 27.5, subject: "Labor Day appliance sale: up to 40% off", preheader: "Refrigerators, ranges, washers and dryers.", body: "Labor Day appliance sale: up to 40% off major appliances from Samsung, LG, Whirlpool and GE.", offers: [{ kind: "percent", value: 40, scope: "category", categories: ["appliances"], endsIn: 3 }] },

  // GameStop
  { brand: "GameStop", day: 2.2, subject: "Pro Week: 20% off pre-owned with code PROWEEK", preheader: "Pros save on games, consoles and accessories.", body: "Pro Week is here. Pro members take 20% off pre-owned games and accessories with promo code PROWEEK.", offers: [{ kind: "percent", value: 20, code: "PROWEEK", scope: "category", categories: ["pre-owned"], endsIn: 5 }] },
  { brand: "GameStop", day: 12.5, subject: "Buy 2 get 1 free on pre-owned games", preheader: "Every platform, while supplies last.", body: "Buy two pre-owned games, get one free. Every platform, in store and online while supplies last.", offers: [{ kind: "bogo", scope: "category", categories: ["pre-owned"], endsIn: 7 }] },
  { brand: "GameStop", day: 23.5, subject: "Trade credit bonus: extra 30% on trade-ins", preheader: "Pros get 40%.", body: "Get an extra 30% trade credit on games and consoles this week. Pro members get 40%.", offers: [{ kind: "other", scope: "category", endsIn: 4 }] },

  // Home Depot
  { brand: "Home Depot", day: 1.5, subject: "Fall savings: up to 35% off outdoor power", preheader: "Mowers, blowers and trimmers.", body: "Fall savings are on: up to 35% off outdoor power equipment from Ryobi, EGO and Milwaukee.", offers: [{ kind: "percent", value: 35, scope: "category", categories: ["outdoor"], endsIn: 12 }] },
  { brand: "Home Depot", day: 7.5, subject: "Special buy of the day: 40% off tool storage", preheader: "Today only, while supplies last.", body: "Special Buy of the Day: 40% off tool chests, cabinets and workbenches. Today only.", offers: [{ kind: "percent", value: 40, scope: "category", categories: ["tool storage"], endsIn: 0 }] },
  { brand: "Home Depot", day: 15.5, subject: "Free delivery on orders $45+", preheader: "Over one million eligible items.", body: "Free delivery on over one million eligible items when you spend $45 or more.", offers: [{ kind: "free_shipping", minPurchase: 45, endsIn: 30 }] },
  { brand: "Home Depot", day: 24.5, subject: "Labor Day: up to 40% off appliances + $100 off $1,000", preheader: "Plus free delivery on appliances $396+.", body: "Labor Day appliance savings: up to 40% off select appliances, plus $100 off purchases of $1,000 or more.", offers: [{ kind: "percent", value: 40, scope: "category", categories: ["appliances"], endsIn: 4 }, { kind: "amount", value: 100, minPurchase: 1000, scope: "category", categories: ["appliances"], endsIn: 4 }] },

  // Nike
  { brand: "Nike", day: 0.5, subject: "Members: extra 25% off sale with code SPORT25", preheader: "Sale styles just got better.", body: "Members take an extra 25% off sale styles with promo code SPORT25. Ends Sunday.", offers: [{ kind: "percent", value: 25, code: "SPORT25", scope: "category", categories: ["sale"], endsIn: 4 }] },
  { brand: "Nike", day: 6.8, subject: "Free shipping for Members, always", preheader: "Join for free and never pay for shipping.", body: "Nike Members always get free standard shipping and 60-day returns. Join for free.", offers: [{ kind: "free_shipping" }] },
  { brand: "Nike", day: 13.8, subject: "Up to 40% off new markdowns", preheader: "Running, training and lifestyle.", body: "New markdowns just landed: up to 40% off running shoes, training gear and lifestyle styles.", offers: [{ kind: "percent", value: 40, scope: "category", categories: ["sale"], endsIn: 8 }] },
  { brand: "Nike", day: 21.8, subject: "Back to sport: 20% off select styles, code BTS20", preheader: "Kids and adults, through Sunday.", body: "Back to sport: 20% off select styles for kids and adults with promo code BTS20.", offers: [{ kind: "percent", value: 20, code: "BTS20", scope: "category", endsIn: 6 }] },

  // Crocs
  { brand: "Crocs", day: 1.9, subject: "25% off sitewide with code FALL25", preheader: "Clogs, sandals, Jibbitz and more.", body: "Take 25% off sitewide with promo code FALL25. Clogs, sandals, slides and Jibbitz charms, through Saturday.", offers: [{ kind: "percent", value: 25, code: "FALL25", scope: "sitewide", endsIn: 4 }] },
  { brand: "Crocs", day: 9.8, subject: "Buy 2 pairs, get 1 free", preheader: "Stock up for the whole family.", body: "Buy two pairs, get a third free on select styles for the whole family.", offers: [{ kind: "bogo", scope: "category", endsIn: 5 }] },
  { brand: "Crocs", day: 18.5, subject: "Clearance: styles from $19.99", preheader: "Limited sizes, while supplies last.", body: "Clearance styles from $19.99 while supplies last. Limited sizes and colors.", offers: [{ kind: "clearance", scope: "category", endsIn: 12 }] },
  { brand: "Crocs", day: 26.8, subject: "Extra 20% off clearance with code EXTRA20", preheader: "Three days only.", body: "Take an extra 20% off clearance styles with promo code EXTRA20. Three days only.", offers: [{ kind: "percent", value: 20, code: "EXTRA20", scope: "category", categories: ["clearance"], endsIn: 3 }] },

  // Old Navy
  { brand: "Old Navy", day: 0.1, subject: "50% off all jeans, today only", preheader: "Every wash, every fit, adults and kids.", body: "Today only: 50% off all jeans for the whole family. Every wash, every fit, in store and online.", offers: [{ kind: "percent", value: 50, scope: "category", categories: ["jeans"], endsIn: 0 }] },
  { brand: "Old Navy", day: 3.5, subject: "Extra 30% off with code EXTRA", preheader: "Stacks on sale. Two days only.", body: "Take an extra 30% off your purchase with promo code EXTRA. Stacks on sale prices, two days only.", offers: [{ kind: "percent", value: 30, code: "EXTRA", scope: "sitewide", endsIn: 2 }] },
  { brand: "Old Navy", day: 10.5, subject: "40% off everything, no exclusions", preheader: "Yes, everything. Ends Tuesday.", body: "40% off everything, no exclusions, in store and online through Tuesday.", offers: [{ kind: "percent", value: 40, scope: "sitewide", endsIn: 2 }] },
  { brand: "Old Navy", day: 17.5, subject: "Free shipping on $50+ with code SHIP50", preheader: "Plus new fall arrivals.", body: "Free shipping on orders of $50 or more with promo code SHIP50. Plus, new fall arrivals just dropped.", offers: [{ kind: "free_shipping", code: "SHIP50", minPurchase: 50, endsIn: 6 }] },
  { brand: "Old Navy", day: 24.8, subject: "Labor Day: up to 60% off + 20% off with code YAY", preheader: "Four days of deals.", body: "Labor Day deals: up to 60% off select styles, plus take 20% off your purchase with promo code YAY.", offers: [{ kind: "percent", value: 60, scope: "category", endsIn: 3 }, { kind: "percent", value: 20, code: "YAY", scope: "sitewide", endsIn: 3 }] },

  // Michaels
  { brand: "Michaels", day: 4.2, subject: "40% off one regular price item with code 40SAVE", preheader: "Your weekly coupon.", body: "Take 40% off one regular price item with coupon code 40SAVE, in store and online through Saturday.", offers: [{ kind: "percent", value: 40, code: "40SAVE", scope: "product", endsIn: 3 }] },
  { brand: "Michaels", day: 16.5, subject: "Fall decor: 50% off all pumpkins and florals", preheader: "Plus 30% off frames.", body: "Fall decor is 50% off: pumpkins, florals, wreaths and garlands. Plus 30% off custom frames.", offers: [{ kind: "percent", value: 50, scope: "category", categories: ["decor"], endsIn: 10 }] },

  // Dick's Sporting Goods: three codes running at once, the community card
  { brand: "Dick's Sporting Goods", day: 0.1, subject: "25% off select apparel with code SAVE25", preheader: "Nike, Under Armour, The North Face and more. Ends Thursday.", body: "Take 25% off select apparel from Nike, Under Armour, The North Face and more with promo code SAVE25. Online and in store through Thursday.", offers: [{ kind: "percent", value: 25, code: "SAVE25", scope: "category", categories: ["apparel"], endsIn: 4 }] },
  { brand: "Dick's Sporting Goods", day: 3, subject: "$20 off $100 with code SCORE20", preheader: "Your ScoreCard coupon is here.", body: "ScoreCard members: take $20 off your purchase of $100 or more with promo code SCORE20, in store and online through Sunday.", offers: [{ kind: "amount", value: 20, code: "SCORE20", minPurchase: 100, scope: "sitewide", endsIn: 5 }] },
  { brand: "Dick's Sporting Goods", day: 7, subject: "Buy one, get one 50% off on footwear", preheader: "Running, training, cleats and slides.", body: "Buy one pair, get a second 50% off on select footwear for the whole family. Mix and match brands and sizes.", offers: [{ kind: "bogo", scope: "category", categories: ["footwear"], endsIn: 3 }] },
  { brand: "Dick's Sporting Goods", day: 12, subject: "Free shipping on $49+ with code SHIP49", preheader: "Plus curbside pickup in an hour.", body: "Get free shipping on orders of $49 or more with promo code SHIP49, or pick up curbside in an hour.", offers: [{ kind: "free_shipping", code: "SHIP49", minPurchase: 49, endsIn: 20 }] },

  // Walgreens
  { brand: "Walgreens", day: 0.5, subject: "25% off regular price items with code FALL25", preheader: "Vitamins, beauty, household and more. Ends Sunday.", body: "Take 25% off regular price items sitewide with promo code FALL25. Excludes prescriptions, photo and gift cards. Ends Sunday.", offers: [{ kind: "percent", value: 25, code: "FALL25", scope: "sitewide", endsIn: 3, exclusions: "Excludes prescriptions, photo, gift cards" }] },
  { brand: "Walgreens", day: 4, subject: "Buy 1, get 1 50% off on vitamins and supplements", preheader: "Nature Made, Centrum, Olly and more.", body: "Buy one, get one 50% off on select vitamins and supplements from Nature Made, Centrum, Olly and more. Mix and match.", offers: [{ kind: "bogo", scope: "category", categories: ["vitamins"], endsIn: 5 }] },
  { brand: "Walgreens", day: 9, subject: "$10 off $40 with code TENOFF", preheader: "Your myWalgreens coupon, ready to clip.", body: "myWalgreens members: save $10 on any purchase of $40 or more with promo code TENOFF, online only, through the end of the month.", offers: [{ kind: "amount", value: 10, code: "TENOFF", minPurchase: 40, scope: "sitewide", endsIn: 25 }] },
  { brand: "Walgreens", day: 16, subject: "Photo: 50% off prints and enlargements", preheader: "Same day pickup in store.", body: "Take 50% off prints and enlargements this week, ready for same day pickup in store.", offers: [{ kind: "percent", value: 50, scope: "category", categories: ["photo"], endsIn: 6 }] },

  // LEGO: promos without codes, so the card reads "Sales, rarely codes"
  { brand: "LEGO", day: 1.4, subject: "Double VIP points on everything this weekend", preheader: "Insiders earn 2x through Sunday.", body: "LEGO Insiders earn double points on every purchase this weekend, online and in LEGO stores. Points add up to rewards on your next order.", offers: [{ kind: "other", scope: "sitewide", endsIn: 4 }] },
  { brand: "LEGO", day: 6, subject: "Free gift with purchases of $100 or more", preheader: "The exclusive Halloween set, while supplies last.", body: "Get the exclusive Halloween mini set free with purchases of $100 or more. While supplies last.", offers: [{ kind: "other", minPurchase: 100, scope: "sitewide", endsIn: 8 }] },
  { brand: "LEGO", day: 14, subject: "Sale: up to 30% off select sets", preheader: "Star Wars, City, Technic and more.", body: "Save up to 30% on select sets from Star Wars, City, Technic and Friends while they last.", offers: [{ kind: "percent", value: 30, scope: "category", endsIn: 10 }] },
];

// --- html --------------------------------------------------------------------------

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function offerLine(offer: OfferSpec) {
  const n = offer.value ?? 0;
  switch (offer.kind) {
    case "percent":
      return `${n}% off`;
    case "amount":
      return `$${Number.isInteger(n) ? n : n.toFixed(2)} off`;
    case "bogo":
      return "Buy one, get one";
    case "free_shipping":
      return "Free shipping";
    case "gift_card":
      return `$${n} gift card`;
    case "clearance":
      return "Clearance";
    default:
      return "Special offer";
  }
}

// The sanitized body the real pipeline would keep after sanitize-html: tables,
// inline styles, no scripts, no external images. What the iframe on the email
// page renders.
function renderEmailHtml(brand: Brand, campaign: Campaign, accent: string, receivedAt: Date) {
  const headline = campaign.offers[0] ? offerLine(campaign.offers[0]) : campaign.subject;
  const code = campaign.offers.find((offer) => offer.code)?.code ?? null;
  const dated = receivedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const site = `https://www.${brand.domain}/`;
  const extras = campaign.offers
    .slice(1)
    .map((offer) => `<li style="margin:0 0 6px">${escapeHtml(offerLine(offer))}${offer.minPurchase ? ` on orders of $${offer.minPurchase}+` : ""}</li>`)
    .join("");
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(campaign.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f3f3;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(campaign.preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f3f3">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:${accent};padding:20px 28px;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.02em">${escapeHtml(brand.name)}</td></tr>
<tr><td style="padding:36px 28px 12px;text-align:center">
<div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#777">Limited time</div>
<div style="font-size:44px;line-height:1.05;font-weight:800;margin:10px 0 8px;color:${accent}">${escapeHtml(headline)}</div>
<div style="font-size:18px;color:#333">${escapeHtml(campaign.subject)}</div>
</td></tr>
${
  code
    ? `<tr><td style="padding:8px 28px 4px;text-align:center"><div style="display:inline-block;border:2px dashed ${accent};padding:10px 22px;font-size:20px;font-weight:700;letter-spacing:0.12em;color:#1a1a1a">USE CODE ${escapeHtml(code)}</div></td></tr>`
    : ""
}
<tr><td style="padding:20px 28px 8px;font-size:15px;line-height:1.55;color:#333">${escapeHtml(campaign.body)}</td></tr>
${extras ? `<tr><td style="padding:0 28px 8px;font-size:14px;color:#444"><ul style="margin:8px 0 0;padding-left:20px">${extras}</ul></td></tr>` : ""}
<tr><td style="padding:16px 28px 36px;text-align:center"><a href="${site}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:4px">Shop now</a></td></tr>
<tr><td style="background:#fafafa;border-top:1px solid #e6e6e6;padding:18px 28px;font-size:11px;line-height:1.6;color:#888">
Sent ${dated} to a subscriber of ${escapeHtml(brand.name)}. Offers valid while supplies last; exclusions may apply. See ${escapeHtml(brand.domain ?? "")} for details.<br>
<a href="${site}unsubscribe" style="color:#888">Unsubscribe</a> &middot; <a href="${site}privacy" style="color:#888">Privacy policy</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// --- full text ---------------------------------------------------------------------

// crude stand-in for Postgres's english config: lowercase, strip suffixes.
// Shared with the search router so query and document stem the same way.
export function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}i`;
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s")) w = w.slice(0, -1);
  return w;
}

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$%' -]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

// --- seed --------------------------------------------------------------------------

function endOfUtcDay(ms: number) {
  const d = new Date(ms);
  d.setUTCHours(23, 59, 59, 0);
  return d;
}

const money = (n: number) => n.toFixed(2);

export function initializeDealsDemo() {
  const rng = mulberry32(0xdea15);

  deals.brands = BRAND_SEED.map((seed) => {
    const slug = slugify(seed.name);
    return {
      id: uuidFrom(rng),
      slug,
      name: seed.name,
      domain: seed.domain,
      logoUrl: null,
      category: seed.category,
      signupUrl: `https://www.${seed.domain}/`,
      signupProvider: null,
      signupRecipe: null,
      signupCheckedAt: null,
      inboxAlias: slug,
      status: seed.status,
      firstEmailAt: null,
      lastEmailAt: null,
      emailCount: 0,
      followerCount: seed.followers,
      createdAt: new Date(anchor - 45 * DAY_MS),
    };
  });
  const accentByName = new Map(BRAND_SEED.map((seed) => [seed.name, seed.accent]));
  const brandByName = new Map(deals.brands.map((brand) => [brand.name, brand]));

  deals.emails = [];
  deals.offers = [];
  deals.html = new Map();

  for (const campaign of CAMPAIGNS) {
    const brand = brandByName.get(campaign.brand);
    if (!brand) throw new Error(`deals seed: unknown brand ${campaign.brand}`);
    const id = uuidFrom(rng);
    // minute jitter keeps rows from sharing a timestamp, which the cursor
    // pagination would otherwise have to break ties on
    const receivedAt = new Date(anchor - campaign.day * DAY_MS - Math.floor(rng() * 50) * 60 * 1000);
    const offerSentences = campaign.offers.map((offer) => {
      const parts = [offerLine(offer)];
      if (offer.code) parts.push(`use code ${offer.code}`);
      if (offer.minPurchase) parts.push(`on orders of $${offer.minPurchase} or more`);
      if (offer.endsIn != null) parts.push(offer.endsIn === 0 ? "ends today" : `ends in ${offer.endsIn} days`);
      return `${parts.join(", ")}.`;
    });
    const text = [campaign.subject, campaign.preheader, campaign.body, ...offerSentences].join("\n");
    const email: Email = {
      id,
      brandId: brand.id,
      messageId: `<${id.slice(0, 13)}@mail.${brand.domain}>`,
      kind: "promo",
      source: "imap",
      subject: campaign.subject,
      preheader: campaign.preheader,
      fromName: brand.name,
      fromAddress: `deals@email.${brand.domain}`,
      recipient: `${brand.slug}@mail.example.test`,
      receivedAt,
      rawKey: `raw/${id}.eml`,
      htmlKey: `html/${id}.html`,
      screenshotKey: null,
      text,
      unsubscribeUrl: `https://www.${brand.domain}/unsubscribe`,
      confirmationUrl: null,
      hasOffer: campaign.offers.length > 0,
      spamVerdict: "PASS",
      tsv: Array.from(new Set(tokens(text).map(stem))).join(" "),
      createdAt: new Date(receivedAt.getTime() + 15 * 1000),
    };
    deals.emails.push(email);
    deals.html.set(id, renderEmailHtml(brand, campaign, accentByName.get(brand.name) ?? "#333333", receivedAt));

    for (const spec of campaign.offers) {
      deals.offers.push({
        id: uuidFrom(rng),
        emailId: id,
        brandId: brand.id,
        kind: spec.kind,
        value: spec.value != null ? money(spec.value) : null,
        code: spec.code ?? null,
        scope: spec.scope ?? "unknown",
        categories: spec.categories ?? [],
        minPurchase: spec.minPurchase != null ? money(spec.minPurchase) : null,
        startsAt: null,
        expiresAt: spec.endsIn != null ? endOfUtcDay(receivedAt.getTime() + spec.endsIn * DAY_MS) : null,
        exclusions: spec.exclusions ?? null,
        confidence: spec.code ? 0.9 : 0.7,
        extractedBy: "rules-v1",
        extractedAt: new Date(receivedAt.getTime() + 40 * 1000),
      });
    }

    brand.emailCount += 1;
    if (!brand.firstEmailAt || receivedAt < brand.firstEmailAt) brand.firstEmailAt = receivedAt;
    if (!brand.lastEmailAt || receivedAt > brand.lastEmailAt) brand.lastEmailAt = receivedAt;
  }

  deals.emails.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

  deals.follows = new Set(
    [...FROM_STEALTH_SEED, ...BY_CATEGORY_SEED]
      .filter((seed) => seed.following)
      .map((seed) => {
        const brand = brandByName.get(seed.brand);
        if (!brand) throw new Error(`deals seed: onboarding names unknown brand ${seed.brand}`);
        return brand.slug;
      }),
  );
}

export function getEmailHtml(id: string): string | null {
  return deals.html.get(id) ?? null;
}

export const dealsAnchor = anchor;

import seedProducts from "./seed-products.json";

// Seed for the overview page and the pages it links to (feed, sellers,
// folders). Same rule as db.ts: every id and timestamp is deterministic and
// anchored to the hour, so every serverless instance answers identically.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const anchor = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;

// UTC day key, the same shape the real backend stamps on postingActivity
const dayKey = (offsetDays: number) => new Date(anchor - offsetDays * DAY_MS).toISOString().slice(0, 10);

export type PostingPeriod = {
  date: string;
  productCount: number;
  fbaCount: number;
  fbmCount: number;
  dominantType: "fba" | "fbm" | "mixed" | "none";
};

export type SeedSeller = {
  id: string;
  sellerDbId: string;
  sellerId: string;
  sellerName: string;
  nickName: string | null;
  status: "A" | "P";
  createdAt: Date;
  lastTimePosted: Date | null;
  totalSavedProducts: number;
  totalUnreadProducts: number;
  totalPostedSinceMonitoring: number;
  postingActivity: PostingPeriod[];
  isBookmarked: boolean;
  tags: string[];
  rating: number | null;
  ratingCount: number | null;
};

export type SeedProduct = {
  id: string;
  title: string;
  productId: string;
  sellerDbId: string;
  sellerName: string;
  images: string[];
  storefrontPrice: number | null;
  buyBoxPrice: number | null;
  salesRank: number | null;
  monthlySales: number | null;
  isFBA: boolean;
  isFBM: boolean;
  firstSeenAt: Date;
  isNew: boolean;
  brand: string | null;
  category: string | null;
  rating: number | null;
  ratingCount: number | null;
  offerFBACount: number | null;
  offerFBMCount: number | null;
  isOfferAmazon: boolean | null;
  isBuyBoxFBA: boolean | null;
  isBuyBoxAmazon: boolean | null;
};

export type SeedFolder = {
  id: string;
  name: string;
  defaultFulfillment: "fba" | "fbm";
  position: number;
};

export type SeedFolderItem = {
  id: string;
  folderId: string;
  productId: string;
  asin: string;
  marketplace: number;
  title: string;
  images: string;
  brand: string | null;
  category: string | null;
  buyCost: number | null;
  sellPrice: number | null;
  sellPriceSource: "user" | "seeded";
  buyBoxPrice: number | null;
  snapshotCapturedAt: Date | null;
  referralRule: { kind: "fixed"; steps: { upTo: number | null; rate: number }[]; minFee: number | null };
  fbaFulfillmentFee: number | null;
  variableClosingFee: number | null;
  feeBasisPrice: number | null;
  weight: number | null;
  weightPounds: number | null;
  lengthInches: number | null;
  widthInches: number | null;
  heightInches: number | null;
  shippingCost: number | null;
  shippingEstimate: number | null;
  fulfillment: "fba" | "fbm" | null;
  notes: string | null;
  position: number;
  salesRank: number | null;
  monthlySales: number | null;
  fbaOfferCount: number | null;
  fbmOfferCount: number | null;
  isOfferAmazon: boolean | null;
  gatingStatus: "approved" | "needs_ungating" | "restricted" | null;
  gatingCheckedAt: Date | null;
  gatingGateType: "brand" | "category" | "unknown" | null;
  gatingApplyUrl: string | null;
  isHazmat: boolean;
  hazmatReason: string | null;
  hazmatClass: string | null;
  hazmatException: string | null;
  isMeltable: boolean;
  urls: { id: string; folderItemId: string; url: string; label: string | null; searchId: string | null; createdAt: Date }[];
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SeedNotification = {
  id: string;
  source: string;
  eventType: string;
  level: string;
  payload: unknown;
  readAt: Date | null;
  createdAt: Date;
};

export const overview = {
  sellers: [] as SeedSeller[],
  products: [] as SeedProduct[],
  folders: [] as SeedFolder[],
  items: [] as SeedFolderItem[],
  // product ids the user opened; the feed's unread state
  readIds: new Set<string>(),
  // asin -> today's buy box in cents; two rows deliberately differ from the
  // snapshot so "buy list moved" has something to say
  liveBuyBox: new Map<string, number>(),
  notifications: [] as SeedNotification[],
};

const SELLER_NAMES = [
  "Toy Vault Deals",
  "BrickHouse Goods",
  "Coastal Resale",
  "Midwest Flip Co",
  "PrimeTime Finds",
  "Sunbelt Surplus",
  "Northline Trading",
  "Bargain Barn Co",
  "Peak Season Goods",
  "Redwood Resale",
  "Lakeshore Liquidators",
  "Harbor Deals",
  "Quick Cart Traders",
  "Blue Ridge Bargains",
  "Golden State Flips",
  "Evergreen Stock",
  "Metro Pallet Co",
];

// how much of the network's daily volume each seller carries. index 4 is the
// quiet one (active, silent for 16 days); the last three are paused.
const SELLER_WEIGHT = [1, 0.7, 0.5, 0.25, 0, 0.4, 0.35, 0.3, 0.3, 0.2, 0.2, 0.15, 0.15, 0.1, 0.3, 0.2, 0.1];
const QUIET_INDEX = 4;
const PAUSED_FROM = 14;
// network volume per day, oldest first: a slow climb into the weekend
const DAY_BASE = [1, 2, 1, 3, 2, 3, 2, 4, 3, 4, 3, 5, 4, 5];
// unread products per seller; sums to 12 across 5 sellers
const UNREAD = [5, 3, 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

type RetailerProduct = { url: string; retailer: string; title: string; image: string | null; priceCents: number | null; failed?: boolean };

// five listings on top of the scraped fifteen: real titles, no image on file,
// so the thumb shows the package face instead of a broken picture
const EXTRA_TITLES = [
  "Fisher-Price Laugh & Learn Sit & Steer Driver Car Activity Center",
  "IRIS USA Board Game Storage Containers, 10-Pack, Slim - Clear",
  "Melissa & Doug Wooden Building Blocks Set - 100 Blocks",
  "LEGO Classic Medium Creative Brick Box 10696",
  "Crayola Inspiration Art Case Coloring Set, 140 Pieces",
];

export function initializeOverviewDemo(userId: string) {
  void userId;

  // --- sellers ---------------------------------------------------------
  overview.sellers = SELLER_NAMES.map((name, index) => {
    const isPaused = index >= PAUSED_FROM;
    const isQuiet = index === QUIET_INDEX;
    const weight = SELLER_WEIGHT[index];
    const fbmShare = index % 3 === 2 ? 0.7 : 0.25;
    const postingActivity: PostingPeriod[] = DAY_BASE.map((base, dayIndex) => {
      const productCount = isQuiet ? 0 : Math.round(base * weight);
      const fbmCount = Math.round(productCount * fbmShare);
      const fbaCount = productCount - fbmCount;
      const dominantType: PostingPeriod["dominantType"] =
        productCount === 0 ? "none" : fbaCount === 0 ? "fbm" : fbmCount === 0 ? "fba" : fbaCount >= fbmCount ? "fba" : "mixed";
      return { date: dayKey(13 - dayIndex), productCount, fbaCount, fbmCount, dominantType };
    });
    const totalPosted = postingActivity.reduce((sum, period) => sum + period.productCount, 0);
    return {
      id: `user-seller-${index}`,
      sellerDbId: `seller-v2-${index}`,
      sellerId: `A${(1000000000000 + index * 7919).toString(36).toUpperCase().slice(0, 13)}`,
      sellerName: name,
      nickName: null,
      status: isPaused ? "P" : "A",
      createdAt: new Date(anchor - (60 + index * 3) * DAY_MS),
      lastTimePosted: isQuiet
        ? new Date(anchor - 16 * DAY_MS)
        : isPaused
          ? new Date(anchor - (5 + index) * DAY_MS)
          : new Date(anchor - (2 + index * 3) * HOUR_MS),
      totalSavedProducts: [4, 3, 2, 1, 0, 2, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0][index],
      totalUnreadProducts: UNREAD[index],
      totalPostedSinceMonitoring: totalPosted * 6,
      postingActivity,
      isBookmarked: index < 2,
      tags: index % 4 === 0 ? ["toys"] : index % 4 === 1 ? ["home"] : [],
      rating: isQuiet ? null : 96 + (index % 4),
      ratingCount: isQuiet ? null : 120 + index * 37,
    };
  });

  // --- feed products -----------------------------------------------------
  // the 12 unread products belong to the 5 sellers with unread counts, in the
  // same numbers the seller rows report, so the tile and the list agree
  // round-robin over the sellers that have unread, so the newest five come
  // from five different storefronts instead of one
  const owners: number[] = [];
  const remaining = [...UNREAD];
  while (remaining.some((count) => count > 0)) {
    remaining.forEach((count, sellerIndex) => {
      if (count > 0) {
        owners.push(sellerIndex);
        remaining[sellerIndex] -= 1;
      }
    });
  }
  const retailer = (seedProducts as RetailerProduct[]).filter((product) => !product.failed && product.priceCents != null);
  const pool: { title: string; image: string | null; priceCents: number }[] = [
    // trimmed: one scraped url carries leading whitespace, and the frontend
    // only passes an image through untouched when it starts with http
    ...retailer.map((product) => ({
      title: product.title,
      image: product.image?.trim() || null,
      priceCents: product.priceCents as number,
    })),
    ...EXTRA_TITLES.map((title, index) => ({ title, image: null, priceCents: [3499, 4250, 1999, 3497, 2299][index] })),
  ];
  // recency order over the pool: the newest posts are listings that are not
  // also seeded as watcher hits (indexes 0, 5, 10), so the act-on list does
  // not show the same product twice
  const newestFirst = [12, 8, 3, 11, 1, 6, 2, 9, 7, 4, 13, 14, 10, 0, 5, 15, 16, 17, 18, 19].filter(
    (index) => index < pool.length,
  );
  const positionOf = new Map(newestFirst.map((index, position) => [index, position]));
  overview.products = pool.map((product, index) => {
    const position = positionOf.get(index) ?? index;
    const isNew = position < owners.length;
    const sellerIndex = isNew ? owners[position] : (index * 5) % PAUSED_FROM;
    const seller = overview.sellers[sellerIndex];
    const buyBox = Math.round(product.priceCents * 2.1);
    return {
      id: `product-seed-${index}`,
      title: product.title,
      productId: `B0SS${String(index).padStart(6, "0")}`,
      sellerDbId: seller.sellerDbId,
      sellerName: seller.sellerName,
      images: product.image ? [product.image] : [],
      storefrontPrice: buyBox,
      buyBoxPrice: buyBox,
      salesRank: 900 + ((index * 1373) % 12000),
      monthlySales: 60 + ((index * 233) % 1100),
      isFBA: index % 3 !== 1,
      isFBM: index % 3 === 1,
      firstSeenAt: new Date(anchor - (1 + position) * 2 * HOUR_MS),
      isNew,
      brand: product.title.split(" ")[0],
      category: index % 2 === 0 ? "Toys & Games" : "Home & Kitchen",
      rating: 4.2 + (index % 7) / 10,
      ratingCount: 300 + index * 41,
      offerFBACount: 3 + (index % 6),
      offerFBMCount: index % 4,
      isOfferAmazon: index % 5 === 0,
      isBuyBoxFBA: index % 3 !== 1,
      isBuyBoxAmazon: index % 5 === 0,
    };
  });

  // --- folders and the buy list -----------------------------------------
  overview.folders = [
    { id: "folder-q4-toys", name: "Q4 Toys", defaultFulfillment: "fba", position: 0 },
    { id: "folder-clearance", name: "Clearance run", defaultFulfillment: "fba", position: 1 },
    { id: "folder-grocery", name: "Grocery", defaultFulfillment: "fbm", position: 2 },
  ];
  const folderOf = (index: number) => (index < 6 ? "folder-q4-toys" : index < 11 ? "folder-clearance" : "folder-grocery");
  // 14 leads off the retailer pool: what the user paid, at the snapshot buy
  // box. costs are set so most clear the fees and a few do not, the same way
  // a real folder reads
  overview.items = retailer.slice(0, 14).map((product, index) => {
    const asin = `B0SS${String(index).padStart(6, "0")}`;
    const sellPrice = Math.round((product.priceCents as number) * 2.1);
    const isLoser = index % 5 === 4 || sellPrice < 1200;
    const buyCost = Math.round(sellPrice * (isLoser ? 0.9 : 0.55));
    const gating: Pick<SeedFolderItem, "gatingStatus" | "gatingCheckedAt" | "gatingGateType" | "gatingApplyUrl"> =
      index === 3
        ? {
            gatingStatus: "needs_ungating",
            gatingCheckedAt: new Date(anchor - 5 * HOUR_MS),
            gatingGateType: "brand",
            gatingApplyUrl: "https://sellercentral.amazon.com/hz/approvalrequest",
          }
        : index === 7
          ? {
              gatingStatus: "approved",
              gatingCheckedAt: new Date(anchor - 3 * HOUR_MS),
              gatingGateType: null,
              gatingApplyUrl: null,
            }
          : index < 10
            ? { gatingStatus: "approved", gatingCheckedAt: new Date(anchor - (3 + index) * DAY_MS), gatingGateType: null, gatingApplyUrl: null }
            : { gatingStatus: null, gatingCheckedAt: null, gatingGateType: null, gatingApplyUrl: null };
    return {
      id: `folder-item-${index}`,
      folderId: folderOf(index),
      productId: `product-row-${index}`,
      asin,
      marketplace: 1,
      title: product.title,
      images: product.image ?? "",
      brand: product.title.split(" ")[0],
      category: index % 2 === 0 ? "Toys & Games" : "Home & Kitchen",
      buyCost,
      sellPrice,
      sellPriceSource: "seeded",
      buyBoxPrice: sellPrice,
      snapshotCapturedAt: new Date(anchor - (1 + index) * DAY_MS),
      referralRule: { kind: "fixed", steps: [{ upTo: null, rate: 0.15 }], minFee: 0.3 },
      fbaFulfillmentFee: 399 + (index % 4) * 100,
      variableClosingFee: null,
      feeBasisPrice: sellPrice,
      weight: null,
      weightPounds: 0.6 + (index % 5) * 0.4,
      lengthInches: 8 + (index % 3) * 2,
      widthInches: 6 + (index % 2) * 2,
      heightInches: 3 + (index % 4),
      shippingCost: null,
      shippingEstimate: 550,
      fulfillment: null,
      notes: null,
      position: index,
      salesRank: 1200 + ((index * 977) % 9000),
      monthlySales: 80 + ((index * 131) % 700),
      fbaOfferCount: 2 + (index % 5),
      fbmOfferCount: index % 3,
      isOfferAmazon: index % 6 === 0,
      ...gating,
      isHazmat: false,
      hazmatReason: null,
      hazmatClass: null,
      hazmatException: null,
      isMeltable: index === 12,
      urls: [
        {
          id: `folder-item-url-${index}`,
          folderItemId: `folder-item-${index}`,
          url: product.url,
          label: product.retailer,
          searchId: null,
          createdAt: new Date(anchor - (1 + index) * DAY_MS),
        },
      ],
      archivedAt: null,
      createdAt: new Date(anchor - (1 + index) * DAY_MS),
      updatedAt: new Date(anchor - index * HOUR_MS),
    };
  });

  // today's buy box: equal to the snapshot for everyone except two rows, one
  // that climbed and one that fell
  overview.liveBuyBox = new Map(
    overview.items.map((item) => {
      const snapshot = item.buyBoxPrice as number;
      const live = item.position === 1 ? Math.round(snapshot * 1.26) : item.position === 5 ? Math.round(snapshot * 0.82) : snapshot;
      return [item.asin, live];
    }),
  );

  overview.readIds = new Set();

  // --- notifications -----------------------------------------------------
  const today = overview.sellers.reduce(
    (sum, seller) => sum + (seller.postingActivity[seller.postingActivity.length - 1]?.productCount ?? 0),
    0,
  );
  overview.notifications = [
    {
      id: "notif-digest-today",
      source: "digest",
      eventType: "digest.daily",
      level: "info",
      payload: { totalProducts: today, sellerCount: overview.sellers.filter((seller) => seller.status === "A").length },
      readAt: null,
      createdAt: new Date(anchor - 2 * HOUR_MS),
    },
  ];
}

// --- read state ------------------------------------------------------------

export function markProductRead(productId: string) {
  if (overview.readIds.has(productId)) return;
  overview.readIds.add(productId);
  const product = overview.products.find((row) => row.id === productId);
  if (!product) return;
  const seller = overview.sellers.find((row) => row.sellerDbId === product.sellerDbId);
  if (seller && seller.totalUnreadProducts > 0) seller.totalUnreadProducts -= 1;
}

export function markAllProductsRead(): number {
  let count = 0;
  for (const product of overview.products) {
    if (!overview.readIds.has(product.id)) {
      overview.readIds.add(product.id);
      count += 1;
    }
  }
  for (const seller of overview.sellers) seller.totalUnreadProducts = 0;
  return count;
}

export const seedAnchor = anchor;

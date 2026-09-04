import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { t } from "./t";
import { database } from "./db";
import { overview, markAllProductsRead, markProductRead, seedAnchor } from "./overview-seed";

// Procedures the overview page and the pages it links to call, answered from
// the in-memory seed. Names and shapes follow the real router; anything the
// sandbox has no data for answers empty rather than 404, so the shell loads
// clean.

const feedInput = z
  .object({
    page: z.number().int().optional(),
    limit: z.number().int().optional(),
    isNew: z.boolean().optional(),
    keyword: z.string().optional(),
    sellerIds: z.array(z.string()).optional(),
  })
  .passthrough();

function feedPage(input: z.infer<typeof feedInput>) {
  const limit = input.limit ?? 25;
  const page = input.page ?? 0;
  let rows = overview.products;
  if (input.sellerIds && input.sellerIds.length > 0) {
    const wanted = new Set(input.sellerIds);
    rows = rows.filter((product) => wanted.has(product.sellerDbId));
  }
  if (input.isNew) rows = rows.filter((product) => product.isNew);
  if (input.keyword) {
    const needle = input.keyword.toLowerCase();
    rows = rows.filter((product) => product.title.toLowerCase().includes(needle));
  }
  const sorted = [...rows].sort((a, b) => b.firstSeenAt.getTime() - a.firstSeenAt.getTime());
  return {
    products: sorted.slice(page * limit, page * limit + limit).map((product) => ({
      id: product.id,
      title: product.title,
      productId: product.productId,
      storefrontPrice: product.storefrontPrice,
      buyBoxPrice: product.buyBoxPrice,
      storefrontPricePercentage: 100,
      isFBA: product.isFBA,
      isFBM: product.isFBM,
      isBuyBoxFBA: product.isBuyBoxFBA,
      isBuyBoxAmazon: product.isBuyBoxAmazon,
      isOfferAmazon: product.isOfferAmazon,
      salesRank: product.salesRank,
      salesRankPercentile: null,
      monthlySales: product.monthlySales,
      avgPrice: product.buyBoxPrice,
      brand: product.brand,
      category: product.category,
      rating: product.rating,
      ratingCount: product.ratingCount,
      stockCount: null,
      images: product.images,
      domain: "1",
      offerFBACount: product.offerFBACount,
      offerFBMCount: product.offerFBMCount,
      firstSeenAt: product.firstSeenAt.toISOString(),
      sellerName: product.sellerName,
      sellerId: product.sellerDbId,
      isNew: product.isNew,
      fees: null,
    })),
    totalProducts: sorted.length,
  };
}

export const watchlistRouter = t.router({
  getAll: t.procedure.query(() => overview.sellers),
  getProducts: t.procedure.input(feedInput).query(({ input }) => feedPage(input)),
  update: t.procedure
    .input(
      z.object({
        sellerId: z.string(),
        status: z.enum(["A", "P"]).optional(),
        isBookmarked: z.boolean().optional(),
        nickName: z.string().nullable().optional(),
      }),
    )
    .mutation(({ input }) => {
      const seller = overview.sellers.find((row) => row.id === input.sellerId);
      if (!seller) throw new TRPCError({ code: "NOT_FOUND", message: "Seller not found" });
      if (input.status) seller.status = input.status;
      if (input.isBookmarked != null) seller.isBookmarked = input.isBookmarked;
      if (input.nickName !== undefined) seller.nickName = input.nickName;
      return seller;
    }),
  getBrandsInView: t.procedure.input(z.any()).query(() => []),
  getFeatured: t.procedure.query(() => ({ status: "no_sellers" as const, recommendations: [] })),
  getRecentlyPosted: t.procedure.input(z.any()).query(() => ({ recommendations: [] })),
});

export const sellersRouter = t.router({
  getProducts: t.procedure.input(feedInput).query(({ input }) => feedPage(input)),
  getBrandsInView: t.procedure.input(z.any()).query(() => []),
});

export const bookmarksRouter = t.router({
  getReadIds: t.procedure.query(() => Array.from(overview.readIds)),
  markOneRead: t.procedure
    .input(z.object({ sellerId: z.string(), productId: z.string() }))
    .mutation(({ input }) => {
      markProductRead(input.productId);
      return { message: "ok" };
    }),
  markAllRead: t.procedure
    .input(z.object({ action: z.enum(["click", "dismissed"]).optional() }).optional())
    .mutation(() => ({ message: "ok", count: markAllProductsRead() })),
  getIds: t.procedure.query(() => []),
  getSavedAsins: t.procedure.query(() => []),
  getAll: t.procedure.input(z.any()).query(() => ({ products: [], totalProducts: 0 })),
});

export const foldersRouter = t.router({
  listFolders: t.procedure.query(() => [
    ...overview.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      defaultFulfillment: folder.defaultFulfillment,
      itemCount: overview.items.filter((item) => item.folderId === folder.id && !item.archivedAt).length,
      kind: "folder" as const,
    })),
    { id: "trash", name: "Trash", defaultFulfillment: "fba", itemCount: 0, kind: "trash" as const },
  ]),
  // "all" is the synthetic leading tab: every live lead across folders
  listItems: t.procedure.input(z.object({ folderId: z.string() })).query(({ input }) => {
    if (input.folderId === "trash") return overview.items.filter((item) => item.archivedAt);
    const live = overview.items.filter((item) => !item.archivedAt);
    if (input.folderId === "all") return live;
    return live.filter((item) => item.folderId === input.folderId);
  }),
  getSettings: t.procedure.query(() => ({})),
  // What the mobile prototype's "send to folders" calls: same input the web
  // calculator sends to the real folders.createItem. Rows go into the same
  // in-memory list listItems reads, so the web Folders page of this deploy
  // shows them (until the function instance recycles).
  createItem: t.procedure
    .input(
      z.object({
        folderId: z.string(),
        asin: z.string(),
        marketplace: z.number().int().default(1),
        buyCost: z.number().int().nullable().optional(),
        sellPrice: z.number().int().nullable().optional(),
        sellPriceSource: z.enum(["user", "seeded"]).optional(),
        shippingCost: z.number().int().nullable().optional(),
        fulfillment: z.enum(["fba", "fbm"]).nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(({ input }) => {
      const folder = overview.folders.find((f) => f.id === input.folderId);
      if (!folder) throw new TRPCError({ code: "NOT_FOUND", message: `Folder ${input.folderId} does not exist` });
      const known = MOBILE_LAB_PRODUCTS[input.asin];
      const now = new Date();
      const id = `folder-item-mobile-${now.getTime()}-${overview.items.length}`;
      const sellPrice = input.sellPrice ?? known?.sellPrice ?? null;
      overview.items.unshift({
        id,
        folderId: folder.id,
        productId: `product-${input.asin}`,
        asin: input.asin,
        marketplace: input.marketplace,
        title: known?.title ?? `ASIN ${input.asin}`,
        images: "",
        brand: known?.brand ?? null,
        category: known?.category ?? null,
        buyCost: input.buyCost ?? null,
        sellPrice,
        sellPriceSource: input.sellPriceSource ?? "seeded",
        buyBoxPrice: sellPrice,
        snapshotCapturedAt: now,
        referralRule: { kind: "fixed", steps: [{ upTo: null, rate: 0.15 }], minFee: 0.3 },
        fbaFulfillmentFee: known?.fbaFee ?? 399,
        variableClosingFee: null,
        feeBasisPrice: sellPrice,
        weight: null,
        weightPounds: 1,
        lengthInches: 8,
        widthInches: 6,
        heightInches: 3,
        shippingCost: input.shippingCost ?? null,
        shippingEstimate: 550,
        fulfillment: input.fulfillment ?? null,
        notes: input.notes ?? null,
        position: 0,
        salesRank: known?.rank ?? null,
        monthlySales: known?.monthly ?? null,
        fbaOfferCount: known?.fba ?? null,
        fbmOfferCount: known?.fbm ?? null,
        isOfferAmazon: false,
        gatingStatus: null,
        gatingCheckedAt: null,
        gatingGateType: null,
        gatingApplyUrl: null,
        isHazmat: false,
        hazmatReason: null,
        hazmatClass: null,
        hazmatException: null,
        isMeltable: false,
        urls: [],
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),
});

// The mobile prototype's lab catalog, so a row sent from the phone reads like
// a product instead of a bare ASIN. Prices in cents.
const MOBILE_LAB_PRODUCTS: Record<string, { title: string; brand: string; category: string; sellPrice: number; fbaFee: number; rank: number; monthly: number; fba: number; fbm: number }> = {
  B0BKJ8N5PL: { title: "LEGO Icons Bonsai Tree 10281", brand: "LEGO", category: "Toys & Games", sellPrice: 4150, fbaFee: 1210, rank: 310, monthly: 900, fba: 18, fbm: 5 },
  B004BPIPFM: { title: "NIVEA All purpose Creme 150 ml (Pack of 4)", brand: "NIVEA", category: "Beauty & Personal Care", sellPrice: 2294, fbaFee: 710, rank: 50160, monthly: 80, fba: 6, fbm: 3 },
  B07QN7FZ7L: { title: "Ninja Professional Blender 1000W, 72 oz", brand: "Ninja", category: "Home & Kitchen", sellPrice: 9499, fbaFee: 2140, rank: 890, monthly: 250, fba: 6, fbm: 2 },
  B01N1UX8RW: { title: "OPI Nail Lacquer, Big Apple Red, 0.5 fl oz", brand: "OPI", category: "Beauty", sellPrice: 1220, fbaFee: 560, rank: 2210, monthly: 40, fba: 3, fbm: 9 },
  B0C4YGSCRB: { title: "Yo Glow Enzyme Scrub, 2.5 oz", brand: "Wishful", category: "Beauty", sellPrice: 4872, fbaFee: 1156, rank: 4120, monthly: 400, fba: 2, fbm: 32 },
  B08L6ZCS4Q: { title: "Campbell's Chunky Chicken Noodle Soup, 12 pack", brand: "Campbell's", category: "Grocery", sellPrice: 2350, fbaFee: 890, rank: 15300, monthly: 120, fba: 0, fbm: 14 },
  B09XY5Z2K1: { title: "Atomic Habits (Hardcover)", brand: "Avery", category: "Books", sellPrice: 1899, fbaFee: 620, rank: 12, monthly: 60, fba: 4, fbm: 22 },
};

export const buyboxRouter = t.router({
  getForAsins: t.procedure
    .input(z.object({ asins: z.array(z.string()), marketplace: z.number() }))
    .query(({ input }) =>
      Object.fromEntries(
        input.asins.map((asin) => {
          const cents = overview.liveBuyBox.get(asin);
          return [
            asin,
            cents == null
              ? null
              : {
                  liveBuyBoxCents: cents,
                  currency: "USD",
                  shipping: null,
                  soldBy: null,
                  shipsFrom: null,
                  fba: true,
                  condition: "New",
                  refreshedAt: new Date(seedAnchor),
                  stale: false,
                  noOffer: false,
                },
          ];
        }),
      ),
    ),
  peekStale: t.procedure.input(z.object({ asins: z.array(z.string()), marketplace: z.number() })).query(() => []),
});

export const calculatorRouter = t.router({
  getSettings: t.procedure.query(() => null),
  saveSettings: t.procedure.input(z.any()).mutation(({ input }) => input),
  getFeeEstimates: t.procedure.input(z.any()).query(() => ({})),
  getFeeEstimate: t.procedure.input(z.any()).query(() => null),
  getExchangeRates: t.procedure.query(() => ({ base: "USD", rates: { USD: 1 }, fetchedAt: new Date(seedAnchor) })),
  getSearchHistory: t.procedure.input(z.any()).query(() => ({ items: [], nextCursor: null })),
});

// extra account procedures; getMe stays in trpc.ts next to the session stub
export const accountExtras = {
  getUsage: t.procedure.query(() => ({ planName: "Ultra", usagePercent: 62, daysUntilReset: 12 })),
  getStats: t.procedure.query(() => ({
    thirtyDay: { productsClicked: 220, productsBookmarked: 31, periodDays: 30 },
  })),
  getPreferences: t.procedure.query(() => ({})),
  savePreferences: t.procedure.input(z.any()).mutation(({ input }) => input),
};

export const billingRouter = t.router({
  getSubscriptions: t.procedure.query(() => [
    {
      id: "sub-sandbox",
      tier: "UL",
      planName: "Ultra",
      status: "active",
      interval: "month",
      trialEnd: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(seedAnchor + 12 * 24 * 60 * 60 * 1000),
    },
  ]),
  getTrialInfo: t.procedure
    .input(z.any())
    .query(() => ({ copy: null, eligible: false, trialDays: null, reason: "had_subscription" as const })),
  getBillingMode: t.procedure.query(() => ({ mode: "stripe" })),
});

const HOUR_MS = 60 * 60 * 1000;

// the bell: one row per seeded alert plus the daily digest
function notificationRows() {
  const alertRows = Array.from(database.alerts.values()).map((alert) => {
    const watch = database.watches.get(alert.watchId);
    const target = watch ? database.targets.get(watch.targetId) : null;
    const changed = (alert.whatChanged ?? {}) as { condition?: string; before?: unknown; after?: unknown };
    return {
      id: `notif-${alert.id}`,
      source: "watchers",
      eventType: `watcher.${changed.condition ?? "price_change"}`,
      level: "info",
      payload: {
        asin: target?.asin ?? null,
        url: target?.normalizedUrl ?? null,
        marketplace: target?.marketplace ?? 1,
        before: changed.before,
        after: changed.after,
      },
      readAt: alert.triggeredAt.getTime() < seedAnchor - 20 * HOUR_MS ? new Date(alert.triggeredAt.getTime() + HOUR_MS) : null,
      createdAt: alert.triggeredAt,
    };
  });
  return [...overview.notifications, ...alertRows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export const notificationsRouter = t.router({
  unreadCount: t.procedure.query(() => {
    const rows = notificationRows();
    return { count: rows.filter((row) => !row.readAt).length, total: rows.length };
  }),
  list: t.procedure
    .input(z.object({ cursor: z.string().optional(), limit: z.number().optional(), isUnreadOnly: z.boolean().optional() }).optional())
    .query(({ input }) => {
      const rows = notificationRows().filter((row) => !input?.isUnreadOnly || !row.readAt);
      return { items: rows.slice(0, input?.limit ?? 20), nextCursor: null };
    }),
  markRead: t.procedure.input(z.any()).mutation(() => ({ ok: true })),
  markSeen: t.procedure.input(z.any()).mutation(() => ({ ok: true })),
  dismiss: t.procedure.input(z.any()).mutation(() => ({ ok: true })),
  markClicked: t.procedure.input(z.any()).mutation(() => ({ ok: true })),
  listPreferences: t.procedure.query(() => []),
});

// the shell's remaining calls: empty is the honest answer here
export const shellRouters = {
  auth: t.router({ getFlags: t.procedure.query(() => ({})) }),
  savedFilters: t.router({ getAll: t.procedure.query(() => []) }),
  smartFilter: t.router({ getHistory: t.procedure.query(() => []) }),
  announcements: t.router({
    currentActive: t.procedure.query(() => null),
    recent: t.procedure.query(() => []),
  }),
  tags: t.router({
    getAll: t.procedure.query(() => []),
    getCategories: t.procedure.query(() => []),
  }),
};

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
});

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

import seedProducts from "./seed-products.json";
import { v4 as uuid } from "uuid";

export type Watch = {
  id: string;
  userId: string;
  targetId: string;
  condition: "price_drop" | "back_in_stock" | "price_change" | "custom_ai";
  thresholdCents: number | null;
  thresholdPercent: number | null;
  reason: string | null;
  pollIntervalMinutes: 120 | 180 | 360 | 1440;
  snoozeUntil: Date | null;
  expiresAt: Date;
  status: "active" | "triggered" | "expired" | "archived";
  createdAt: Date;
  archivedAt: Date | null;
  marketplace: number;
};

export type WatchTarget = {
  id: string;
  targetType: "asin" | "url";
  asin: string | null;
  marketplace: number | null;
  normalizedUrl: string | null;
  pollIntervalMinutes: 120 | 180 | 360 | 1440;
  nextPollAt: Date;
  lastPolledAt: Date | null;
  lastPriceCents: number | null;
  lastStockStatus: string | null;
  lastSnapshot: any;
  failureCount: number;
  lastFailedAt: Date | null;
  pausedUntil: Date | null;
};

export type Alert = {
  id: string;
  watchId: string;
  userId: string;
  marketplace: number;
  triggeredAt: Date;
  whatChanged: string;
  deliveryStatus: "pending" | "sent" | "failed";
};

export type User = {
  id: string;
  watchCreditsGrant: number;
  watchCreditsPurchased: number;
  tier: "free" | "paid" | "premium";
  role: "user" | "admin";
  watchersPausedAt: Date | null;
  marketplace: number;
};

// In-memory storage for MVP
export const database = {
  watches: new Map<string, Watch>(),
  targets: new Map<string, WatchTarget>(),
  alerts: new Map<string, Alert>(),
  users: new Map<string, User>(),
};

// Initialize demo user
export function initializeDemo() {
  const userId = "demo-user-" + uuid();
  database.users.set(userId, {
    id: userId,
    watchCreditsGrant: 100,
    watchCreditsPurchased: 50,
    tier: "premium",
    role: "admin",
    watchersPausedAt: null,
    marketplace: 1,
  });

  // Seed one watch per product in seed-products.json -- real titles, prices and
  // images pulled from the live pages by scripts/scrape-seed.mjs. Baked at build
  // time rather than scraped here, so a cold start stays fast and free.
  const CADENCES: Watch["pollIntervalMinutes"][] = [120, 180, 360, 1440];

  seedProducts.forEach((product, i) => {
    const targetId = "target-" + uuid();
    const scrapeFailed = !!product.failed || product.priceCents === null;

    database.targets.set(targetId, {
      id: targetId,
      targetType: "url",
      asin: null,
      marketplace: 1,
      normalizedUrl: product.url,
      pollIntervalMinutes: CADENCES[i % CADENCES.length],
      nextPollAt: new Date(Date.now() + 3600000),
      // A page we could not read gets no successful poll and a failure stamp,
      // which is what drives the row's "can't read the page" state. Seeding it
      // honestly beats pretending every retailer scrapes cleanly.
      lastPolledAt: scrapeFailed ? null : new Date(Date.now() - (i + 1) * 900000),
      lastPriceCents: product.priceCents,
      lastStockStatus: scrapeFailed ? "unknown" : "in_stock",
      lastSnapshot: {
        title: product.title,
        imageUrl: product.image,
        priceCents: product.priceCents,
        stockStatus: scrapeFailed ? "unknown" : "in_stock",
      },
      failureCount: scrapeFailed ? 3 : 0,
      lastFailedAt: scrapeFailed ? new Date(Date.now() - 3600000) : null,
      pausedUntil: null,
    });

    // Alternate the condition so both branches of the UI are represented, and
    // put the price target ~10% under the current price so it reads as a real
    // goal rather than an arbitrary number.
    const isPriceWatch = i % 3 !== 2;
    const watchId = "watch-" + uuid();
    database.watches.set(watchId, {
      id: watchId,
      userId,
      targetId,
      condition: isPriceWatch ? "price_drop" : "back_in_stock",
      thresholdCents:
        isPriceWatch && product.priceCents ? Math.round(product.priceCents * 0.9) : null,
      thresholdPercent: null,
      reason: null,
      pollIntervalMinutes: CADENCES[i % CADENCES.length],
      snoozeUntil: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600000),
      status: "active",
      createdAt: new Date(Date.now() - (i + 1) * 3600000),
      archivedAt: null,
      marketplace: 1,
    });

    // A couple of past fires so the alert feed and the hit counters are not
    // empty on first load.
    if (i % 5 === 0 && product.priceCents) {
      const was = Math.round(product.priceCents * 1.15);
      const alertId = "alert-" + uuid();
      database.alerts.set(alertId, {
        id: alertId,
        watchId,
        userId,
        marketplace: 1,
        triggeredAt: new Date(Date.now() - (i + 2) * 7200000),
        whatChanged: `Price dropped from $${(was / 100).toFixed(2)} to $${(
          product.priceCents / 100
        ).toFixed(2)}`,
        deliveryStatus: "sent",
      });
    }
  });

  return userId;
}

// Utility to find or create a watch target
export function findOrCreateTarget(
  targetType: "asin" | "url",
  asin?: string,
  marketplace?: number,
  normalizedUrl?: string,
): WatchTarget {
  const existing = Array.from(database.targets.values()).find((t) => {
    if (targetType === "asin") {
      return t.targetType === "asin" && t.asin === asin && t.marketplace === marketplace;
    } else {
      return t.targetType === "url" && t.normalizedUrl === normalizedUrl;
    }
  });

  if (existing) return existing;

  const id = "target-" + uuid();
  const target: WatchTarget = {
    id,
    targetType,
    asin: asin || null,
    marketplace: marketplace || null,
    normalizedUrl: normalizedUrl || null,
    pollIntervalMinutes: 360,
    nextPollAt: new Date(),
    lastPolledAt: null,
    lastPriceCents: null,
    lastStockStatus: "unknown",
    lastSnapshot: null,
    failureCount: 0,
    lastFailedAt: null,
    pausedUntil: null,
  };

  database.targets.set(id, target);
  return target;
}

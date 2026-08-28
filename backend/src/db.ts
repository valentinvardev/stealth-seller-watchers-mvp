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
  // producer-owned jsonb in the real backend; the frontend's alert feed reads
  // {condition, before:{priceCents}, after:{priceCents}} out of it
  whatChanged: unknown;
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

// Every seeded id and timestamp here is deterministic, and that is the point.
//
// This runs per serverless instance, and Vercel keeps several alive at once. A
// random id per instance meant the same browser got a different user from one
// request to the next, which the frontend reads as an account switch -- it
// re-identifies the session and refetches, which is what shows up as the page
// reloading on its own.
//
// Fixed ids make every instance answer identically. Timestamps are anchored to
// the top of the hour for the same reason: relative to now, so "checked 2h ago"
// stays true, but equal across instances within the hour.
const HOUR_MS = 60 * 60 * 1000;
const anchor = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;

export function initializeDemo() {
  const userId = "demo-user-sandbox";
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
    const targetId = `target-seed-${i}`;
    const scrapeFailed = !!product.failed || product.priceCents === null;

    database.targets.set(targetId, {
      id: targetId,
      targetType: "url",
      asin: null,
      marketplace: 1,
      normalizedUrl: product.url,
      pollIntervalMinutes: CADENCES[i % CADENCES.length],
      nextPollAt: new Date(anchor + HOUR_MS),
      // A page we could not read gets no successful poll and a failure stamp,
      // which is what drives the row's "can't read the page" state. Seeding it
      // honestly beats pretending every retailer scrapes cleanly.
      lastPolledAt: scrapeFailed ? null : new Date(anchor - (i + 1) * 900000),
      lastPriceCents: product.priceCents,
      lastStockStatus: scrapeFailed ? "unknown" : "in_stock",
      lastSnapshot: {
        title: product.title,
        imageUrl: product.image,
        priceCents: product.priceCents,
        stockStatus: scrapeFailed ? "unknown" : "in_stock",
      },
      failureCount: scrapeFailed ? 3 : 0,
      lastFailedAt: scrapeFailed ? new Date(anchor - HOUR_MS) : null,
      pausedUntil: null,
    });

    // Alternate the condition so both branches of the UI are represented, and
    // put the price target ~10% under the current price so it reads as a real
    // goal rather than an arbitrary number.
    const isPriceWatch = i % 3 !== 2;
    const watchId = `watch-seed-${i}`;
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
      expiresAt: new Date(anchor + 30 * 24 * HOUR_MS),
      status: "active",
      createdAt: new Date(anchor - (i + 1) * HOUR_MS),
      archivedAt: null,
      marketplace: 1,
    });

    // A couple of past fires so the alert feed and the hit counters are not
    // empty on first load.
    if (i % 5 === 0 && product.priceCents) {
      const was = Math.round(product.priceCents * 1.15);
      const alertId = `alert-seed-${i}`;
      database.alerts.set(alertId, {
        id: alertId,
        watchId,
        userId,
        marketplace: 1,
        triggeredAt: new Date(anchor - (i + 2) * 2 * HOUR_MS),
        // structured like the real producer writes it, so the v3 alert feed
        // renders the % chip and the before -> after prices instead of the
        // "Alert" fallback it uses for shapes it can't read
        whatChanged: {
          condition: "price_drop",
          before: { priceCents: was },
          after: { priceCents: product.priceCents },
        },
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

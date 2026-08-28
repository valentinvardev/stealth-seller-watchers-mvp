import { v4 as uuid } from "uuid";
// In-memory storage for MVP
export const database = {
    watches: new Map(),
    targets: new Map(),
    alerts: new Map(),
    users: new Map(),
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
    // Add demo watch target
    const targetId = "target-" + uuid();
    database.targets.set(targetId, {
        id: targetId,
        targetType: "asin",
        asin: "B08N5Z7GRT",
        marketplace: 1,
        normalizedUrl: null,
        pollIntervalMinutes: 360,
        nextPollAt: new Date(Date.now() + 3600000),
        lastPolledAt: new Date(Date.now() - 3600000),
        lastPriceCents: 2999,
        lastStockStatus: "in_stock",
        lastSnapshot: {
            title: "Sony WH-1000XM5 Wireless Headphones",
            imageUrl: "https://images-na.ssl-images-amazon.com/images/I/51qVuAeaCqL.jpg",
            priceCents: 2999,
            stockStatus: "in_stock",
        },
        failureCount: 0,
        lastFailedAt: null,
        pausedUntil: null,
    });
    // Add demo watch
    const watchId = "watch-" + uuid();
    database.watches.set(watchId, {
        id: watchId,
        userId,
        targetId,
        condition: "price_drop",
        thresholdCents: 2500,
        thresholdPercent: null,
        reason: null,
        pollIntervalMinutes: 360,
        snoozeUntil: null,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600000),
        status: "active",
        createdAt: new Date(Date.now() - 24 * 3600000),
        archivedAt: null,
        marketplace: 1,
    });
    // Add demo alert
    const alertId = "alert-" + uuid();
    database.alerts.set(alertId, {
        id: alertId,
        watchId,
        userId,
        marketplace: 1,
        triggeredAt: new Date(Date.now() - 2 * 3600000),
        whatChanged: "Price dropped from $299.99 to $279.99 (6.7% drop)",
        deliveryStatus: "sent",
    });
    return userId;
}
// Utility to find or create a watch target
export function findOrCreateTarget(targetType, asin, marketplace, normalizedUrl) {
    const existing = Array.from(database.targets.values()).find((t) => {
        if (targetType === "asin") {
            return t.targetType === "asin" && t.asin === asin && t.marketplace === marketplace;
        }
        else {
            return t.targetType === "url" && t.normalizedUrl === normalizedUrl;
        }
    });
    if (existing)
        return existing;
    const id = "target-" + uuid();
    const target = {
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
//# sourceMappingURL=db.js.map
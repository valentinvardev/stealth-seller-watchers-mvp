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
export declare const database: {
    watches: Map<string, Watch>;
    targets: Map<string, WatchTarget>;
    alerts: Map<string, Alert>;
    users: Map<string, User>;
};
export declare function initializeDemo(): string;
export declare function findOrCreateTarget(targetType: "asin" | "url", asin?: string, marketplace?: number, normalizedUrl?: string): WatchTarget;
//# sourceMappingURL=db.d.ts.map
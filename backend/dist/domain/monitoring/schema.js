"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListAlertsSchema = exports.ArchiveWatchSchema = exports.UnsnoozeWatchSchema = exports.SnoozeWatchSchema = exports.CreateWatchSchema = exports.CreateUrlWatchSchema = exports.CreateAsinWatchSchema = exports.FAILURE_BACKOFF = exports.ORPHAN_TARGET_CLEANUP_DAYS = exports.TERMINAL_WATCH_CLEANUP_DAYS = exports.MAX_SNOOZE_DAYS = exports.TIER_DEFAULT_DURATION_DAYS = exports.MAX_WATCH_DURATION_DAYS = exports.PollIntervalEnum = exports.PollIntervalMinutes = exports.DeliveryStatusEnum = exports.WatchStatusEnum = exports.WatchConditionEnum = exports.TargetTypeEnum = void 0;
const zod_1 = require("zod");
// === ENUMS ===
exports.TargetTypeEnum = zod_1.z.enum(["asin", "url"]);
exports.WatchConditionEnum = zod_1.z.enum([
    "price_drop",
    "back_in_stock",
    "price_change",
    "custom_ai",
]);
exports.WatchStatusEnum = zod_1.z.enum(["active", "triggered", "expired", "archived"]);
exports.DeliveryStatusEnum = zod_1.z.enum(["pending", "sent", "failed"]);
// === CONSTANTS ===
exports.PollIntervalMinutes = {
    TWO_HOURS: 120,
    THREE_HOURS: 180,
    SIX_HOURS: 360,
    DAILY: 1440,
};
exports.PollIntervalEnum = zod_1.z.union([
    zod_1.z.literal(120),
    zod_1.z.literal(180),
    zod_1.z.literal(360),
    zod_1.z.literal(1440),
]);
exports.MAX_WATCH_DURATION_DAYS = 90;
exports.TIER_DEFAULT_DURATION_DAYS = {
    free: 7,
    paid: 30,
    premium: 90,
};
exports.MAX_SNOOZE_DAYS = 90;
exports.TERMINAL_WATCH_CLEANUP_DAYS = 90;
exports.ORPHAN_TARGET_CLEANUP_DAYS = 7;
exports.FAILURE_BACKOFF = {
    PERSISTENT_AFTER_FAILURES: 3,
};
// === CREATE WATCH ===
const expiresAtConstraint = zod_1.z
    .string()
    .datetime()
    .refine((d) => {
    const ms = new Date(d).getTime() - Date.now();
    return ms > 0 && ms <= exports.MAX_WATCH_DURATION_DAYS * 24 * 60 * 60 * 1000;
}, `expiresAt must be in the future and at most ${exports.MAX_WATCH_DURATION_DAYS} days from now`);
exports.CreateAsinWatchSchema = zod_1.z.object({
    targetType: zod_1.z.literal("asin"),
    asin: zod_1.z.string().min(1).max(20),
    marketplace: zod_1.z.number().int().min(1),
    condition: zod_1.z.enum(["price_drop", "back_in_stock"]),
    thresholdCents: zod_1.z.number().int().positive().optional(),
    thresholdPercent: zod_1.z.number().int().min(1).max(99).optional(),
    pollIntervalMinutes: exports.PollIntervalEnum,
    expiresAt: expiresAtConstraint,
});
exports.CreateUrlWatchSchema = zod_1.z
    .object({
    targetType: zod_1.z.literal("url"),
    url: zod_1.z.string().url(),
    condition: zod_1.z.enum(["price_change", "back_in_stock", "custom_ai"]),
    reason: zod_1.z.string().min(1).optional(),
    thresholdCents: zod_1.z.number().int().positive().optional(),
    thresholdPercent: zod_1.z.number().int().min(1).max(99).optional(),
    pollIntervalMinutes: exports.PollIntervalEnum,
    expiresAt: expiresAtConstraint,
})
    .refine((data) => data.condition !== "custom_ai" || !!data.reason, {
    message: "custom_ai watches require a reason",
    path: ["reason"],
});
exports.CreateWatchSchema = zod_1.z.union([
    exports.CreateAsinWatchSchema,
    exports.CreateUrlWatchSchema,
]);
// === UPDATE WATCH ===
exports.SnoozeWatchSchema = zod_1.z.object({
    watchId: zod_1.z.string().uuid(),
    snoozeUntil: zod_1.z
        .string()
        .datetime()
        .refine((d) => {
        const ms = new Date(d).getTime() - Date.now();
        return ms > 0 && ms <= exports.MAX_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    }, `snoozeUntil must be in the future and at most ${exports.MAX_SNOOZE_DAYS} days from now`),
});
exports.UnsnoozeWatchSchema = zod_1.z.object({ watchId: zod_1.z.string().uuid() });
exports.ArchiveWatchSchema = zod_1.z.object({ watchId: zod_1.z.string().uuid() });
// === ALERTS ===
exports.ListAlertsSchema = zod_1.z.object({
    limit: zod_1.z.number().int().min(1).max(100).default(50),
    cursor: zod_1.z.string().datetime().optional(),
});
//# sourceMappingURL=schema.js.map
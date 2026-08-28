"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const server_1 = require("@trpc/server");
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const db_1 = require("./db");
const t = server_1.initTRPC.context().create();
const PollIntervalEnum = zod_1.z.union([zod_1.z.literal(120), zod_1.z.literal(180), zod_1.z.literal(360), zod_1.z.literal(1440)]);
const CreateWatchSchema = zod_1.z.object({
    targetType: zod_1.z.enum(["asin", "url"]),
    asin: zod_1.z.string().optional(),
    url: zod_1.z.string().url().optional(),
    marketplace: zod_1.z.number().int(),
    condition: zod_1.z.enum(["price_drop", "back_in_stock", "price_change"]),
    thresholdCents: zod_1.z.number().int().positive().optional(),
    thresholdPercent: zod_1.z.number().int().min(1).max(99).optional(),
    pollIntervalMinutes: PollIntervalEnum,
    expiresAt: zod_1.z.string().datetime(),
    reason: zod_1.z.string().optional(),
});
exports.router = t.router({
    // List all active watches for the user
    listWatches: t.procedure.query(({ ctx }) => {
        const watches = Array.from(db_1.database.watches.values())
            .filter((w) => w.userId === ctx.userId && w.status === "active")
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((w) => {
            const target = db_1.database.targets.get(w.targetId);
            if (!target)
                return null;
            return {
                id: w.id,
                condition: w.condition,
                thresholdCents: w.thresholdCents,
                thresholdPercent: w.thresholdPercent,
                reason: w.reason,
                pollIntervalMinutes: w.pollIntervalMinutes,
                snoozeUntil: w.snoozeUntil,
                expiresAt: w.expiresAt,
                status: w.status,
                createdAt: w.createdAt,
                alertCount: Array.from(db_1.database.alerts.values()).filter((a) => a.watchId === w.id).length,
                target: {
                    targetType: target.targetType,
                    asin: target.asin,
                    marketplace: target.marketplace,
                    url: target.normalizedUrl,
                    title: target.lastSnapshot?.title || "Unknown",
                    image: target.lastSnapshot?.imageUrl || null,
                    lastPolledAt: target.lastPolledAt,
                    failureCount: target.failureCount,
                    lastFailedAt: target.lastFailedAt,
                    currentPriceCents: target.lastPriceCents,
                    currentStock: target.lastStockStatus,
                },
            };
        })
            .filter((w) => w !== null);
        return watches;
    }),
    // Create a new watch
    createWatch: t.procedure.input(CreateWatchSchema).mutation(({ input, ctx }) => {
        if (input.targetType === "asin" && !input.asin) {
            throw new server_1.TRPCError({
                code: "BAD_REQUEST",
                message: "ASIN is required for ASIN watches",
            });
        }
        if (input.targetType === "url" && !input.url) {
            throw new server_1.TRPCError({
                code: "BAD_REQUEST",
                message: "URL is required for URL watches",
            });
        }
        const target = (0, db_1.findOrCreateTarget)(input.targetType, input.asin, input.marketplace, input.url);
        const watch = {
            id: "watch-" + (0, uuid_1.v4)(),
            userId: ctx.userId,
            targetId: target.id,
            condition: input.condition,
            thresholdCents: input.thresholdCents ?? null,
            thresholdPercent: input.thresholdPercent ?? null,
            reason: input.reason ?? null,
            pollIntervalMinutes: input.pollIntervalMinutes,
            snoozeUntil: null,
            expiresAt: new Date(input.expiresAt),
            status: "active",
            createdAt: new Date(),
            archivedAt: null,
            marketplace: input.marketplace,
        };
        db_1.database.watches.set(watch.id, watch);
        return watch;
    }),
    // Archive a watch
    archiveWatch: t.procedure
        .input(zod_1.z.object({ watchId: zod_1.z.string() }))
        .mutation(({ input, ctx }) => {
        const watch = db_1.database.watches.get(input.watchId);
        if (!watch || watch.userId !== ctx.userId) {
            throw new server_1.TRPCError({
                code: "NOT_FOUND",
                message: "Watch not found",
            });
        }
        watch.status = "archived";
        watch.archivedAt = new Date();
        return watch;
    }),
    // Snooze a watch
    snoozeWatch: t.procedure
        .input(zod_1.z.object({
        watchId: zod_1.z.string(),
        snoozeUntil: zod_1.z.string().datetime(),
    }))
        .mutation(({ input, ctx }) => {
        const watch = db_1.database.watches.get(input.watchId);
        if (!watch || watch.userId !== ctx.userId) {
            throw new server_1.TRPCError({
                code: "NOT_FOUND",
                message: "Watch not found",
            });
        }
        watch.snoozeUntil = new Date(input.snoozeUntil);
        return watch;
    }),
    // Unsnooz a watch
    unsnoozeWatch: t.procedure
        .input(zod_1.z.object({ watchId: zod_1.z.string() }))
        .mutation(({ input, ctx }) => {
        const watch = db_1.database.watches.get(input.watchId);
        if (!watch || watch.userId !== ctx.userId) {
            throw new server_1.TRPCError({
                code: "NOT_FOUND",
                message: "Watch not found",
            });
        }
        if (!watch.snoozeUntil) {
            throw new server_1.TRPCError({
                code: "BAD_REQUEST",
                message: "Watch is not snoozed",
            });
        }
        watch.snoozeUntil = null;
        return watch;
    }),
    // Set watch cadence (polling interval)
    setWatchCadence: t.procedure
        .input(zod_1.z.object({
        watchId: zod_1.z.string(),
        pollIntervalMinutes: PollIntervalEnum,
    }))
        .mutation(({ input, ctx }) => {
        const watch = db_1.database.watches.get(input.watchId);
        if (!watch || watch.userId !== ctx.userId) {
            throw new server_1.TRPCError({
                code: "NOT_FOUND",
                message: "Watch not found",
            });
        }
        watch.pollIntervalMinutes = input.pollIntervalMinutes;
        return watch;
    }),
    // Get credits
    getCredits: t.procedure.query(({ ctx }) => {
        const user = db_1.database.users.get(ctx.userId);
        if (!user) {
            throw new server_1.TRPCError({
                code: "NOT_FOUND",
                message: "User not found",
            });
        }
        return {
            grant: user.watchCreditsGrant,
            purchased: user.watchCreditsPurchased,
            total: user.watchCreditsGrant + user.watchCreditsPurchased,
            monthlyGrant: 100, // Premium tier
            refillsAt: new Date(Date.now() + 30 * 24 * 3600000),
            isComped: false,
        };
    }),
    // List alerts
    listAlerts: t.procedure
        .input(zod_1.z.object({ limit: zod_1.z.number().int().default(50), cursor: zod_1.z.string().optional() }))
        .query(({ input, ctx }) => {
        const alerts = Array.from(db_1.database.alerts.values())
            .filter((a) => a.userId === ctx.userId)
            .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
            .slice(0, input.limit)
            .map((a) => {
            const watch = db_1.database.watches.get(a.watchId);
            const target = watch ? db_1.database.targets.get(watch.targetId) : null;
            return {
                id: a.id,
                triggeredAt: a.triggeredAt,
                whatChanged: a.whatChanged,
                deliveryStatus: a.deliveryStatus,
                target: target
                    ? {
                        targetType: target.targetType,
                        asin: target.asin,
                        marketplace: target.marketplace,
                        url: target.normalizedUrl,
                        title: target.lastSnapshot?.title || "Unknown",
                        image: target.lastSnapshot?.imageUrl || null,
                        currentPriceCents: target.lastPriceCents,
                        currentStock: target.lastStockStatus,
                    }
                    : null,
            };
        });
        return alerts;
    }),
    // Simulate an alert (for demo purposes)
    simulateAlert: t.procedure
        .input(zod_1.z.object({ watchId: zod_1.z.string(), message: zod_1.z.string() }))
        .mutation(({ input, ctx }) => {
        const watch = db_1.database.watches.get(input.watchId);
        if (!watch || watch.userId !== ctx.userId) {
            throw new server_1.TRPCError({
                code: "NOT_FOUND",
                message: "Watch not found",
            });
        }
        const alert = {
            id: "alert-" + (0, uuid_1.v4)(),
            watchId: input.watchId,
            userId: ctx.userId,
            marketplace: ctx.marketplace,
            triggeredAt: new Date(),
            whatChanged: input.message,
            deliveryStatus: "sent",
        };
        db_1.database.alerts.set(alert.id, alert);
        watch.status = "triggered";
        return alert;
    }),
});
//# sourceMappingURL=trpc.js.map
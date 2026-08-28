import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { database, findOrCreateTarget } from "./db";
const t = initTRPC.context().create();
const PollIntervalEnum = z.union([z.literal(120), z.literal(180), z.literal(360), z.literal(1440)]);
const CreateWatchSchema = z.object({
    targetType: z.enum(["asin", "url"]),
    asin: z.string().optional(),
    url: z.string().url().optional(),
    marketplace: z.number().int(),
    condition: z.enum(["price_drop", "back_in_stock", "price_change"]),
    thresholdCents: z.number().int().positive().optional(),
    thresholdPercent: z.number().int().min(1).max(99).optional(),
    pollIntervalMinutes: PollIntervalEnum,
    expiresAt: z.string().datetime(),
    reason: z.string().optional(),
});
export const router = t.router({
    // List all active watches for the user
    listWatches: t.procedure.query(({ ctx }) => {
        const watches = Array.from(database.watches.values())
            .filter((w) => w.userId === ctx.userId && w.status === "active")
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((w) => {
            const target = database.targets.get(w.targetId);
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
                alertCount: Array.from(database.alerts.values()).filter((a) => a.watchId === w.id).length,
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
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "ASIN is required for ASIN watches",
            });
        }
        if (input.targetType === "url" && !input.url) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "URL is required for URL watches",
            });
        }
        const target = findOrCreateTarget(input.targetType, input.asin, input.marketplace, input.url);
        const watch = {
            id: "watch-" + uuid(),
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
        database.watches.set(watch.id, watch);
        return watch;
    }),
    // Archive a watch
    archiveWatch: t.procedure
        .input(z.object({ watchId: z.string() }))
        .mutation(({ input, ctx }) => {
        const watch = database.watches.get(input.watchId);
        if (!watch || watch.userId !== ctx.userId) {
            throw new TRPCError({
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
        .input(z.object({
        watchId: z.string(),
        snoozeUntil: z.string().datetime(),
    }))
        .mutation(({ input, ctx }) => {
        const watch = database.watches.get(input.watchId);
        if (!watch || watch.userId !== ctx.userId) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Watch not found",
            });
        }
        watch.snoozeUntil = new Date(input.snoozeUntil);
        return watch;
    }),
    // Unsnooz a watch
    unsnoozeWatch: t.procedure
        .input(z.object({ watchId: z.string() }))
        .mutation(({ input, ctx }) => {
        const watch = database.watches.get(input.watchId);
        if (!watch || watch.userId !== ctx.userId) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Watch not found",
            });
        }
        if (!watch.snoozeUntil) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Watch is not snoozed",
            });
        }
        watch.snoozeUntil = null;
        return watch;
    }),
    // Set watch cadence (polling interval)
    setWatchCadence: t.procedure
        .input(z.object({
        watchId: z.string(),
        pollIntervalMinutes: PollIntervalEnum,
    }))
        .mutation(({ input, ctx }) => {
        const watch = database.watches.get(input.watchId);
        if (!watch || watch.userId !== ctx.userId) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Watch not found",
            });
        }
        watch.pollIntervalMinutes = input.pollIntervalMinutes;
        return watch;
    }),
    // Get credits
    getCredits: t.procedure.query(({ ctx }) => {
        const user = database.users.get(ctx.userId);
        if (!user) {
            throw new TRPCError({
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
        .input(z.object({ limit: z.number().int().default(50), cursor: z.string().optional() }))
        .query(({ input, ctx }) => {
        const alerts = Array.from(database.alerts.values())
            .filter((a) => a.userId === ctx.userId)
            .sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime())
            .slice(0, input.limit)
            .map((a) => {
            const watch = database.watches.get(a.watchId);
            const target = watch ? database.targets.get(watch.targetId) : null;
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
        .input(z.object({ watchId: z.string(), message: z.string() }))
        .mutation(({ input, ctx }) => {
        const watch = database.watches.get(input.watchId);
        if (!watch || watch.userId !== ctx.userId) {
            throw new TRPCError({
                code: "NOT_FOUND",
                message: "Watch not found",
            });
        }
        const alert = {
            id: "alert-" + uuid(),
            watchId: input.watchId,
            userId: ctx.userId,
            marketplace: ctx.marketplace,
            triggeredAt: new Date(),
            whatChanged: input.message,
            deliveryStatus: "sent",
        };
        database.alerts.set(alert.id, alert);
        watch.status = "triggered";
        return alert;
    }),
});
//# sourceMappingURL=trpc.js.map
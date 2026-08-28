import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import superjson from "superjson";
import { database, findOrCreateTarget } from "./db";
import type { Watch, Alert } from "./db";

interface Context {
  userId: string;
  marketplace: number;
}

// superjson: the real frontend's tRPC client is configured with it, so the
// sandbox backend has to match or Date fields arrive as strings and the
// watchers page's formatRelative() calls blow up.
const t = initTRPC.context<Context>().create({ transformer: superjson });

const PollIntervalEnum = z.union([z.literal(120), z.literal(180), z.literal(360), z.literal(1440)]);

const CreateWatchSchema = z.object({
  targetType: z.enum(["asin", "url"]),
  asin: z.string().optional(),
  url: z.string().url().optional(),
  marketplace: z.number().int().optional(),
  condition: z.enum(["price_drop", "back_in_stock", "price_change", "custom_ai"]),
  thresholdCents: z.number().int().positive().optional(),
  thresholdPercent: z.number().int().min(1).max(99).optional(),
  pollIntervalMinutes: PollIntervalEnum,
  expiresAt: z.string().datetime(),
  reason: z.string().optional(),
});

function ownedWatchOrThrow(watchId: string, userId: string): Watch {
  const w = database.watches.get(watchId);
  if (!w || w.userId !== userId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Watch not found" });
  }
  return w;
}

// Shapes a watch row the way the real listWatches does: the watch fields plus
// the joined target, since the table renders what is being watched, not ids.
function serializeWatch(w: Watch) {
  const target = database.targets.get(w.targetId);
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
      targetType: target?.targetType ?? "asin",
      asin: target?.asin ?? null,
      marketplace: target?.marketplace ?? null,
      url: target?.normalizedUrl ?? null,
      title: target?.lastSnapshot?.title ?? null,
      image: target?.lastSnapshot?.imageUrl ?? null,
      lastPolledAt: target?.lastPolledAt ?? null,
      failureCount: target?.failureCount ?? 0,
      lastFailedAt: target?.lastFailedAt ?? null,
      currentPriceCents: target?.lastPriceCents ?? null,
      currentStock: target?.lastStockStatus ?? null,
    },
  };
}

const monitoringRouter = t.router({
  listWatches: t.procedure.query(({ ctx }) =>
    Array.from(database.watches.values())
      .filter((w) => w.userId === ctx.userId && w.status === "active")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(serializeWatch),
  ),

  createWatch: t.procedure.input(CreateWatchSchema).mutation(({ input, ctx }) => {
    if (input.targetType === "asin" && !input.asin) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "ASIN is required for ASIN watches" });
    }
    if (input.targetType === "url" && !input.url) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "URL is required for URL watches" });
    }

    const marketplace = input.marketplace ?? ctx.marketplace;
    const target = findOrCreateTarget(input.targetType, input.asin, marketplace, input.url);

    const watch: Watch = {
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
      marketplace,
    };

    database.watches.set(watch.id, watch);
    return watch;
  }),

  archiveWatch: t.procedure
    .input(z.object({ watchId: z.string() }))
    .mutation(({ input, ctx }) => {
      const watch = ownedWatchOrThrow(input.watchId, ctx.userId);
      watch.status = "archived";
      watch.archivedAt = new Date();
      return watch;
    }),

  snoozeWatch: t.procedure
    .input(z.object({ watchId: z.string(), snoozeUntil: z.string().datetime() }))
    .mutation(({ input, ctx }) => {
      const watch = ownedWatchOrThrow(input.watchId, ctx.userId);
      watch.snoozeUntil = new Date(input.snoozeUntil);
      return watch;
    }),

  unsnoozeWatch: t.procedure
    .input(z.object({ watchId: z.string() }))
    .mutation(({ input, ctx }) => {
      const watch = ownedWatchOrThrow(input.watchId, ctx.userId);
      if (!watch.snoozeUntil) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Watch is not snoozed" });
      }
      watch.snoozeUntil = null;
      return watch;
    }),

  setWatchCadence: t.procedure
    .input(z.object({ watchId: z.string(), pollIntervalMinutes: PollIntervalEnum }))
    .mutation(({ input, ctx }) => {
      const watch = ownedWatchOrThrow(input.watchId, ctx.userId);
      watch.pollIntervalMinutes = input.pollIntervalMinutes;
      return watch;
    }),

  // price_drop only; null clears the target price back to "any drop"
  setWatchThreshold: t.procedure
    .input(z.object({ watchId: z.string(), thresholdCents: z.number().int().positive().nullable() }))
    .mutation(({ input, ctx }) => {
      const watch = ownedWatchOrThrow(input.watchId, ctx.userId);
      if (watch.condition !== "price_drop") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only price drop watches take a target price",
        });
      }
      watch.thresholdCents = input.thresholdCents;
      return watch;
    }),

  getCredits: t.procedure.query(({ ctx }) => {
    const user = database.users.get(ctx.userId);
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return {
      grant: user.watchCreditsGrant,
      purchased: user.watchCreditsPurchased,
      total: user.watchCreditsGrant + user.watchCreditsPurchased,
      monthlyGrant: 100,
      refillsAt: new Date(Date.now() + 30 * 24 * 3600000),
      isComped: false,
    };
  }),

  getWatcherStatus: t.procedure.query(({ ctx }) => {
    const user = database.users.get(ctx.userId);
    return { pausedAt: user?.watchersPausedAt ?? null };
  }),

  // user-level kill switch behind the page's Off/On toggle
  setWatchersPaused: t.procedure
    .input(z.object({ isPaused: z.boolean() }))
    .mutation(({ input, ctx }) => {
      const user = database.users.get(ctx.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      user.watchersPausedAt = input.isPaused ? new Date() : null;
      return { pausedAt: user.watchersPausedAt };
    }),

  listAlerts: t.procedure
    .input(z.object({ limit: z.number().int().default(50), cursor: z.string().optional() }))
    .query(({ input, ctx }) =>
      Array.from(database.alerts.values())
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
            target: target && {
              targetType: target.targetType,
              asin: target.asin,
              marketplace: target.marketplace,
              url: target.normalizedUrl,
              title: target.lastSnapshot?.title ?? null,
              image: target.lastSnapshot?.imageUrl ?? null,
              currentPriceCents: target.lastPriceCents,
              currentStock: target.lastStockStatus,
            },
          };
        }),
    ),

  // sandbox-only: fires a synthetic alert so the feed can be demoed without
  // waiting on a real poll. Not part of the production router. Accepts the
  // structured whatChanged shape the v3 feed renders; message is the legacy
  // string fallback.
  simulateAlert: t.procedure
    .input(
      z.object({
        watchId: z.string(),
        whatChanged: z.record(z.unknown()).optional(),
        message: z.string().optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      ownedWatchOrThrow(input.watchId, ctx.userId);
      const alert: Alert = {
        id: "alert-" + uuid(),
        watchId: input.watchId,
        userId: ctx.userId,
        marketplace: ctx.marketplace,
        triggeredAt: new Date(),
        whatChanged: input.whatChanged ?? input.message ?? { condition: "price_change" },
        deliveryStatus: "sent",
      };
      database.alerts.set(alert.id, alert);
      return alert;
    }),
});

// The real frontend boots behind CurrentUserProvider, which blocks the whole
// shell on account.getMe. The sandbox has no auth, so getMe returns a fixed
// user. Its email matches WATCHERS_PREVIEW_EMAIL so the watchers route gate
// passes even if VITE_SENTRY_ENVIRONMENT is set to "production".
const accountRouter = t.router({
  getMe: t.procedure.query(({ ctx }) => ({
    id: ctx.userId,
    email: "claude@stealthseller.co",
    fullName: "Watchers Sandbox",
    type: "admin",
    country: "US",
    preferredZipcode: "10001",
    timezone: "America/New_York",
    marketplace: ctx.marketplace,
    metadata: {},
    // V3FunnelGuard reads these three. isComped grants paid access without a
    // Stripe subscription, and signupStep "done" means free roam -- otherwise
    // the guard routes every request to /plans or back into the signup funnel.
    subscription: { status: "active" },
    isComped: true,
    signupStep: "done",
    isEmailNotificationOn: true,
    banned: false,
    banExpires: null,
    currentDeviceId: null,
    lastActive: new Date(),
    createdAt: new Date(Date.now() - 90 * 24 * 3600000),
  })),
});

export const router = t.router({
  monitoring: monitoringRouter,
  account: accountRouter,
});

export type AppRouter = typeof router;

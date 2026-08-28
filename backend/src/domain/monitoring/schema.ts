import { z } from "zod";

// === ENUMS ===

export const TargetTypeEnum = z.enum(["asin", "url"]);
export type TargetType = z.infer<typeof TargetTypeEnum>;

export const WatchConditionEnum = z.enum([
  "price_drop",
  "back_in_stock",
  "price_change",
  "custom_ai",
]);
export type WatchCondition = z.infer<typeof WatchConditionEnum>;

export const WatchStatusEnum = z.enum(["active", "triggered", "expired", "archived"]);
export type WatchStatus = z.infer<typeof WatchStatusEnum>;

export const DeliveryStatusEnum = z.enum(["pending", "sent", "failed"]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusEnum>;

// === CONSTANTS ===

export const PollIntervalMinutes = {
  TWO_HOURS: 120,
  THREE_HOURS: 180,
  SIX_HOURS: 360,
  DAILY: 1440,
} as const;

export const PollIntervalEnum = z.union([
  z.literal(120),
  z.literal(180),
  z.literal(360),
  z.literal(1440),
]);

export const MAX_WATCH_DURATION_DAYS = 90;

export const TIER_DEFAULT_DURATION_DAYS = {
  free: 7,
  paid: 30,
  premium: 90,
} as const;

export const MAX_SNOOZE_DAYS = 90;

export const TERMINAL_WATCH_CLEANUP_DAYS = 90;
export const ORPHAN_TARGET_CLEANUP_DAYS = 7;

export const FAILURE_BACKOFF = {
  PERSISTENT_AFTER_FAILURES: 3,
} as const;

// === CREATE WATCH ===

const expiresAtConstraint = z
  .string()
  .datetime()
  .refine((d) => {
    const ms = new Date(d).getTime() - Date.now();
    return ms > 0 && ms <= MAX_WATCH_DURATION_DAYS * 24 * 60 * 60 * 1000;
  }, `expiresAt must be in the future and at most ${MAX_WATCH_DURATION_DAYS} days from now`);

export const CreateAsinWatchSchema = z.object({
  targetType: z.literal("asin"),
  asin: z.string().min(1).max(20),
  marketplace: z.number().int().min(1),
  condition: z.enum(["price_drop", "back_in_stock"]),
  thresholdCents: z.number().int().positive().optional(),
  thresholdPercent: z.number().int().min(1).max(99).optional(),
  pollIntervalMinutes: PollIntervalEnum,
  expiresAt: expiresAtConstraint,
});

export const CreateUrlWatchSchema = z
  .object({
    targetType: z.literal("url"),
    url: z.string().url(),
    condition: z.enum(["price_change", "back_in_stock", "custom_ai"]),
    reason: z.string().min(1).optional(),
    thresholdCents: z.number().int().positive().optional(),
    thresholdPercent: z.number().int().min(1).max(99).optional(),
    pollIntervalMinutes: PollIntervalEnum,
    expiresAt: expiresAtConstraint,
  })
  .refine((data) => data.condition !== "custom_ai" || !!data.reason, {
    message: "custom_ai watches require a reason",
    path: ["reason"],
  });

export const CreateWatchSchema = z.discriminatedUnion("targetType", [
  CreateAsinWatchSchema,
  CreateUrlWatchSchema,
]);
export type CreateWatchInput = z.infer<typeof CreateWatchSchema>;

// === UPDATE WATCH ===

export const SnoozeWatchSchema = z.object({
  watchId: z.string().uuid(),
  snoozeUntil: z
    .string()
    .datetime()
    .refine((d) => {
      const ms = new Date(d).getTime() - Date.now();
      return ms > 0 && ms <= MAX_SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    }, `snoozeUntil must be in the future and at most ${MAX_SNOOZE_DAYS} days from now`),
});

export const UnsnoozeWatchSchema = z.object({ watchId: z.string().uuid() });

export const ArchiveWatchSchema = z.object({ watchId: z.string().uuid() });

// === ALERTS ===

export const ListAlertsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().datetime().optional(),
});

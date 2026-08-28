import { z } from "zod";
export declare const TargetTypeEnum: z.ZodEnum<["asin", "url"]>;
export type TargetType = z.infer<typeof TargetTypeEnum>;
export declare const WatchConditionEnum: z.ZodEnum<["price_drop", "back_in_stock", "price_change", "custom_ai"]>;
export type WatchCondition = z.infer<typeof WatchConditionEnum>;
export declare const WatchStatusEnum: z.ZodEnum<["active", "triggered", "expired", "archived"]>;
export type WatchStatus = z.infer<typeof WatchStatusEnum>;
export declare const DeliveryStatusEnum: z.ZodEnum<["pending", "sent", "failed"]>;
export type DeliveryStatus = z.infer<typeof DeliveryStatusEnum>;
export declare const PollIntervalMinutes: {
    readonly TWO_HOURS: 120;
    readonly THREE_HOURS: 180;
    readonly SIX_HOURS: 360;
    readonly DAILY: 1440;
};
export declare const PollIntervalEnum: z.ZodUnion<[z.ZodLiteral<120>, z.ZodLiteral<180>, z.ZodLiteral<360>, z.ZodLiteral<1440>]>;
export declare const MAX_WATCH_DURATION_DAYS = 90;
export declare const TIER_DEFAULT_DURATION_DAYS: {
    readonly free: 7;
    readonly paid: 30;
    readonly premium: 90;
};
export declare const MAX_SNOOZE_DAYS = 90;
export declare const TERMINAL_WATCH_CLEANUP_DAYS = 90;
export declare const ORPHAN_TARGET_CLEANUP_DAYS = 7;
export declare const FAILURE_BACKOFF: {
    readonly PERSISTENT_AFTER_FAILURES: 3;
};
export declare const CreateAsinWatchSchema: z.ZodObject<{
    targetType: z.ZodLiteral<"asin">;
    asin: z.ZodString;
    marketplace: z.ZodNumber;
    condition: z.ZodEnum<["price_drop", "back_in_stock"]>;
    thresholdCents: z.ZodOptional<z.ZodNumber>;
    thresholdPercent: z.ZodOptional<z.ZodNumber>;
    pollIntervalMinutes: z.ZodUnion<[z.ZodLiteral<120>, z.ZodLiteral<180>, z.ZodLiteral<360>, z.ZodLiteral<1440>]>;
    expiresAt: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    asin?: string;
    targetType?: "asin";
    marketplace?: number;
    condition?: "price_drop" | "back_in_stock";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
}, {
    asin?: string;
    targetType?: "asin";
    marketplace?: number;
    condition?: "price_drop" | "back_in_stock";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
}>;
export declare const CreateUrlWatchSchema: z.ZodEffects<z.ZodObject<{
    targetType: z.ZodLiteral<"url">;
    url: z.ZodString;
    condition: z.ZodEnum<["price_change", "back_in_stock", "custom_ai"]>;
    reason: z.ZodOptional<z.ZodString>;
    thresholdCents: z.ZodOptional<z.ZodNumber>;
    thresholdPercent: z.ZodOptional<z.ZodNumber>;
    pollIntervalMinutes: z.ZodUnion<[z.ZodLiteral<120>, z.ZodLiteral<180>, z.ZodLiteral<360>, z.ZodLiteral<1440>]>;
    expiresAt: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    url?: string;
    targetType?: "url";
    condition?: "back_in_stock" | "price_change" | "custom_ai";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
    reason?: string;
}, {
    url?: string;
    targetType?: "url";
    condition?: "back_in_stock" | "price_change" | "custom_ai";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
    reason?: string;
}>, {
    url?: string;
    targetType?: "url";
    condition?: "back_in_stock" | "price_change" | "custom_ai";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
    reason?: string;
}, {
    url?: string;
    targetType?: "url";
    condition?: "back_in_stock" | "price_change" | "custom_ai";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
    reason?: string;
}>;
export declare const CreateWatchSchema: z.ZodUnion<[z.ZodObject<{
    targetType: z.ZodLiteral<"asin">;
    asin: z.ZodString;
    marketplace: z.ZodNumber;
    condition: z.ZodEnum<["price_drop", "back_in_stock"]>;
    thresholdCents: z.ZodOptional<z.ZodNumber>;
    thresholdPercent: z.ZodOptional<z.ZodNumber>;
    pollIntervalMinutes: z.ZodUnion<[z.ZodLiteral<120>, z.ZodLiteral<180>, z.ZodLiteral<360>, z.ZodLiteral<1440>]>;
    expiresAt: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    asin?: string;
    targetType?: "asin";
    marketplace?: number;
    condition?: "price_drop" | "back_in_stock";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
}, {
    asin?: string;
    targetType?: "asin";
    marketplace?: number;
    condition?: "price_drop" | "back_in_stock";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
}>, z.ZodEffects<z.ZodObject<{
    targetType: z.ZodLiteral<"url">;
    url: z.ZodString;
    condition: z.ZodEnum<["price_change", "back_in_stock", "custom_ai"]>;
    reason: z.ZodOptional<z.ZodString>;
    thresholdCents: z.ZodOptional<z.ZodNumber>;
    thresholdPercent: z.ZodOptional<z.ZodNumber>;
    pollIntervalMinutes: z.ZodUnion<[z.ZodLiteral<120>, z.ZodLiteral<180>, z.ZodLiteral<360>, z.ZodLiteral<1440>]>;
    expiresAt: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    url?: string;
    targetType?: "url";
    condition?: "back_in_stock" | "price_change" | "custom_ai";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
    reason?: string;
}, {
    url?: string;
    targetType?: "url";
    condition?: "back_in_stock" | "price_change" | "custom_ai";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
    reason?: string;
}>, {
    url?: string;
    targetType?: "url";
    condition?: "back_in_stock" | "price_change" | "custom_ai";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
    reason?: string;
}, {
    url?: string;
    targetType?: "url";
    condition?: "back_in_stock" | "price_change" | "custom_ai";
    thresholdCents?: number;
    thresholdPercent?: number;
    pollIntervalMinutes?: 120 | 180 | 360 | 1440;
    expiresAt?: string;
    reason?: string;
}>]>;
export type CreateWatchInput = z.infer<typeof CreateWatchSchema>;
export declare const SnoozeWatchSchema: z.ZodObject<{
    watchId: z.ZodString;
    snoozeUntil: z.ZodEffects<z.ZodString, string, string>;
}, "strip", z.ZodTypeAny, {
    watchId?: string;
    snoozeUntil?: string;
}, {
    watchId?: string;
    snoozeUntil?: string;
}>;
export declare const UnsnoozeWatchSchema: z.ZodObject<{
    watchId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    watchId?: string;
}, {
    watchId?: string;
}>;
export declare const ArchiveWatchSchema: z.ZodObject<{
    watchId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    watchId?: string;
}, {
    watchId?: string;
}>;
export declare const ListAlertsSchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodNumber>;
    cursor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    cursor?: string;
}, {
    limit?: number;
    cursor?: string;
}>;
//# sourceMappingURL=schema.d.ts.map
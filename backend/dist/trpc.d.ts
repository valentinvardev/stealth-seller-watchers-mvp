import superjson from "superjson";
import type { Watch, Alert } from "./db";
interface Context {
    userId: string;
    marketplace: number;
}
export declare const router: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
    ctx: Context;
    meta: object;
    errorShape: never;
    transformer: typeof superjson;
}>, {
    monitoring: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: Context;
        meta: object;
        errorShape: never;
        transformer: typeof superjson;
    }>, {
        listWatches: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _ctx_out: Context;
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
            _meta: object;
        }, {
            id: string;
            condition: "price_drop" | "back_in_stock" | "price_change" | "custom_ai";
            thresholdCents: number;
            thresholdPercent: number;
            reason: string;
            pollIntervalMinutes: 120 | 180 | 360 | 1440;
            snoozeUntil: Date;
            expiresAt: Date;
            status: "active" | "triggered" | "expired" | "archived";
            createdAt: Date;
            alertCount: number;
            target: {
                targetType: "asin" | "url";
                asin: string;
                marketplace: number;
                url: string;
                title: any;
                image: any;
                lastPolledAt: Date;
                failureCount: number;
                lastFailedAt: Date;
                currentPriceCents: number;
                currentStock: string;
            };
        }[]>;
        createWatch: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _meta: object;
            _ctx_out: Context;
            _input_in: {
                asin?: string;
                url?: string;
                targetType?: "asin" | "url";
                marketplace?: number;
                condition?: "price_drop" | "back_in_stock" | "price_change" | "custom_ai";
                thresholdCents?: number;
                thresholdPercent?: number;
                pollIntervalMinutes?: 120 | 180 | 360 | 1440;
                expiresAt?: string;
                reason?: string;
            };
            _input_out: {
                asin?: string;
                url?: string;
                targetType?: "asin" | "url";
                marketplace?: number;
                condition?: "price_drop" | "back_in_stock" | "price_change" | "custom_ai";
                thresholdCents?: number;
                thresholdPercent?: number;
                pollIntervalMinutes?: 120 | 180 | 360 | 1440;
                expiresAt?: string;
                reason?: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, Watch>;
        archiveWatch: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _meta: object;
            _ctx_out: Context;
            _input_in: {
                watchId?: string;
            };
            _input_out: {
                watchId?: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, Watch>;
        snoozeWatch: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _meta: object;
            _ctx_out: Context;
            _input_in: {
                watchId?: string;
                snoozeUntil?: string;
            };
            _input_out: {
                watchId?: string;
                snoozeUntil?: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, Watch>;
        unsnoozeWatch: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _meta: object;
            _ctx_out: Context;
            _input_in: {
                watchId?: string;
            };
            _input_out: {
                watchId?: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, Watch>;
        setWatchCadence: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _meta: object;
            _ctx_out: Context;
            _input_in: {
                pollIntervalMinutes?: 120 | 180 | 360 | 1440;
                watchId?: string;
            };
            _input_out: {
                pollIntervalMinutes?: 120 | 180 | 360 | 1440;
                watchId?: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, Watch>;
        setWatchThreshold: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _meta: object;
            _ctx_out: Context;
            _input_in: {
                thresholdCents?: number;
                watchId?: string;
            };
            _input_out: {
                thresholdCents?: number;
                watchId?: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, Watch>;
        getCredits: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _ctx_out: Context;
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
            _meta: object;
        }, {
            grant: number;
            purchased: number;
            total: number;
            monthlyGrant: number;
            refillsAt: Date;
            isComped: boolean;
        }>;
        getWatcherStatus: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _ctx_out: Context;
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
            _meta: object;
        }, {
            pausedAt: Date;
        }>;
        setWatchersPaused: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _meta: object;
            _ctx_out: Context;
            _input_in: {
                isPaused?: boolean;
            };
            _input_out: {
                isPaused?: boolean;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            pausedAt: Date;
        }>;
        listAlerts: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _meta: object;
            _ctx_out: Context;
            _input_in: {
                limit?: number;
                cursor?: string;
            };
            _input_out: {
                limit?: number;
                cursor?: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, {
            id: string;
            triggeredAt: Date;
            whatChanged: string;
            deliveryStatus: "pending" | "sent" | "failed";
            target: {
                targetType: "asin" | "url";
                asin: string;
                marketplace: number;
                url: string;
                title: any;
                image: any;
                currentPriceCents: number;
                currentStock: string;
            };
        }[]>;
        simulateAlert: import("@trpc/server").BuildProcedure<"mutation", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _meta: object;
            _ctx_out: Context;
            _input_in: {
                message?: string;
                watchId?: string;
            };
            _input_out: {
                message?: string;
                watchId?: string;
            };
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
        }, Alert>;
    }>;
    account: import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: Context;
        meta: object;
        errorShape: never;
        transformer: typeof superjson;
    }>, {
        getMe: import("@trpc/server").BuildProcedure<"query", {
            _config: import("@trpc/server").RootConfig<{
                ctx: Context;
                meta: object;
                errorShape: never;
                transformer: typeof superjson;
            }>;
            _ctx_out: Context;
            _input_in: typeof import("@trpc/server").unsetMarker;
            _input_out: typeof import("@trpc/server").unsetMarker;
            _output_in: typeof import("@trpc/server").unsetMarker;
            _output_out: typeof import("@trpc/server").unsetMarker;
            _meta: object;
        }, {
            id: string;
            email: string;
            fullName: string;
            type: string;
            country: string;
            preferredZipcode: string;
            timezone: string;
            marketplace: number;
            metadata: {};
            subscription: {
                status: string;
            };
            isComped: boolean;
            signupStep: string;
            isEmailNotificationOn: boolean;
            banned: boolean;
            banExpires: any;
            currentDeviceId: any;
            lastActive: Date;
            createdAt: Date;
        }>;
    }>;
}>;
export type AppRouter = typeof router;
export {};
//# sourceMappingURL=trpc.d.ts.map
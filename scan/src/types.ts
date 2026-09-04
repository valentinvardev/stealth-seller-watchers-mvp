import type { Product } from "./resolve";

export type Source = "scan" | "typed" | "shared" | "alert";

export type TripStatus = "kept" | "skipped" | "pending" | "notfound";

export type TripItem = {
  id: string;
  code: string;
  source: Source;
  at: number;
  status: TripStatus;
  title?: string;
  asin?: string;
  cost?: number;
  roi?: number;
  notes?: string;
  folder?: string;
};

export type Camera = "prompt" | "starting" | "scanning" | "denied" | "error" | "paused";

export type AlertContext = { kind: "price_drop" | "back_in_stock"; from?: number; to?: number; checkedAgo: string; store: string };

export type Lookup =
  | { code: string; source: Source; startedAt: number; state: "resolving"; alert?: AlertContext }
  | { code: string; source: Source; startedAt: number; state: "found"; product: Product; resolvedMs: number; alternatives?: Product[]; alert?: AlertContext }
  | { code: string; source: Source; startedAt: number; state: "multi"; candidates: Product[]; resolvedMs: number; alert?: AlertContext }
  | { code: string; source: Source; startedAt: number; state: "notfound"; resolvedMs: number; alert?: AlertContext };

export type Tab = "scan" | "trip" | "alerts" | "account";

export type Alert = {
  id: string;
  asin: string;
  title: string;
  context: AlertContext;
  at: number;
  read: boolean;
};

export const FOLDERS = ["Today's trip", "Walmart run", "Beauty, gated", "Replens"] as const;

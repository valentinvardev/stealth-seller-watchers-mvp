import type { Product } from "./resolve";

export type Source = "scan" | "typed";

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
};

export type Camera = "prompt" | "starting" | "scanning" | "denied" | "error" | "paused";

export type Lookup =
  | { code: string; source: Source; startedAt: number; state: "resolving" }
  | { code: string; source: Source; startedAt: number; state: "found"; product: Product; resolvedMs: number; alternatives?: Product[] }
  | { code: string; source: Source; startedAt: number; state: "multi"; candidates: Product[]; resolvedMs: number }
  | { code: string; source: Source; startedAt: number; state: "notfound"; resolvedMs: number };

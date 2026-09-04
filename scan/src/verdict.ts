import type { Product } from "./resolve";

// Pure functions on purpose: no React, no DOM. This is the part that has to
// give the same number on the phone and on the web, so it must be shareable.

// Mirrors the calculator settings the account already has (minRoi, minProfit).
export const SETTINGS = { minRoi: 0.5, minProfit: 5 };

export type PriceRead =
  | { kind: "spike"; pct: number }
  | { kind: "under"; pct: number }
  | { kind: "stable"; pct: number };

// The research rule: buy box well above the 90-day average is a spike, not an
// opportunity. Above 5 percent we compute on the average, never on today.
export function priceRead(p: Product): PriceRead {
  const pct = Math.round(((p.buyBox - p.avg90) / p.avg90) * 100);
  if (pct > 5) return { kind: "spike", pct };
  if (pct < -5) return { kind: "under", pct };
  return { kind: "stable", pct };
}

export function sellPriceUsed(p: Product): { price: number; onAverage: boolean } {
  const read = priceRead(p);
  return read.kind === "spike" ? { price: p.avg90, onAverage: true } : { price: p.buyBox, onAverage: false };
}

export function maxCost(p: Product): number {
  const net = sellPriceUsed(p).price - p.fees;
  return Math.max(0, Math.min(net / (1 + SETTINGS.minRoi), net - SETTINGS.minProfit));
}

export function evaluate(p: Product, cost: number): { profit: number; roi: number } {
  const net = sellPriceUsed(p).price - p.fees;
  const profit = net - cost;
  return { profit, roi: cost > 0 ? profit / cost : 0 };
}

export function perSeller(p: Product): number | null {
  if (p.soldMonthly === null) return null;
  const sellers = p.offersFba + p.offersFbm;
  return sellers === 0 ? p.soldMonthly : Math.round(p.soldMonthly / sellers);
}

export type Tone = "good" | "warn" | "bad" | "neutral";

export type Verdict = { tone: Tone; headline: string; detail: string };

const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const pctOf = (n: number) => `${Math.round(n * 100)}%`;

export function verdictFor(p: Product, cost: number | null): Verdict {
  if (cost === null || !(cost > 0)) {
    const mc = maxCost(p);
    if (mc <= 0) return { tone: "bad", headline: "No room", detail: "Fees eat the price at this ROI floor" };
    return { tone: "neutral", headline: `Buy up to ${money(mc)}`, detail: `${pctOf(SETTINGS.minRoi)} ROI floor, ${money(SETTINGS.minProfit)} min profit` };
  }
  const { profit, roi } = evaluate(p, cost);
  if (roi >= SETTINGS.minRoi && profit >= SETTINGS.minProfit) {
    return { tone: "good", headline: "Buy", detail: `${pctOf(roi)} ROI, ${money(profit)} a unit` };
  }
  if (profit <= 0) return { tone: "bad", headline: "Skip", detail: `Loses ${money(-profit)} a unit` };
  return { tone: "bad", headline: "Skip", detail: `${pctOf(roi)} ROI, floor is ${pctOf(SETTINGS.minRoi)}` };
}

// Things the number cannot say. Shown as chips under the verdict, never
// hidden inside a tooltip, because each one has cost someone real money.
export function caveats(p: Product): { tone: Tone; text: string }[] {
  const out: { tone: Tone; text: string }[] = [];
  const read = priceRead(p);
  if (read.kind === "spike") out.push({ tone: "warn", text: `Today is ${read.pct}% over the average: computed on the average` });
  if (p.eligibility.status === "gated") out.push({ tone: "warn", text: `Gated: ${p.eligibility.reason}` });
  if (p.eligibility.status === "unknown") out.push({ tone: "warn", text: "Eligibility unknown for this account" });
  if (p.amazonOnListing) out.push({ tone: "warn", text: "Amazon sells this listing" });
  if (p.offersFba === 0 && p.offersFbm > 0) out.push({ tone: "good", text: "0 FBA offers: nobody has Prime here" });
  if (p.consumable && p.rating < 3) out.push({ tone: "bad", text: `${p.rating} stars on a consumable: returns` });
  if (p.hazmat) out.push({ tone: "warn", text: "Hazmat: needs approved prep" });
  if (p.soldMonthly === null) out.push({ tone: "warn", text: "Under 50 sold a month: velocity unknown" });
  return out;
}

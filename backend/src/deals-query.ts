// Copied from deals-engine/packages/core/src/search/query.ts so the sandbox
// reads a query exactly the way the real API does. Keep in sync by copying,
// not by editing here.

export interface ParsedQuery {
  /** Free-text terms for full-text and vector search; empty when the query was all filters. */
  terms: string;
  minPercent: number | null;
  minAmount: number | null;
  hasCode: boolean;
  freeShipping: boolean;
  /** Lower bound for received_at, derived from "this week", "last 30 days"... */
  since: Date | null;
}

const DAY = 86_400_000;

/**
 * Rule-based reading of what people type into the box. "50% off last 30 days" is a filter, not
 * a semantic query, and it should hit SQL indexes. Whatever is left becomes search terms.
 */
export function parseSearchQuery(raw: string, now: Date = new Date()): ParsedQuery {
  let q = ` ${raw.trim().toLowerCase()} `;
  const out: ParsedQuery = {
    terms: "",
    minPercent: null,
    minAmount: null,
    hasCode: false,
    freeShipping: false,
    since: null,
  };

  q = q.replace(/\b(\d{1,2})\s?%\s?(?:off|discount)?\b/g, (_, n: string) => {
    out.minPercent = Math.max(out.minPercent ?? 0, Number(n));
    return " ";
  });
  q = q.replace(/\$\s?(\d{1,4})\s?off\b/g, (_, n: string) => {
    out.minAmount = Math.max(out.minAmount ?? 0, Number(n));
    return " ";
  });
  q = q.replace(/\bfree\s+shipping\b/g, () => {
    out.freeShipping = true;
    return " ";
  });
  q = q.replace(/\b(?:promo\s|coupon\s|discount\s)?codes?\b|\bcoupons?\b/g, () => {
    out.hasCode = true;
    return " ";
  });

  const sinceRules: [RegExp, (m: RegExpMatchArray) => number][] = [
    [/\b(?:in the\s)?(?:last|past)\s+(\d{1,3})\s+days?\b/, (m) => Number(m[1]) * DAY],
    [/\b(?:in the\s)?(?:last|past)\s+(\d{1,2})\s+weeks?\b/, (m) => Number(m[1]) * 7 * DAY],
    [/\b(?:in the\s)?(?:last|past)\s+week\b/, () => 7 * DAY],
    [/\b(?:in the\s)?(?:last|past)\s+month\b/, () => 30 * DAY],
    [/\bthis\s+week\b/, () => 7 * DAY],
    [/\bthis\s+month\b/, () => 30 * DAY],
    [/\btoday\b/, () => DAY],
    [/\byesterday\b/, () => 2 * DAY],
    [/\brecent(?:ly)?\b/, () => 14 * DAY],
  ];
  for (const [re, ms] of sinceRules) {
    const m = q.match(re);
    if (m) {
      out.since = new Date(now.getTime() - ms(m));
      q = q.replace(re, " ");
    }
  }

  q = q.replace(
    /\b(?:stores?|brands?|shops?|retailers?|deals?|sales?|running|offering|with|has|have|off|on|the|a|an|at|from|for|and|of|that|are|is|in)\b/g,
    " ",
  );
  out.terms = q
    .replace(/[^a-z0-9' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return out;
}

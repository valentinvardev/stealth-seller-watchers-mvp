import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { t } from "./t";
import {
  BY_CATEGORY_SEED,
  FROM_STEALTH_SEED,
  ONBOARDING_CATEGORIES,
  deals,
  stem,
  tokens,
  type Brand,
  type Email,
  type Offer,
  type SuggestionSeed,
} from "./deals-seed";
import { parseSearchQuery } from "./deals-query";

// deals.* answers the same procedure names, inputs and row shapes as
// deals-engine/apps/api (routers/brands.ts, routers/emails.ts,
// routers/search.ts + services/search.ts), over the in-memory seed instead of
// Postgres. The SQL there is reproduced as filters and sorts here; the search
// log insert is the one thing dropped, since nothing reads it in the sandbox.

const DAY = 86_400_000;

const brandById = (id: string) => deals.brands.find((brand) => brand.id === id);
const offersByEmail = (ids: string[]) => {
  const wanted = new Set(ids);
  const byEmail = new Map<string, Offer[]>();
  for (const offer of deals.offers) {
    if (!wanted.has(offer.emailId)) continue;
    byEmail.set(offer.emailId, [...(byEmail.get(offer.emailId) ?? []), offer]);
  }
  return byEmail;
};
const promoEmails = () => deals.emails.filter((email) => email.kind === "promo");
const byNewest = (a: Email, b: Email) => b.receivedAt.getTime() - a.receivedAt.getTime() || (b.id > a.id ? 1 : -1);

// --- brands ----------------------------------------------------------------------

const brandsRouter = t.router({
  list: t.procedure
    .input(z.object({ q: z.string().trim().max(80).optional(), limit: z.number().int().min(1).max(200).default(50) }).default({}))
    .query(({ input }) => {
      const needle = input.q?.toLowerCase();
      return deals.brands
        .filter((brand) => !needle || brand.name.toLowerCase().includes(needle))
        // DESC NULLS LAST: brands that never emailed belong at the bottom
        .sort((a, b) => {
          const at = a.lastEmailAt?.getTime();
          const bt = b.lastEmailAt?.getTime();
          if (at == null && bt == null) return a.name.localeCompare(b.name);
          if (at == null) return 1;
          if (bt == null) return -1;
          return bt - at || a.name.localeCompare(b.name);
        })
        .slice(0, input.limit);
    }),

  bySlug: t.procedure.input(z.object({ slug: z.string().min(1).max(64) })).query(({ input }) => {
    const brand = deals.brands.find((row) => row.slug === input.slug);
    if (!brand) return null;

    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * DAY);
    const recent = promoEmails()
      .filter((email) => email.brandId === brand.id)
      .sort(byNewest)
      .slice(0, 50);
    const byEmail = offersByEmail(recent.map((email) => email.id));

    const activeCodes = deals.offers
      .filter(
        (offer) =>
          offer.brandId === brand.id &&
          offer.code !== null &&
          (offer.expiresAt === null || offer.expiresAt >= now) &&
          offer.extractedAt >= since30,
      )
      .sort((a, b) => b.extractedAt.getTime() - a.extractedAt.getTime())
      .slice(0, 20)
      .map((offer) => ({ code: offer.code, kind: offer.kind, value: offer.value, expiresAt: offer.expiresAt, emailId: offer.emailId }));

    const window = recent.filter((email) => email.receivedAt >= since30);
    const windowIds = new Set(window.map((email) => email.id));
    let bestPercent30d: number | null = null;
    for (const offer of deals.offers) {
      if (!windowIds.has(offer.emailId) || offer.kind !== "percent" || offer.value === null) continue;
      bestPercent30d = Math.max(bestPercent30d ?? 0, Number(offer.value));
    }

    return {
      brand,
      emails: recent.map((email) => ({ ...email, offers: byEmail.get(email.id) ?? [] })),
      activeCodes,
      stats: { emails30d: window.length, bestPercent30d },
    };
  }),
});

// --- emails ----------------------------------------------------------------------

const emailsRouter = t.router({
  list: t.procedure
    .input(
      z
        .object({
          brandSlug: z.string().max(64).optional(),
          limit: z.number().int().min(1).max(100).default(30),
          cursor: z.object({ receivedAt: z.date(), id: z.string().uuid() }).optional(),
        })
        .default({}),
    )
    .query(({ input }) => {
      const brand = input.brandSlug ? deals.brands.find((row) => row.slug === input.brandSlug) : null;
      const cursor = input.cursor;
      const rows = promoEmails()
        .filter((email) => !input.brandSlug || email.brandId === brand?.id)
        .filter(
          (email) =>
            !cursor ||
            email.receivedAt < cursor.receivedAt ||
            (email.receivedAt.getTime() === cursor.receivedAt.getTime() && email.id < cursor.id),
        )
        .sort(byNewest)
        .slice(0, input.limit + 1);

      const page = rows.slice(0, input.limit);
      const byEmail = offersByEmail(page.map((email) => email.id));
      const last = page[page.length - 1];
      return {
        items: page.map((email) => ({ ...email, brand: brandById(email.brandId) as Brand, offers: byEmail.get(email.id) ?? [] })),
        nextCursor: rows.length > input.limit && last ? { receivedAt: last.receivedAt, id: last.id } : null,
      };
    }),

  get: t.procedure.input(z.object({ id: z.string().uuid() })).query(({ input }) => {
    const email = deals.emails.find((row) => row.id === input.id);
    if (!email) return null;
    const brand = brandById(email.brandId) as Brand;
    const offers = deals.offers.filter((offer) => offer.emailId === email.id);
    return { ...email, brand, offers, htmlUrl: email.htmlKey ? `/emails/${email.id}/html` : null };
  }),

  stats: t.procedure.query(() => {
    const promo = promoEmails();
    const latest = deals.emails.reduce<Date | null>(
      (max, email) => (max === null || email.receivedAt > max ? email.receivedAt : max),
      null,
    );
    return {
      emails: promo.length,
      withOffer: deals.emails.filter((email) => email.hasOffer).length,
      brands: new Set(deals.emails.map((email) => email.brandId)).size,
      latest,
    };
  }),
});

// --- search ----------------------------------------------------------------------

export interface EmailHit {
  email: Email;
  brand: Brand;
  offers: Offer[];
  rank: number;
}

export interface BrandHit {
  brand: Brand;
  /** Best email for this brand under the current filters. */
  email: Email;
  bestOffer: Offer | null;
  matches: number;
}

function bestOfferOf(list: Offer[]): Offer | null {
  const percent = list.filter((o) => o.kind === "percent").sort((a, b) => Number(b.value) - Number(a.value))[0];
  if (percent) return percent;
  const amount = list.filter((o) => o.kind === "amount").sort((a, b) => Number(b.value) - Number(a.value))[0];
  return amount ?? list[0] ?? null;
}

// stand-in for `tsv @@ websearch_to_tsquery('english', terms)` + ts_rank_cd:
// every stemmed query word has to prefix-match a stemmed document word; the
// rank is how many did, weighted toward the subject
function textMatch(email: Email, terms: string[]): number {
  if (terms.length === 0) return 0;
  const subjectWords = tokens(email.subject).map(stem);
  const bodyWords = tokens(`${email.preheader ?? ""} ${email.text}`).map(stem);
  let rank = 0;
  for (const term of terms) {
    const inSubject = subjectWords.some((word) => word.startsWith(term));
    const inBody = inSubject || bodyWords.some((word) => word.startsWith(term));
    if (!inBody) return 0;
    rank += inSubject ? 2 : 1;
  }
  return rank / (terms.length * 2);
}

function searchEmails(input: {
  q: string;
  brandSlug: string | null;
  minPercent: number | null;
  minAmount: number | null;
  hasCode: boolean;
  freeShipping: boolean;
  since: Date | null;
  limit: number;
}): { hits: EmailHit[]; terms: string } {
  const parsed = parseSearchQuery(input.q);
  const terms = parsed.terms;
  const minPercent = input.minPercent ?? parsed.minPercent;
  const minAmount = input.minAmount ?? parsed.minAmount;
  const hasCode = input.hasCode || parsed.hasCode;
  const freeShipping = input.freeShipping || parsed.freeShipping;
  const since = input.since ?? parsed.since;
  const limit = Math.min(input.limit, 200);
  const termWords = tokens(terms).map(stem);

  const offerConditions: ((offer: Offer) => boolean)[] = [];
  if (minPercent !== null && minPercent !== undefined) offerConditions.push((o) => o.kind === "percent" && Number(o.value) >= minPercent);
  if (minAmount !== null && minAmount !== undefined) offerConditions.push((o) => o.kind === "amount" && Number(o.value) >= minAmount);
  if (hasCode) offerConditions.push((o) => o.code !== null);
  if (freeShipping) offerConditions.push((o) => o.kind === "free_shipping");

  const candidates = promoEmails();
  const byEmail = offersByEmail(candidates.map((email) => email.id));
  const scored: EmailHit[] = [];
  for (const email of candidates) {
    const brand = brandById(email.brandId) as Brand;
    if (since && email.receivedAt < since) continue;
    if (input.brandSlug && brand.slug !== input.brandSlug) continue;
    const offers = byEmail.get(email.id) ?? [];
    if (!offerConditions.every((condition) => offers.some(condition))) continue;
    let rank = 0;
    if (termWords.length > 0) {
      rank = textMatch(email, termWords);
      const brandMatch = brand.name.toLowerCase().includes(terms);
      if (rank === 0 && !brandMatch) continue;
      if (brandMatch) rank = Math.max(rank, 0.5);
    }
    scored.push({ email, brand, offers, rank });
  }

  scored.sort((a, b) => (termWords.length > 0 && b.rank !== a.rank ? b.rank - a.rank : byNewest(a.email, b.email)));
  return { hits: scored.slice(0, limit), terms };
}

/** "Stores running 50% off": one row per brand, best matching email on top. */
function groupByBrand(hits: EmailHit[]): BrandHit[] {
  const groups = new Map<string, EmailHit[]>();
  for (const hit of hits) groups.set(hit.brand.id, [...(groups.get(hit.brand.id) ?? []), hit]);

  const out: BrandHit[] = [];
  for (const list of groups.values()) {
    const scored = list
      .map((hit) => ({ hit, best: bestOfferOf(hit.offers) }))
      .sort((a, b) => {
        const av = a.best?.kind === "percent" || a.best?.kind === "amount" ? Number(a.best.value) : -1;
        const bv = b.best?.kind === "percent" || b.best?.kind === "amount" ? Number(b.best.value) : -1;
        if (bv !== av) return bv - av;
        return b.hit.email.receivedAt.getTime() - a.hit.email.receivedAt.getTime();
      });
    const top = scored[0];
    out.push({ brand: top.hit.brand, email: top.hit.email, bestOffer: top.best, matches: list.length });
  }
  return out.sort((a, b) => {
    const av = a.bestOffer?.kind === "percent" ? Number(a.bestOffer.value) : -1;
    const bv = b.bestOffer?.kind === "percent" ? Number(b.bestOffer.value) : -1;
    if (bv !== av) return bv - av;
    return b.email.receivedAt.getTime() - a.email.receivedAt.getTime();
  });
}

const searchInput = z.object({
  q: z.string().trim().max(200).default(""),
  brandSlug: z.string().max(64).nullish(),
  minPercent: z.number().int().min(1).max(99).nullish(),
  minAmount: z.number().min(1).nullish(),
  hasCode: z.boolean().optional(),
  freeShipping: z.boolean().optional(),
  since: z.date().nullish(),
  groupBy: z.enum(["email", "brand"]).default("email"),
  limit: z.number().int().min(1).max(200).default(50),
});

const searchRouter = t.router({
  query: t.procedure.input(searchInput).query(({ input }) => {
    const { hits, terms } = searchEmails({
      q: input.q,
      brandSlug: input.brandSlug ?? null,
      minPercent: input.minPercent ?? null,
      minAmount: input.minAmount ?? null,
      hasCode: input.hasCode ?? false,
      freeShipping: input.freeShipping ?? false,
      since: input.since ?? null,
      limit: input.groupBy === "brand" ? 200 : input.limit,
    });
    if (input.groupBy === "brand") return { mode: "brand" as const, terms, brands: groupByBrand(hits).slice(0, input.limit) };
    return { mode: "email" as const, terms, emails: hits };
  }),
});

// --- onboarding ------------------------------------------------------------------

// The strip on a store card: the last three promo emails, each reduced to
// the number a seller scans for, the code if one is printed, the deadline.
const THUMB_RANK: Record<Offer["kind"], number> = { percent: 0, amount: 1, gift_card: 2, bogo: 3, free_shipping: 4, clearance: 5, other: 6 };

function thumbHeadline(offer: Offer | undefined): string {
  if (!offer) return "Sale";
  const n = offer.value === null ? null : Number(offer.value);
  switch (offer.kind) {
    case "percent":
      return n === null ? "% off" : `${n}%`;
    case "amount":
    case "gift_card":
      return n === null ? "$ off" : Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
    case "bogo":
      return "BOGO";
    case "free_shipping":
      return "Free ship";
    default:
      return "Sale";
  }
}

function thumbsFor(brand: Brand) {
  const recent = promoEmails()
    .filter((email) => email.brandId === brand.id)
    .sort(byNewest)
    .slice(0, 3);
  const byEmail = offersByEmail(recent.map((email) => email.id));
  return recent.map((email) => {
    const offers = [...(byEmail.get(email.id) ?? [])].sort(
      (a, b) => THUMB_RANK[a.kind] - THUMB_RANK[b.kind] || Number(b.value ?? 0) - Number(a.value ?? 0),
    );
    const lead = offers[0];
    return {
      emailId: email.id,
      headline: thumbHeadline(lead),
      code: offers.find((offer) => offer.code)?.code ?? null,
      expiresAt: lead?.expiresAt ?? null,
    };
  });
}

// one suggestion row: the seeded story (reason, the three numbers) on top of
// the brand's real rows (slug, domain, last email, the thumbs) and the live
// follow state, so a toggle shows up on the next read
function suggestionFrom(seed: SuggestionSeed) {
  const brand = deals.brands.find((row) => row.name === seed.brand);
  if (!brand) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `onboarding seed names unknown brand ${seed.brand}` });
  return {
    slug: brand.slug,
    name: brand.name,
    domain: brand.domain,
    category: brand.category,
    reason: seed.reason,
    following: deals.follows.has(brand.slug),
    codesLive: seed.codesLive,
    bestPercent30d: seed.bestPercent30d,
    emails30d: seed.emails30d,
    headline: seed.headline,
    note: seed.note,
    lastEmailAt: seed.lastEmailAtOverride ?? brand.lastEmailAt,
    followerCount: brand.followerCount,
    thumbs: thumbsFor(brand),
  };
}

const onboardingRouter = t.router({
  suggestions: t.procedure.query(() => ({
    fromStealth: FROM_STEALTH_SEED.map(suggestionFrom),
    byCategory: ONBOARDING_CATEGORIES.map((category) => ({
      category: category.id,
      brands: BY_CATEGORY_SEED.filter((seed) => seed.categories.includes(category.id)).map(suggestionFrom),
    })),
    categories: ONBOARDING_CATEGORIES.map((category) => ({ ...category })),
  })),
});

// --- follows ---------------------------------------------------------------------

const followsRouter = t.router({
  list: t.procedure.query(() => Array.from(deals.follows)),

  set: t.procedure
    .input(z.object({ slug: z.string().min(1).max(64), following: z.boolean() }))
    .mutation(({ input }) => {
      const brand = deals.brands.find((row) => row.slug === input.slug);
      if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "That store is not on the list." });
      const was = deals.follows.has(brand.slug);
      if (input.following && !was) {
        deals.follows.add(brand.slug);
        brand.followerCount += 1;
      } else if (!input.following && was) {
        deals.follows.delete(brand.slug);
        brand.followerCount = Math.max(0, brand.followerCount - 1);
      }
      return { slug: brand.slug, following: input.following, followerCount: brand.followerCount };
    }),
});

export const dealsRouter = t.router({
  brands: brandsRouter,
  emails: emailsRouter,
  search: searchRouter,
  onboarding: onboardingRouter,
  follows: followsRouter,
});

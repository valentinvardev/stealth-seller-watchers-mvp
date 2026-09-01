import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { t } from "./t";
import {
  YoutubeError,
  isYoutubeKeyConfigured,
  listChannels,
  listVideos,
  parseIsoDuration,
  pickThumbnail,
  searchVideos,
  toCount,
} from "./integrations/youtube";
import {
  SEED_QUERIES,
  SEED_SNAPSHOT,
  SEED_SUPPRESSED_CHANNELS,
  SEED_TRIAGE,
  type TriageType,
} from "./mentions-seed";

// YouTube mentions radar: which videos talk about Stealth Seller, discovered
// by search, refreshed by videos.list, triaged by a human. Shapes below are
// the contract the frontend is built against; every timestamp is an ISO
// string so a raw-fetch client can read it without superjson revival.

export type TriageStatus = "new" | "confirmed" | "review" | "dismissed";
export type Scope = "seed" | "session";

export type MentionVideo = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  durationSeconds: number;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  views: number;
  likes: number | null;
  comments: number | null;
  brandIn: { title: boolean; description: boolean; tags: boolean; link: boolean };
  matchedQueries: string[];
  firstSeenAt: string;
  removed: boolean;
  // Counts as they were in the committed seed, so a first visit can show a true
  // "since Sep 1" delta before the device has a baseline of its own.
  baseline: { at: string; views: number; comments: number | null } | null;
  triage: {
    status: TriageStatus;
    type: TriageType | null;
    at: string | null;
    scope: Scope | null;
    note: string | null;
  };
};

export type MentionChannel = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  subscribers: number | null;
  videoCount: number | null;
  suppressed: boolean;
  suppressedScope: Scope | null;
  suppressedNote: string | null;
};

export type MentionsOverview = {
  source: "live" | "snapshot";
  keyConfigured: boolean;
  fetchedAt: string;
  discovery: {
    lastSweepAt: string | null;
    nextSweepDueAt: string | null;
    ttlMs: number;
    queries: { q: string; lastRunAt: string | null; lastReturned: number | null }[];
  };
  budget: { searchCallsUsed: number; searchCallsCap: number; scope: "instance"; windowKey: string };
  lastError: { at: string; message: string } | null;
  videos: MentionVideo[];
  channels: MentionChannel[];
};

export const DISCOVERY_TTL_MS = 6 * 60 * 60 * 1000;
export const STATS_TTL_MS = 30 * 60 * 1000;
export const CHANNELS_TTL_MS = 6 * 60 * 60 * 1000;
export const SWEEP_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

// search.list costs 100 of the project's 10,000 daily units, so the real cap
// is 100 searches a day shared by every warm Vercel instance. 18 per instance
// is 3 sweeps of the 6 queries: a handful of instances can each sweep a few
// times without one of them eating the whole day.
export const SEARCH_CALLS_CAP = 18;

type StoredVideo = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  durationSeconds: number;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  views: number;
  likes: number | null;
  comments: number | null;
  matchedQueries: string[];
  firstSeenAt: string;
  removed: boolean;
};

type StoredChannel = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  subscribers: number | null;
  videoCount: number | null;
};

type TriageEntry = {
  status: "confirmed" | "review" | "dismissed";
  type: TriageType | null;
  at: string;
  scope: Scope;
  note: string | null;
};

type SuppressedEntry = { at: string; scope: Scope; note: string | null };

// In-memory and per instance, same stance as db.ts: several Vercel instances
// stay warm at once and each carries its own copy. The seed below is literal
// so every instance starts from the identical picture; only what a session
// does on top (triage, suppress, live refresh) can differ between them.
const store = {
  videos: new Map<string, StoredVideo>(),
  channels: new Map<string, StoredChannel>(),
  triage: new Map<string, TriageEntry>(),
  suppressed: new Map<string, SuppressedEntry>(),
  stamps: {
    statsFetchedAt: null as string | null,
    channelsFetchedAt: null as string | null,
    lastSweepAt: null as string | null,
    queries: new Map<string, { lastRunAt: string | null; lastReturned: number | null }>(),
  },
  budget: { windowKey: "", searchCallsUsed: 0 },
  lastError: null as { at: string; message: string } | null,
  liveEverSucceeded: false,
  seeded: false,
};

function ensureSeeded() {
  if (store.seeded) return;
  store.seeded = true;
  const at = SEED_SNAPSHOT.fetchedAt;
  for (const video of SEED_SNAPSHOT.videos) {
    store.videos.set(video.id, { ...video, tags: [...video.tags], matchedQueries: [...video.matchedQueries], firstSeenAt: at, removed: false });
  }
  for (const channel of SEED_SNAPSHOT.channels) store.channels.set(channel.id, { ...channel });
  for (const [videoId, entry] of Object.entries(SEED_TRIAGE)) {
    store.triage.set(videoId, { status: entry.status, type: entry.type, at, scope: "seed", note: entry.note });
  }
  for (const [channelId, entry] of Object.entries(SEED_SUPPRESSED_CHANNELS)) {
    store.suppressed.set(channelId, { at, scope: "seed", note: entry.note });
  }
  for (const q of SEED_QUERIES) store.stamps.queries.set(q, { lastRunAt: null, lastReturned: null });
}

// ---- pure helpers -----------------------------------------------------------

const BRAND_RE = /stealth\s*seller|stealthseller/i;
const LINK_RE = /stealthseller\.co/i;

export function brandIn(video: { title: string; description: string; tags: string[] }): MentionVideo["brandIn"] {
  return {
    title: BRAND_RE.test(video.title),
    description: BRAND_RE.test(video.description),
    tags: video.tags.some((tag) => BRAND_RE.test(tag)),
    link: LINK_RE.test(video.description),
  };
}

export function isDue(lastAt: string | null, ttlMs: number, now: Date): boolean {
  if (!lastAt) return true;
  return now.getTime() - new Date(lastAt).getTime() >= ttlMs;
}

export function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function nextUtcDayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

export function sweepFitsBudget(searchCallsUsed: number): boolean {
  return searchCallsUsed + SEED_QUERIES.length <= SEARCH_CALLS_CAP;
}

function addUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value);
}

// ---- budget ----------------------------------------------------------------

function budgetFor(now: Date) {
  const windowKey = utcDayKey(now);
  if (store.budget.windowKey !== windowKey) {
    store.budget = { windowKey, searchCallsUsed: 0 };
  }
  return store.budget;
}

function recordError(now: Date, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  store.lastError = { at: now.toISOString(), message };
}

// ---- live refresh ----------------------------------------------------------

async function runSweep(now: Date) {
  const budget = budgetFor(now);
  const publishedAfter = store.stamps.lastSweepAt
    ? new Date(new Date(store.stamps.lastSweepAt).getTime() - SWEEP_LOOKBACK_MS).toISOString()
    : undefined;
  let discovered = 0;

  for (const q of SEED_QUERIES) {
    let result: Awaited<ReturnType<typeof searchVideos>>;
    try {
      result = await searchVideos(q, { maxResults: 50, publishedAfter });
    } catch (error) {
      if (error instanceof YoutubeError && error.responseArrived) budget.searchCallsUsed += 1;
      // Google says the shared daily cap is gone, so no instance-level budget
      // is left to spend either; retrying before the UTC day rolls is noise.
      if (error instanceof YoutubeError && error.kind === "quota") budget.searchCallsUsed = SEARCH_CALLS_CAP;
      throw error;
    }
    budget.searchCallsUsed += 1;
    store.stamps.queries.set(q, { lastRunAt: now.toISOString(), lastReturned: result.videoIds.length });

    for (const item of result.items) {
      const id = item.id.videoId;
      if (!id) continue;
      const known = store.videos.get(id);
      if (known) {
        addUnique(known.matchedQueries, q);
        continue;
      }
      discovered += 1;
      store.videos.set(id, {
        id,
        title: item.snippet.title,
        description: item.snippet.description ?? "",
        tags: [],
        publishedAt: item.snippet.publishedAt,
        durationSeconds: 0,
        thumbnailUrl: pickThumbnail(item.snippet.thumbnails) ?? "",
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        views: 0,
        likes: null,
        comments: null,
        matchedQueries: [q],
        firstSeenAt: now.toISOString(),
        removed: false,
      });
    }
  }

  store.stamps.lastSweepAt = now.toISOString();
  store.liveEverSucceeded = true;
  return discovered;
}

async function refreshVideoStats(now: Date) {
  const ids = Array.from(store.videos.keys());
  if (ids.length === 0) return;
  const items = await listVideos(ids);
  const seen = new Set<string>();
  for (const item of items) {
    seen.add(item.id);
    const stored = store.videos.get(item.id);
    if (!stored) continue;
    stored.title = item.snippet.title;
    stored.description = item.snippet.description ?? "";
    stored.tags = item.snippet.tags ?? [];
    stored.publishedAt = item.snippet.publishedAt;
    stored.durationSeconds = parseIsoDuration(item.contentDetails?.duration);
    stored.thumbnailUrl = pickThumbnail(item.snippet.thumbnails) ?? stored.thumbnailUrl;
    stored.channelId = item.snippet.channelId;
    stored.channelTitle = item.snippet.channelTitle;
    stored.views = toCount(item.statistics?.viewCount) ?? 0;
    stored.likes = toCount(item.statistics?.likeCount);
    stored.comments = toCount(item.statistics?.commentCount);
    stored.removed = false;
  }
  // Deleted or private videos drop out of the response; keep the last copy
  // and flag it rather than losing the mention from the record.
  for (const [id, stored] of store.videos) {
    if (!seen.has(id)) stored.removed = true;
  }
  store.stamps.statsFetchedAt = now.toISOString();
  store.liveEverSucceeded = true;
}

function missingChannelIds(): string[] {
  const wanted = new Set<string>();
  for (const video of store.videos.values()) {
    if (!store.channels.has(video.channelId)) wanted.add(video.channelId);
  }
  return Array.from(wanted);
}

async function refreshChannels(now: Date) {
  const ids = new Set<string>(store.channels.keys());
  for (const video of store.videos.values()) ids.add(video.channelId);
  if (ids.size === 0) return;
  const items = await listChannels(Array.from(ids));
  for (const item of items) {
    const stats = item.statistics;
    store.channels.set(item.id, {
      id: item.id,
      title: item.snippet.title,
      thumbnailUrl: pickThumbnail(item.snippet.thumbnails),
      subscribers: stats?.hiddenSubscriberCount ? null : toCount(stats?.subscriberCount),
      videoCount: toCount(stats?.videoCount),
    });
  }
  store.stamps.channelsFetchedAt = now.toISOString();
  store.liveEverSucceeded = true;
}

type RefreshPlan = { sweep: boolean; stats: boolean; channels: boolean };

// One refresh at a time per instance: the frontend batches queries and a page
// load can hit overview twice in the same tick, which would otherwise double
// count the sweep against the budget.
let inflight: Promise<void> | null = null;

async function runRefresh(plan: RefreshPlan, now: Date) {
  if (inflight) {
    await inflight;
    return;
  }
  inflight = (async () => {
    let discovered = 0;
    try {
      if (plan.sweep) discovered = await runSweep(now);
      const statsDue = plan.stats || discovered > 0 || isDue(store.stamps.statsFetchedAt, STATS_TTL_MS, now);
      if (statsDue) await refreshVideoStats(now);
      const channelsDue =
        plan.channels || missingChannelIds().length > 0 || isDue(store.stamps.channelsFetchedAt, CHANNELS_TTL_MS, now);
      if (channelsDue) await refreshChannels(now);
      store.lastError = null;
    } catch (error) {
      // Live failures degrade to whatever the stores hold; only a programmer
      // error is allowed out. YoutubeError covers quota, key and HTTP shapes,
      // a TypeError from fetch covers the network.
      if (error instanceof YoutubeError || error instanceof TypeError) {
        recordError(now, error);
        return;
      }
      throw error;
    }
  })();
  try {
    await inflight;
  } finally {
    inflight = null;
  }
}

// ---- projection ------------------------------------------------------------

const SEED_BASELINE = new Map(
  SEED_SNAPSHOT.videos.map((video) => [
    video.id,
    { at: SEED_SNAPSHOT.fetchedAt, views: video.views, comments: video.comments },
  ]),
);

function projectVideo(video: StoredVideo): MentionVideo {
  const triage = store.triage.get(video.id);
  return {
    baseline: SEED_BASELINE.get(video.id) ?? null,
    id: video.id,
    title: video.title,
    description: video.description,
    tags: [...video.tags],
    publishedAt: video.publishedAt,
    durationSeconds: video.durationSeconds,
    thumbnailUrl: video.thumbnailUrl,
    channelId: video.channelId,
    channelTitle: video.channelTitle,
    views: video.views,
    likes: video.likes,
    comments: video.comments,
    brandIn: brandIn(video),
    matchedQueries: [...video.matchedQueries],
    firstSeenAt: video.firstSeenAt,
    removed: video.removed,
    triage: triage
      ? { status: triage.status, type: triage.type, at: triage.at, scope: triage.scope, note: triage.note }
      : { status: "new", type: null, at: null, scope: null, note: null },
  };
}

function projectChannel(channel: StoredChannel): MentionChannel {
  const suppressed = store.suppressed.get(channel.id);
  return {
    id: channel.id,
    title: channel.title,
    thumbnailUrl: channel.thumbnailUrl,
    subscribers: channel.subscribers,
    videoCount: channel.videoCount,
    suppressed: !!suppressed,
    suppressedScope: suppressed?.scope ?? null,
    suppressedNote: suppressed?.note ?? null,
  };
}

function buildOverview(now: Date): MentionsOverview {
  ensureSeeded();
  const keyConfigured = isYoutubeKeyConfigured();
  const budget = budgetFor(now);
  const lastSweepAt = store.stamps.lastSweepAt;

  let nextSweepDueAt: string | null = null;
  if (keyConfigured) {
    if (!sweepFitsBudget(budget.searchCallsUsed)) nextSweepDueAt = nextUtcDayStart(now).toISOString();
    else if (lastSweepAt) nextSweepDueAt = new Date(new Date(lastSweepAt).getTime() + DISCOVERY_TTL_MS).toISOString();
  }

  const videos = Array.from(store.videos.values())
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id))
    .map(projectVideo);
  const channels = Array.from(store.channels.values())
    .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id))
    .map(projectChannel);

  return {
    source: store.liveEverSucceeded ? "live" : "snapshot",
    keyConfigured,
    fetchedAt: store.stamps.statsFetchedAt ?? SEED_SNAPSHOT.fetchedAt,
    discovery: {
      lastSweepAt,
      nextSweepDueAt,
      ttlMs: DISCOVERY_TTL_MS,
      queries: SEED_QUERIES.map((q) => {
        const stamp = store.stamps.queries.get(q);
        return { q, lastRunAt: stamp?.lastRunAt ?? null, lastReturned: stamp?.lastReturned ?? null };
      }),
    },
    budget: {
      searchCallsUsed: budget.searchCallsUsed,
      searchCallsCap: SEARCH_CALLS_CAP,
      scope: "instance",
      windowKey: budget.windowKey,
    },
    lastError: store.lastError,
    videos,
    channels,
  };
}

function requireKey() {
  if (!isYoutubeKeyConfigured()) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "YOUTUBE_API_KEY is not set" });
  }
}

// ---- router ----------------------------------------------------------------

const TriageTypeSchema = z.enum(["review", "tutorial", "comparison", "mention", "complaint"]);

export const mentionsRouter = t.router({
  overview: t.procedure.query(async (): Promise<MentionsOverview> => {
    ensureSeeded();
    const now = new Date();
    if (isYoutubeKeyConfigured()) {
      const budget = budgetFor(now);
      const sweep = isDue(store.stamps.lastSweepAt, DISCOVERY_TTL_MS, now) && sweepFitsBudget(budget.searchCallsUsed);
      await runRefresh({ sweep, stats: false, channels: false }, now);
    }
    return buildOverview(new Date());
  }),

  triage: t.procedure
    .input(
      z.object({
        videoId: z.string(),
        status: z.enum(["confirmed", "review", "dismissed", "new"]),
        type: TriageTypeSchema.optional(),
      }),
    )
    .mutation(({ input }): MentionsOverview => {
      ensureSeeded();
      if (!store.videos.has(input.videoId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }
      if (input.status === "new") {
        store.triage.delete(input.videoId);
      } else {
        const previous = store.triage.get(input.videoId);
        store.triage.set(input.videoId, {
          status: input.status,
          type: input.type ?? previous?.type ?? null,
          at: new Date().toISOString(),
          scope: "session",
          note: null,
        });
      }
      return buildOverview(new Date());
    }),

  suppressChannel: t.procedure
    .input(z.object({ channelId: z.string(), suppressed: z.boolean() }))
    .mutation(({ input }): MentionsOverview => {
      ensureSeeded();
      if (!store.channels.has(input.channelId)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Channel not found" });
      }
      if (input.suppressed) {
        store.suppressed.set(input.channelId, { at: new Date().toISOString(), scope: "session", note: null });
      } else {
        store.suppressed.delete(input.channelId);
      }
      return buildOverview(new Date());
    }),

  refreshStats: t.procedure.mutation(async (): Promise<MentionsOverview> => {
    ensureSeeded();
    requireKey();
    await runRefresh({ sweep: false, stats: true, channels: true }, new Date());
    return buildOverview(new Date());
  }),

  sweepNow: t.procedure.mutation(async (): Promise<MentionsOverview> => {
    ensureSeeded();
    requireKey();
    const now = new Date();
    if (!sweepFitsBudget(budgetFor(now).searchCallsUsed)) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Search budget for this instance is spent" });
    }
    await runRefresh({ sweep: true, stats: false, channels: false }, now);
    return buildOverview(new Date());
  }),
});

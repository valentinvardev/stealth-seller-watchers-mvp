// YouTube Data API v3 integration for the mentions radar (search, videos,
// channels). Quota is the constraint that shapes everything here: search.list
// costs 100 units per call against a 10,000/day project cap, videos.list and
// channels.list cost 1, so the caller batches ids and budgets searches.

// Read from the environment only, same stance as firecrawl.ts: this repo is
// public, so no literal fallback ever belongs in this file.
export function getYoutubeKey(): string {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY is not set");
  return key;
}

export function isYoutubeKeyConfigured(): boolean {
  return !!process.env.YOUTUBE_API_KEY;
}

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
const ID_CHUNK_SIZE = 50;

export type YoutubeErrorKind = "quota" | "key_invalid" | "http" | "network";

export class YoutubeError extends Error {
  readonly kind: YoutubeErrorKind;
  readonly status: number | null;

  constructor(kind: YoutubeErrorKind, status: number | null, message: string) {
    super(message);
    this.name = "YoutubeError";
    this.kind = kind;
    this.status = status;
  }

  // Google answered at all. A quota 403 is still a search call the project
  // paid for, so the caller counts those; a socket failure it does not.
  get responseArrived(): boolean {
    return this.kind !== "network";
  }
}

export type YoutubeThumbnail = { url: string; width?: number; height?: number };
export type YoutubeThumbnails = Partial<
  Record<"default" | "medium" | "high" | "standard" | "maxres", YoutubeThumbnail>
>;

export type YoutubeSearchItem = {
  id: { kind: string; videoId?: string };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails?: YoutubeThumbnails;
    channelTitle: string;
  };
};

export type YoutubeVideoItem = {
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails?: YoutubeThumbnails;
    channelTitle: string;
    tags?: string[];
  };
  contentDetails?: { duration?: string };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
};

export type YoutubeChannelItem = {
  id: string;
  snippet: { title: string; thumbnails?: YoutubeThumbnails };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean; videoCount?: string };
};

type YoutubeErrorBody = {
  error?: { code?: number; message?: string; errors?: { reason?: string; message?: string }[] };
};

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: YoutubeError };

const QUOTA_REASONS = new Set(["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded"]);

function mapHttpError(status: number, body: YoutubeErrorBody | null): YoutubeError {
  const reason = body?.error?.errors?.[0]?.reason ?? "";
  const message = body?.error?.message ?? "";
  if (status === 403 && QUOTA_REASONS.has(reason)) {
    return new YoutubeError("quota", status, `YOUTUBE_QUOTA_EXCEEDED: ${reason}`);
  }
  if (status === 400 && (reason === "keyInvalid" || /API key not valid/i.test(message))) {
    return new YoutubeError("key_invalid", status, "YOUTUBE_KEY_INVALID");
  }
  const detail = message || reason;
  return new YoutubeError("http", status, `YOUTUBE_HTTP_${status}${detail ? `: ${detail}` : ""}`);
}

// One place builds the URL so the key never ends up in a log line or an error
// message: failures are described by status and Google's reason only.
async function youtubeGet<T>(resource: string, params: Record<string, string>): Promise<ApiResult<T>> {
  const url = new URL(`${YOUTUBE_API_URL}/${resource}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set("key", getYoutubeKey());

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, error: new YoutubeError("network", null, `YOUTUBE_NETWORK: ${detail}`) };
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as YoutubeErrorBody | null;
    return { ok: false, error: mapHttpError(response.status, body) };
  }

  return { ok: true, data: (await response.json()) as T };
}

export async function searchVideos(
  q: string,
  opts: { maxResults?: number; publishedAfter?: string } = {},
): Promise<{ videoIds: string[]; items: YoutubeSearchItem[] }> {
  const params: Record<string, string> = {
    part: "snippet",
    type: "video",
    order: "date",
    maxResults: String(opts.maxResults ?? 50),
    q,
  };
  if (opts.publishedAfter) params.publishedAfter = opts.publishedAfter;

  const result = await youtubeGet<{ items?: YoutubeSearchItem[] }>("search", params);
  if (result.ok === false) throw result.error;

  const items = result.data.items ?? [];
  const videoIds = items
    .map((item) => item.id.videoId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  return { videoIds, items };
}

export async function listVideos(ids: string[]): Promise<YoutubeVideoItem[]> {
  const items: YoutubeVideoItem[] = [];
  for (const batch of chunk(ids, ID_CHUNK_SIZE)) {
    const result = await youtubeGet<{ items?: YoutubeVideoItem[] }>("videos", {
      part: "snippet,statistics,contentDetails",
      id: batch.join(","),
      maxResults: String(ID_CHUNK_SIZE),
    });
    if (result.ok === false) throw result.error;
    items.push(...(result.data.items ?? []));
  }
  return items;
}

export async function listChannels(ids: string[]): Promise<YoutubeChannelItem[]> {
  const items: YoutubeChannelItem[] = [];
  for (const batch of chunk(ids, ID_CHUNK_SIZE)) {
    const result = await youtubeGet<{ items?: YoutubeChannelItem[] }>("channels", {
      part: "snippet,statistics",
      id: batch.join(","),
      maxResults: String(ID_CHUNK_SIZE),
    });
    if (result.ok === false) throw result.error;
    items.push(...(result.data.items ?? []));
  }
  return items;
}

export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

// ISO 8601 duration as YouTube emits it: PT1H46M48S, PT9S, P1DT2H for long
// streams. Anything unparseable is 0 rather than NaN so sorts stay sane.
export function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!match) return 0;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 86400 + Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0)
  );
}

export function pickThumbnail(thumbnails: YoutubeThumbnails | undefined): string | null {
  return thumbnails?.medium?.url ?? thumbnails?.default?.url ?? null;
}

export function toCount(value: string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

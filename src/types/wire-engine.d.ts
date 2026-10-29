declare module '@wire/lib/ingest.mjs' {
  export const DEFAULTS: {
    timeoutMs: number;
    retries: number;
    concurrency: number;
    limit: number;
    recencyDays: number;
  };
  export function ingest(options: {
    config: unknown;
    fetchImpl?: typeof fetch;
    now?: Date | string;
    limit?: number;
    timeoutMs?: number;
    retries?: number;
    concurrency?: number;
    recencyDays?: number;
    fixtures?: Array<{ source: string; publisher?: string; xml: string }>;
    log?: (msg: string) => void;
  }): Promise<{ items: any[]; report: any }>;
  export function ageLabel(publishedAt: string | null, now?: Date): string;
  export function freshness(publishedAt: string | null, now?: Date): number;
  export function score(item: Record<string, unknown>, opts?: { now?: Date }): number;
}

declare module '@wire/lib/alerts.mjs' {
  export const DEFAULTS: {
    timeoutMs: number;
    retries: number;
    concurrency: number;
    limit: number;
    recencyDays: number;
  };
  export function ingest(options: {
    config?: unknown;
    bulletins?: unknown[];
    fetchImpl?: typeof fetch;
    now?: Date | string;
    limit?: number;
    timeoutMs?: number;
    retries?: number;
    concurrency?: number;
    recencyDays?: number;
    fixtures?: Array<{ source: string; publisher?: string; xml: string }>;
    env?: NodeJS.ProcessEnv;
    log?: (msg: string) => void;
  }): Promise<{ items: any[]; report: any }>;
  export function extractPersonFields(
    rawText: string,
    opts?: { title?: string },
  ): {
    alertType: 'marco' | 'missing';
    person: {
      name: string | null;
      gender: string | null;
      age: number | null;
      residence: string | null;
      complexion: string | null;
      build: string | null;
      height: string | null;
    };
    lastSeen: { when: string | null; where: string | null };
    phones: string[];
    contact: string | null;
    photo: string | null;
    photoKind: 'image' | 'page' | null;
  };
  export function healWrappedUrls(input: string): string;
  export function isAlertCandidate(
    raw: { title?: string; summary?: string; publisher?: string; url?: string },
    source?: unknown,
  ): boolean;
  export function validateAlertSubmission(
    input: Record<string, unknown>,
    opts?: { now?: Date | string; trusted?: boolean },
  ): { ok: false; error: string } | { ok: true; bulletin: any; item: any };
}

declare module '@wire/lib/facebook.mjs' {
  export interface FbPost {
    id: string | null;
    url: string;
    text: string;
    imageUrl: string | null;
    publishedAt: Date;
    timeEstimated: boolean;
  }
  export type FbSource =
    | { kind: 'bridge'; pageName: string; url: string }
    | { kind: 'direct'; pageName: string; username: string };
  export interface FbPageRef {
    username: string;
    pageName: string;
  }
  export const KNOWN_FB_PAGES: Record<string, string>;
  export const RBPF_HANDLES: Set<string>;
  export const DEFAULT_FB_PAGE: string;
  export function fbUsernameFromUrl(input: string): string | null;
  export function fbPageName(username: string, env?: NodeJS.ProcessEnv): string;
  export function isPrivateHostname(host: string): boolean;
  export function fbBridgeUrl(
    username: string,
    env?: NodeJS.ProcessEnv,
    adminBridges?: Record<string, string>,
  ): string | null;
  export function fbBridgesFromValue(raw: string): Record<string, string>;
  export function fbBridgesToValue(bridges: Record<string, string>): string;
  export function fbPagesFromValue(raw: string, env?: NodeJS.ProcessEnv): FbPageRef[];
  export function decodeFbText(input: string): string;
  export function escapeXml(input: string): string;
  export function titleForPost(post: FbPost, pageName: string): string;
  export function parseFacebookHtml(html: string, username: string): FbPost[];
  export function parseBridgeFeed(xml: string, username: string): FbPost[];
  export function postsToRssXml(opts: {
    username: string;
    pageName: string;
    posts: FbPost[];
    selfUrl: string;
    sourceNote?: string;
    now?: Date;
  }): string;
  export function fetchFacebookPosts(
    username: string,
    env?: NodeJS.ProcessEnv,
    timeoutMs?: number,
    adminBridges?: Record<string, string>,
    fetchImpl?: typeof fetch,
  ): Promise<{ posts: FbPost[]; source: FbSource; note: string }>;
  export function fetchFacebookRssXml(opts: {
    username: string;
    pageName?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
    adminBridges?: Record<string, string>;
    selfUrl?: string;
    fetchImpl?: typeof fetch;
  }): Promise<{ posts: FbPost[]; source: FbSource; pageName: string; note: string; xml: string }>;
}

declare module '@wire/lib/feed.mjs' {
  export function bridgeToFeed(
    items: any[],
    opts?: { now?: Date; maxAgeHours?: number; maxCards?: number },
  ): { cards: any[]; dropped: Array<{ id: string; title: string }> };
  export function toFeedCard(item: any): any;
  export function isFeedEligible(
    item: any,
    opts?: { now?: Date; maxAgeHours?: number },
  ): boolean;
}

declare module '@wire/lib/merge.mjs' {
  export function mergeFeedItems(
    reports: any[],
    wireCards: any[],
    opts?: {
      window?: number;
      maxWireShare?: number;
      maxPerCategory?: number;
    },
  ): {
    items: any[];
    placed: number;
    placedAlerts: number;
    held: any[];
  };
}

/**
 * The wire engine ships as plain ESM (wire/lib/*.mjs) with JSDoc types and no
 * build step. Declaring the modules keeps `tsc --noEmit` quiet without forcing
 * a compilation target onto the engine itself.
 */
declare module '@wire/lib/ingest.mjs' {
  export function ingest(options?: Record<string, unknown>): Promise<{ items: any[]; report: any }>;
  export function ageLabel(publishedAt: string | null, now?: Date): string;
  export function freshness(publishedAt: string | null, now?: Date): number;
  export function score(item: any, options?: { now?: Date }): number;
}

declare module '@wire/lib/feed.mjs' {
  export function bridgeToFeed(
    items?: any[],
    options?: Record<string, unknown>,
  ): { cards: any[]; dropped: number };
  export function isFeedEligible(item: any, options?: Record<string, unknown>): boolean;
  export function toFeedCard(item: any): any;
}

declare module '@wire/lib/merge.mjs' {
  export function mergeFeedItems(
    reports?: any[],
    wire?: any[],
    options?: Record<string, unknown>,
  ): { items: any[]; placed: number; held: any[] };
}

declare module '@wire/adapters/next-route.mjs' {
  export function createWireHandlers(
    config: unknown,
    options?: Record<string, unknown>,
  ): {
    wireGet: (request?: unknown) => Promise<Response>;
    wireRefresh: (request?: unknown) => Promise<Response>;
    refresh: () => Promise<any>;
    payload: (options?: { force?: boolean }) => Promise<any>;
    store: { get(): any; set(value: any): void; clear(): void };
  };
  export function createStore(): { get(): any; set(value: any): void; clear(): void };
}

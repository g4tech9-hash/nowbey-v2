import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";

import type { KindKey } from "@/lib/life-kinds";

export * from "@/lib/life-kinds";

export type PostRow = typeof posts.$inferSelect & { firstPhotoId: string | null };

/** The post as it is sent to browsers and the mobile app: everything except the account id behind it. */
export function publicPost<T extends { userId?: string | null }>(row: T): Omit<T, "userId"> {
  const copy = { ...row };
  delete copy.userId;
  return copy;
}

type ListOptions = {
  kind?: KindKey | null;
  parish?: string | null;
  sort?: "new" | "loved";
  page?: number;
  perPage?: number;
  includeHidden?: boolean;
  authorId?: string | null;
  placeId?: string | null;
};

// The outer column is written out in full on purpose: Drizzle drops the table name from single-table queries,
// which would make a bare "id" point at the photo instead of the post.
const firstPhoto = sql<string | null>`(select pp.id::text from post_photos pp where pp.post_id = "posts"."id" order by pp.position asc limit 1)`;

/** How many reactions a post has. Written in full for the same reason as firstPhoto above. */
const reactionCount = sql<number>`(select count(*)::int from reactions r where r.post_id = "posts"."id")`;

export async function listPosts(opts: ListOptions = {}) {
  const perPage = Math.min(30, Math.max(1, opts.perPage ?? 12));
  const conds: SQL[] = [];
  if (!opts.includeHidden) conds.push(eq(posts.status, "published"));
  if (opts.kind) conds.push(eq(posts.kind, opts.kind));
  if (opts.parish) conds.push(eq(posts.parish, opts.parish));
  if (opts.authorId) conds.push(eq(posts.userId, opts.authorId));
  if (opts.placeId) conds.push(eq(posts.placeId, opts.placeId));
  const where = conds.length ? and(...conds) : undefined;

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(posts).where(where);
  const pages = Math.max(1, Math.ceil(n / perPage));
  const page = Math.min(pages, Math.max(1, opts.page ?? 1));

  const rows = await db
    .select({ post: posts, firstPhotoId: firstPhoto })
    .from(posts)
    .where(where)
    .orderBy(...(opts.sort === "loved" ? [desc(reactionCount), desc(posts.createdAt)] : [desc(posts.createdAt)]))
    .limit(perPage)
    .offset((page - 1) * perPage);

  return { rows: rows.map((r) => ({ ...r.post, firstPhotoId: r.firstPhotoId }) as PostRow), total: n, page, pages };
}

export type TopPlace = { name: string; parish: string | null; kind: KindKey; n: number; avg: number; score: number };

/**
 * The best-rated places people have written about in the last year. The score leans towards a
 * middling 3.5 until a place has several reviews, so one glowing post does not outrank a place
 * loved by many.
 */
export async function topPlaces(opts: { kind?: KindKey | null; parish?: string | null; limit?: number } = {}): Promise<TopPlace[]> {
  const where: SQL[] = [
    sql`status = 'published'`,
    sql`rating is not null`,
    sql`place_name is not null`,
    sql`created_at > now() - interval '365 days'`,
  ];
  if (opts.kind) where.push(sql`kind = ${opts.kind}`);
  if (opts.parish) where.push(sql`parish = ${opts.parish}`);
  const res = await db.execute(sql`
    select min(place_name) as name, parish, kind, count(*)::int as n,
           round(avg(rating)::numeric, 1)::float as avg,
           ((sum(rating) + 3.5 * 2) / (count(rating) + 2))::float as score
    from (
      -- one review per member per place (their latest), so posting the same five stars again and again cannot inflate a rating
      select distinct on (user_id, lower(btrim(place_name)), kind) user_id, place_name, parish, kind, rating
      from posts
      where ${sql.join(where, sql` and `)}
      order by user_id, lower(btrim(place_name)), kind, created_at desc
    ) latest
    group by lower(btrim(place_name)), kind, parish
    order by score desc, n desc
    limit ${opts.limit ?? 6}`);
  return res.rows as unknown as TopPlace[];
}

export type PlaceEntry = {
  id: string;
  name: string;
  parish: string;
  kind: KindKey;
  address: string | null;
  people: number;
  ratings: number;
  avg: number | null;
  price: number | null;
  score: number;
  photoCount: number;
};

/**
 * Every listed place, including ones nobody has reviewed yet (they show as "Not rated yet"). A member's
 * latest review of a place counts once, so repeat posts cannot inflate its rating. Scores lean towards
 * 3.5 until a place has several ratings.
 */
export async function listPlaces(opts: { kind?: KindKey | null; parish?: string | null; limit?: number } = {}): Promise<PlaceEntry[]> {
  const where: SQL[] = [];
  if (opts.kind) where.push(sql`p.kind = ${opts.kind}`);
  if (opts.parish) where.push(sql`p.parish = ${opts.parish}`);
  const filter = where.length ? sql`where ${sql.join(where, sql` and `)}` : sql``;
  const res = await db.execute(sql`
    with latest as (
      select distinct on (user_id, place_id) user_id, place_id, rating, price_level
      from posts
      where status = 'published' and place_id is not null
      order by user_id, place_id, created_at desc
    )
    select p.id, p.name, p.parish, p.kind, p.address,
           count(l.user_id)::int as people,
           count(l.rating)::int as ratings,
           round(avg(l.rating)::numeric, 1)::float as avg,
           percentile_cont(0.5) within group (order by l.price_level)::float as price,
           ((coalesce(sum(l.rating), 0) + 3.5 * 2) / (count(l.rating) + 2))::float as score,
           (select count(*)::int from place_photos ph where ph.place_id = p.id) as "photoCount"
    from places p
    left join latest l on l.place_id = p.id
    ${filter}
    group by p.id
    order by score desc, people desc, p.name asc
    limit ${Math.min(200, opts.limit ?? 60)}`);
  return res.rows as unknown as PlaceEntry[];
}

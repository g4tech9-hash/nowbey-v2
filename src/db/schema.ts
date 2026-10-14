import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
  id: uuid("id").defaultRandom().primaryKey(),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("resident"),
  parish: text("parish"),
  /** Plan key: conch | rock | admiral. Null means the free plan. */
  adFreeTier: text("ad_free_tier"),
  planInterval: text("plan_interval"),
  /** active | sandbox | past_due | canceling. Null with a tier set is a legacy active plan. */
  planStatus: text("plan_status"),
  planRenewsAt: timestamp("plan_renews_at", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  /** Set when the owner clicks the link we emailed. Cleared whenever the email address changes. */
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  /** Bumped to sign a member out of every device at once (password change, reset, admin action). */
  sessionVersion: integer("session_version").notNull().default(0),
  /** active | suspended. A suspended member cannot sign in, and their sessions stop working. */
  status: text("status").notNull().default("active"),
  suspendedReason: text("suspended_reason"),
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  // Emails are stored in lower case, so one plain unique index stops two accounts sharing an address.
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    details: text("details"),
    category: text("category").notNull().default("notice"),
    severity: integer("severity").notNull().default(2),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    accuracyMeters: doublePrecision("accuracy_meters"),
    address: text("address"),
    street: text("street"),
    parish: text("parish"),
    status: text("status").notNull().default("active"),
    confirmations: integer("confirmations").notNull().default(0),
    sightings: integer("sightings").notNull().default(0),
    sourceKind: text("source_kind").notNull().default("resident"),
    sourceName: text("source_name"),
    sourceUrl: text("source_url"),
    photoNote: text("photo_note"),
    userId: uuid("user_id"),
    authorHandle: text("author_handle"),
    anonymous: boolean("anonymous").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("incidents_created_idx").on(table.createdAt.desc()),
    index("incidents_status_idx").on(table.status),
    index("incidents_parish_idx").on(table.parish),
  ],
);

export const incidentUpdates = pgTable(
  "incident_updates",
  {
    id: serial("id").primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("note"),
    note: text("note"),
    authorHandle: text("author_handle"),
    /** Who did it ("u:<account>" or a hashed address), so nobody can confirm or clear the same report twice. */
    actorKey: text("actor_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("incident_updates_incident_idx").on(table.incidentId)],
);

export const newsItems = pgTable(
  "news_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    summary: text("summary"),
    url: text("url").notNull().unique(),
    sourceName: text("source_name").notNull().default("NowBey Wire"),
    imageUrl: text("image_url"),
    parish: text("parish"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    geocoded: boolean("geocoded").notNull().default(false),
    category: text("category").notNull().default("news"),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).defaultNow().notNull(),
    /** approved stories show publicly; reader tips start as "pending" until an admin approves them. */
    review: text("review").notNull().default("approved"),
    /** high | watch | none. Set by the scraper from the headline; an editor decides whether to send an alert. */
    alertLevel: text("alert_level").notNull().default("none"),
    /** When an alert about this story was emailed to subscribers. Null means not yet sent. */
    alertedAt: timestamp("alerted_at", { withTimezone: true }),
  },
  (table) => [index("news_published_idx").on(table.publishedAt.desc())],
);

export const alertSubscriptions = pgTable(
  "alert_subscriptions",
  {
  id: serial("id").primaryKey(),
  channel: text("channel").notNull().default("email"),
  target: text("target").notNull(),
  parishes: text("parishes").notNull().default("New Providence"),
  categories: text("categories").notNull().default(""),
  radiusKm: integer("radius_km").notNull().default(12),
  /** Optional geofence centre. Null means island-wide matching (the old behaviour). */
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  active: boolean("active").notNull().default(true),
  /** Alerts only go out after the owner clicks the link in the confirmation email. */
  verified: boolean("verified").notNull().default(false),
  token: text("token"),
  /** SHA-256 of the confirmation token. Only the hash is used for lookup; `token` is legacy. */
  tokenHash: text("token_hash"),
  /** Confirmation links expire; null means no expiry (legacy rows). */
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  userId: uuid("user_id"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("alert_token_idx").on(table.token), uniqueIndex("alert_token_hash_idx").on(table.tokenHash), index("alert_target_idx").on(table.target)],
);

export const enterpriseInquiries = pgTable("enterprise_inquiries", {
  id: serial("id").primaryKey(),
  organisation: text("organisation").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  teamSize: text("team_size"),
  message: text("message"),
  /** new | contacted | closed */
  status: text("status").notNull().default("new"),
  handledAt: timestamp("handled_at", { withTimezone: true }),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  notifyError: text("notify_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailLog = pgTable("email_log", {
  id: serial("id").primaryKey(),
  toAddr: text("to_addr").notNull(),
  subject: text("subject").notNull(),
  kind: text("kind").notNull().default("other"),
  /** sent | skipped | failed */
  status: text("status").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Stripe webhook event ids we have already processed, so retries are harmless. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** One-time links we email: confirm an address, or choose a new password. Only a hash of the link is kept. */
export const accountTokens = pgTable(
  "account_tokens",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** verify_email | reset_password */
    kind: text("kind").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    /** For verify_email: the address being confirmed, so a link goes stale if the address changes. */
    email: text("email"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("account_tokens_user_idx").on(table.userId)],
);

/** Every action staff take on someone else's account, report or story. */
export const adminAudit = pgTable(
  "admin_audit",
  {
    id: serial("id").primaryKey(),
    actorHandle: text("actor_handle").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    targetLabel: text("target_label"),
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("admin_audit_created_idx").on(table.createdAt.desc())],
);

/** Raw bytes, used to keep member photos in the database so there is nothing extra to host or back up. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** Small admin-controlled switches such as the site look. Read through src/lib/settings.ts. */
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Island Life: restaurant tips, event experiences, favourite beaches and local advice. */
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorHandle: text("author_handle").notNull(),
    /** food | event | beach | night | tip */
    kind: text("kind").notNull(),
    placeName: text("place_name"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    rating: integer("rating"),
    priceLevel: integer("price_level"),
    parish: text("parish"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    street: text("street"),
    /** published | hidden. Hidden posts are only visible to staff. */
    status: text("status").notNull().default("published"),
    flagCount: integer("flag_count").notNull().default(0),
    photoCount: integer("photo_count").notNull().default(0),
    /** The venue this post is about. Several posts share one place, so its details and photos are shared too. */
    placeId: uuid("place_id").references(() => places.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("posts_created_idx").on(table.createdAt.desc()),
    index("posts_kind_idx").on(table.kind),
    index("posts_parish_idx").on(table.parish),
    index("posts_status_idx").on(table.status),
    index("posts_user_idx").on(table.userId),
  ],
);

export const postPhotos = pgTable(
  "post_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    position: integer("position").notNull().default(0),
    data: bytea("data").notNull(),
    thumb: bytea("thumb").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    bytes: integer("bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("post_photos_post_idx").on(table.postId)],
);

/** One report per person per post. actorKey is the account, or a one-way hash of a visitor's address. */
export const postFlags = pgTable(
  "post_flags",
  {
    id: serial("id").primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    actorKey: text("actor_key").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("post_flags_unique_idx").on(table.postId, table.actorKey)],
);

/**
 * Reactions on posts, pins (reports) and news stories. A member has at most one reaction per item, and can change it.
 * Each kind of item has its own real foreign-key column, so deleting a post, report or story removes its reactions
 * automatically and nothing is ever left behind.
 */
export const reactions = pgTable(
  "reactions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** like | love | thanks | wow | sad (see src/lib/engage-kinds.ts) */
    kind: text("kind").notNull(),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }),
    newsId: uuid("news_id").references(() => newsItems.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  // Postgres treats NULLs as different, so each of these only limits the rows that point at that kind of item.
  (t) => [
    uniqueIndex("reactions_post_user_idx").on(t.postId, t.userId),
    uniqueIndex("reactions_incident_user_idx").on(t.incidentId, t.userId),
    uniqueIndex("reactions_news_user_idx").on(t.newsId, t.userId),
    index("reactions_user_idx").on(t.userId),
    check("reactions_one_target", sql`num_nonnulls(${t.postId}, ${t.incidentId}, ${t.newsId}) = 1`),
  ],
);

/** Comments on posts, pins and news stories, with one level of replies. */
export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    /** Set to null when the author deletes their account and others had replied to this comment. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    authorHandle: text("author_handle").notNull(),
    body: text("body").notNull(),
    /** published | hidden (by staff) | removed (by its author, kept only so replies still make sense) */
    status: text("status").notNull().default("published"),
    parentId: integer("parent_id").references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }),
    newsId: uuid("news_id").references(() => newsItems.id, { onDelete: "cascade" }),
    flagCount: integer("flag_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("comments_post_idx").on(t.postId, t.createdAt),
    index("comments_incident_idx").on(t.incidentId, t.createdAt),
    index("comments_news_idx").on(t.newsId, t.createdAt),
    index("comments_parent_idx").on(t.parentId),
    index("comments_user_idx").on(t.userId),
    check("comments_one_target", sql`num_nonnulls(${t.postId}, ${t.incidentId}, ${t.newsId}) = 1`),
  ],
);

/** One report per person per comment. actorKey is the account, or a one-way hash of a visitor's address. */
export const commentFlags = pgTable(
  "comment_flags",
  {
    id: serial("id").primaryKey(),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    actorKey: text("actor_key").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("comment_flags_unique_idx").on(t.commentId, t.actorKey)],
);

export type Incident = typeof incidents.$inferSelect;

export const digestPartners = pgTable('digest_partners', {
  id: uuid('id').defaultRandom().primaryKey(),
  organisation: text('organisation').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  parish: text('parish').notNull(),
  categories: text('categories').notNull().default(''),
  paymentStatus: text('payment_status').notNull().default('unpaid'),
  planInterval: text('plan_interval').notNull().default('month'),
  lastPaymentAt: timestamp('last_payment_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type NewsItem = typeof newsItems.$inferSelect;

/** Gas tracker: pump prices reported by members. B$ per gallon, stored in cents. */
export const gasReports = pgTable(
  "gas_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Null = official/system price, not a member report. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    station: text("station").notNull(),
    parish: text("parish").notNull(),
    /** regular | premium | diesel */
    fuel: text("fuel").notNull(),
    priceCents: integer("price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("gas_reports_recent_idx").on(t.parish, t.fuel, t.createdAt.desc())],
);

/** A venue, beach or event people have written about: address, opening hours, menu and photos, shared by every review of it. */
export const places = pgTable(
  "places",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    parish: text("parish").notNull(),
    address: text("address"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    /** JSON text: one short line per day, keyed mon to sun. */
    hours: text("hours"),
    /** Typed menu, one item per line. */
    menuText: text("menu_text"),
    lastEditedBy: text("last_edited_by"),
    /** Where the listing came from when it was not written by a member: "openstreetmap" or null. */
    source: text("source"),
    /** The id in the source, so a re-import does not add the same place twice. */
    externalId: text("external_id"),
    imageUrls: text("image_urls"),
    menuLink: text("menu_link"),
    contactNumber: text("contact_number"),
    email: text("email"),
    socialLinks: text("social_links"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("places_kind_idx").on(table.kind, table.parish), uniqueIndex("places_external_idx").on(table.externalId)],
);

/** Photos of a place: general photos, or a photo of the menu. */
export const placePhotos = pgTable(
  "place_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    placeId: uuid("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    /** photo | menu */
    kind: text("kind").notNull().default("photo"),
    position: integer("position").notNull().default(0),
    data: bytea("data").notNull(),
    thumb: bytea("thumb").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    bytes: integer("bytes").notNull(),
    uploadedBy: text("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("place_photos_place_idx").on(table.placeId)],
);

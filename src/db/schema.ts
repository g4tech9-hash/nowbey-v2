import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
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
  /** Google's stable subject id ("sub"). Present when the account can be opened with Google. */
  googleSub: text("google_sub"),
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
  // Postgres lets any number of NULLs through a unique index, so unlinked accounts are unaffected.
  (table) => [uniqueIndex("users_email_idx").on(table.email), uniqueIndex("users_google_sub_idx").on(table.googleSub)],
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
    /** True once the stored pin has been moved a short distance from the spot the reporter chose (see location-privacy.ts). */
    pinApproximated: boolean("pin_approximated").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("incidents_created_idx").on(table.createdAt.desc()),
    index("incidents_status_idx").on(table.status),
    index("incidents_parish_idx").on(table.parish),
    // Declared here because src/db/add-profiles.sql creates it: a member's profile reads their own
    // reports by user id, and a schema that did not know about the index would have drizzle-kit drop it.
    index("incidents_user_idx").on(table.userId),
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
  (table) => [
    index("incident_updates_incident_idx").on(table.incidentId),
    // Also from add-profiles.sql: profiles count a member's confirmations by actor.
    index("incident_updates_actor_idx").on(table.actorKey),
  ],
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
    /** Gemini-written plain-English brief. Null until the AI pass runs (only when GEMINI_API_KEY is set). */
    aiSummary: text("ai_summary"),
    /** When the AI pass looked at this story, so it is never asked twice about the same headline. */
    aiAt: timestamp("ai_at", { withTimezone: true }),
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

/**
 * The member's own profile settings, in their own table rather than as columns on `users`.
 *
 * That is deliberate. The app reads whole user and incident rows with `select *` in the sign-in route, the
 * password reset, the report pages and the feed, so a column added to either table would break every one of
 * those pages on a database where the migration had not been applied yet. Here, a missing row means "the
 * defaults", and a missing table only affects the pages that are actually about profiles.
 */
export const memberProfiles = pgTable("member_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** open | private. A missing row is open, which is the default agreed for launch. */
  visibility: text("visibility").notNull().default("open"),
  /** Optional short line at the top of the profile. Never required, never longer than 200 characters. */
  bio: text("bio"),
  /** Opt-in: show "receives alerts for N islands". The address and the chosen categories are never shown. */
  showAlertSummary: boolean("show_alert_summary").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Reports a member has kept off their profile. A row here changes nothing about the report: it stays on the
 * map, keeps its confirmations and still counts toward the record. It only stops being listed by name.
 */
export const hiddenProfileReports = pgTable(
  "hidden_profile_reports",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("hidden_profile_reports_user_incident_idx").on(table.userId, table.incidentId),
    index("hidden_profile_reports_user_idx").on(table.userId),
  ],
);

/**
 * Staff notes about a member. Append-only, admin-only, and never shown to the member.
 * Kept separate from adminAudit because these are sentences a person wrote, not actions a system took.
 */
export const memberNotes = pgTable(
  "member_notes",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorHandle: text("author_handle").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("member_notes_user_idx").on(table.userId, table.createdAt.desc())],
);

/**
 * Badges a human granted, with the reason and (optionally) an expiry. The public "verified" badge means
 * a person checked this account — it is deliberately not for sale and not tied to a plan.
 */
export const badgeGrants = pgTable(
  "badge_grants",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** verified (a human checked this account) — desk comes from the role, not from here. */
    badge: text("badge").notNull(),
    reason: text("reason").notNull(),
    grantedBy: text("granted_by").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: text("revoked_by"),
  },
  (table) => [index("badge_grants_user_idx").on(table.userId)],
);

/** Raw bytes, used to keep member photos in the database so there is nothing extra to host or back up. */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

/** Optional processed profile photo. Separate table keeps older databases compatible with sign-in. */
export const memberAvatars = pgTable("member_avatars", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
export type PushToken = typeof pushTokens.$inferSelect;
export type DigestDraft = typeof digestDrafts.$inferSelect;

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

/** Browsers that asked for push alerts. One row per FCM registration token. Only filled when Firebase is set up. */
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: serial("id").primaryKey(),
    /** The signed-in member, when the browser was signed in at registration time. Null is fine (guest device). */
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    /** The FCM registration token. Unique: a browser that re-registers just refreshes its row. */
    token: text("token").notNull(),
    platform: text("platform").notNull().default("web"),
    /** Comma-separated islands this device wants to hear about. */
    parishes: text("parishes").notNull().default("New Providence"),
    /** Comma-separated categories. Empty means every category. */
    categories: text("categories").notNull().default(""),
    active: boolean("active").notNull().default(true),
    /** Cooldown: when the last push went to this device, so bans/alerts cannot spam it. */
    lastPushAt: timestamp("last_push_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("push_tokens_token_idx").on(table.token), index("push_tokens_active_idx").on(table.active)],
);

/** A weekly Community Digest draft for a paying partner (HOA etc.). AI-written when Gemini is set up, edited, then emailed by hand. */
export const digestDrafts = pgTable(
  "digest_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    parish: text("parish").notNull(),
    /** Comma-separated categories the digest covered. Empty means all of them. */
    categories: text("categories").notNull().default(""),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text").notNull(),
    /** Comma-separated addresses it was sent to. Empty while still a draft. */
    recipients: text("recipients").notNull().default(""),
    /** How many reports/stories went into it. */
    itemCount: integer("item_count").notNull().default(0),
    /** ai | plain — "plain" when Gemini was not set up and a template filled in instead. */
    generatedBy: text("generated_by").notNull().default("plain"),
    /** draft | sent */
    status: text("status").notNull().default("draft"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("digest_drafts_created_idx").on(table.createdAt.desc())],
);

/** Client/server crashes, grouped by a digest so one bug renting the page once a minute is one row, not a thousand. Self-hosted: no error data leaves NowBey. */
export const clientErrors = pgTable(
  "client_errors",
  {
    id: serial("id").primaryKey(),
    /** sha-256 of kind+message+url, so repeats of the same bug update this one row. */
    digest: text("digest").notNull(),
    /** client (browser event) | boundary (React error page) | server (route/render) */
    kind: text("kind").notNull().default("client"),
    message: text("message").notNull(),
    stack: text("stack"),
    /** Path only — query strings and hashes are dropped before storage (they can carry tokens). */
    url: text("url"),
    /** The member's handle when they were signed in. Filled by the server, never trusted from the request. */
    handle: text("handle"),
    userAgent: text("user_agent"),
    /** web | android | ios | server — part of the digest, so the same message on two platforms is two rows. */
    platform: text("platform").notNull().default("web"),
    appVersion: text("app_version"),
    /** Random per tab/app-launch id. Not a user id: it only groups the breadcrumbs of one visit. */
    sessionId: text("session_id"),
    /** JSON: newest sanitized breadcrumb trail + small non-sensitive fields (sanitizeContextJson caps it). */
    context: text("context"),
    count: integer("count").notNull().default(1),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("client_errors_digest_idx").on(table.digest), index("client_errors_seen_idx").on(table.lastSeenAt.desc())],
);

/**
 * The AI's reading of one crash group, plus the human's decision on it. One row per group
 * (re-analysis updates it). Flow: (no row) → pending_review → approved → issue_created, or
 * dismissed. "unavailable" means Gemini was off/down and the cron may retry after 6 hours.
 * The AI never edits code: approval creates a GitHub issue for a human/Arena session to implement.
 */
export const errorAnalyses = pgTable(
  "error_analyses",
  {
    id: serial("id").primaryKey(),
    errorId: integer("error_id")
      .notNull()
      .references(() => clientErrors.id, { onDelete: "cascade" }),
    digest: text("digest").notNull(),
    /** pending_review | approved | issue_created | dismissed | unavailable */
    status: text("status").notNull().default("pending_review"),
    /** low | medium | high | critical */
    severity: text("severity").notNull().default("low"),
    summary: text("summary").notNull(),
    likelyCause: text("likely_cause"),
    suggestedFix: text("suggested_fix"),
    affectedArea: text("affected_area"),
    /** low | medium | high */
    confidence: text("confidence").notNull().default("low"),
    model: text("model"),
    /** Occurrence count when this analysis was written, so shouldAnalyze can spot a bug that came back. */
    analyzedCount: integer("analyzed_count").notNull().default(0),
    githubIssueNumber: integer("github_issue_number"),
    githubIssueUrl: text("github_issue_url"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("error_analyses_error_idx").on(table.errorId), index("error_analyses_status_idx").on(table.status)],
);

/**
 * Gemini usage ledger, one row per UTC day, written by recordAiUsage in lib/ai.ts.
 * Powers the daily call cap (the cost kill): AI_DAILY_CALL_LIMIT is enforced against
 * `calls`, and the Admin overview shows the token counts + estimated spend.
 */
export const aiUsageDaily = pgTable("ai_usage_daily", {
  /** UTC day, YYYY-MM-DD. */
  day: text("day").primaryKey(),
  calls: integer("calls").notNull().default(0),
  promptTokens: integer("prompt_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Expo push tokens, one row per member per device. Pruned when Expo reports them dead. */
export const serviceStatuses = pgTable(
  "service_statuses",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    /** pharmacy | food | fuel | hardware | water | charging | clinic | shelter | other */
    kind: text("kind").notNull(),
    parish: text("parish").notNull().default("New Providence"),
    address: text("address"),
    /** open | limited | closed | unknown */
    status: text("status").notNull().default("unknown"),
    note: text("note"),
    sourceName: text("source_name"),
    sourceUrl: text("source_url"),
    verified: boolean("verified").notNull().default(false),
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [index("service_statuses_parish_idx").on(table.parish, table.status), index("service_statuses_updated_idx").on(table.updatedAt.desc())],
);

export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("device_tokens_user_token_idx").on(table.userId, table.token)],
);

/**
 * Shared rate-limit counters (src/lib/ratelimit.ts → sharedHit and friends), so a limit such as "6 wrong
 * passwords per 15 minutes" holds across every server instance instead of per instance. Fixed window:
 * `hits` counts attempts until `expires_at`, then the next attempt starts a fresh window. Keys are short
 * (long parts are hashed) and rows past `expires_at` are swept opportunistically.
 * Created by src/db/add-security-fixes.sql.
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    hits: integer("hits").notNull().default(1),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("rate_limits_expires_idx").on(table.expiresAt)],
);

/**
 * Live video broadcasts from verified broadcasters (Incident Command → Content Moderation).
 * The app itself does not relay video: the broadcaster's client publishes to the streaming
 * provider and stores the playback URL here. Staff see every live row in /admin/streams and
 * can kill one instantly, which flips the status so every client drops it. Ended rows are kept
 * for the audit trail. Created by add-live-streams.sql.
 */
export const liveStreams = pgTable(
  "live_streams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    authorHandle: text("author_handle").notNull(),
    title: text("title").notNull(),
    /** Optional incident this broadcast is covering. Null means a standalone broadcast. */
    incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "set null" }),
    /** Where clients play it (HLS/DASH URL from the streaming provider). */
    playbackUrl: text("playback_url"),
    /** live | ended (broadcaster stopped) | killed (staff stopped) */
    status: text("status").notNull().default("live"),
    /** Why staff killed it, shown to the broadcaster. */
    killReason: text("kill_reason"),
    killedBy: text("killed_by"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [index("live_streams_status_idx").on(table.status), index("live_streams_user_idx").on(table.userId)],
);

/**
 * Devices an admin has banned. Stores only the one-way fingerprint (src/lib/command.ts
 * tokenFingerprint), never the raw push token, so the list is useless to anyone who steals it.
 * Registration refuses banned tokens and every send path skips them. Created by add-banned-devices.sql.
 */
export const bannedDevices = pgTable(
  "banned_devices",
  {
    id: serial("id").primaryKey(),
    tokenHash: text("token_hash").notNull().unique(),
    /** expo | fcm, when known. */
    platform: text("platform"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason"),
    bannedBy: text("banned_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("banned_devices_user_idx").on(table.userId)],
);

/** Daily adoption counts (see src/lib/funnel.ts). No visitor identifiers are stored. */
export const funnelDaily = pgTable(
  "funnel_daily",
  {
    day: date("day").notNull(),
    step: text("step").notNull(),
    n: integer("n").notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.day, table.step] })],
);

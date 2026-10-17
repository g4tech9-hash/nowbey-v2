CREATE TABLE "account_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"token_hash" text NOT NULL,
	"email" text,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "admin_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_handle" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"target_label" text,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_daily" (
	"day" text PRIMARY KEY NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"target" text NOT NULL,
	"parishes" text DEFAULT 'New Providence' NOT NULL,
	"categories" text DEFAULT '' NOT NULL,
	"radius_km" integer DEFAULT 12 NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"active" boolean DEFAULT true NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"token" text,
	"token_hash" text,
	"token_expires_at" timestamp with time zone,
	"user_id" uuid,
	"verified_at" timestamp with time zone,
	"last_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badge_grants" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"badge" text NOT NULL,
	"reason" text NOT NULL,
	"granted_by" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" text
);
--> statement-breakpoint
CREATE TABLE "banned_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"platform" text,
	"user_id" uuid,
	"reason" text,
	"banned_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banned_devices_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "client_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"digest" text NOT NULL,
	"kind" text DEFAULT 'client' NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"url" text,
	"handle" text,
	"user_agent" text,
	"platform" text DEFAULT 'web' NOT NULL,
	"app_version" text,
	"session_id" text,
	"context" text,
	"count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"comment_id" integer NOT NULL,
	"actor_key" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"author_handle" text NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'published' NOT NULL,
	"parent_id" integer,
	"post_id" uuid,
	"incident_id" uuid,
	"news_id" uuid,
	"flag_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_one_target" CHECK (num_nonnulls("comments"."post_id", "comments"."incident_id", "comments"."news_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digest_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parish" text NOT NULL,
	"categories" text DEFAULT '' NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text NOT NULL,
	"recipients" text DEFAULT '' NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"generated_by" text DEFAULT 'plain' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digest_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"parish" text NOT NULL,
	"categories" text DEFAULT '' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"plan_interval" text DEFAULT 'month' NOT NULL,
	"last_payment_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"to_addr" text NOT NULL,
	"subject" text NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"status" text NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enterprise_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"organisation" text NOT NULL,
	"contact_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"team_size" text,
	"message" text,
	"status" text DEFAULT 'new' NOT NULL,
	"handled_at" timestamp with time zone,
	"notified_at" timestamp with time zone,
	"notify_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "error_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"error_id" integer NOT NULL,
	"digest" text NOT NULL,
	"status" text DEFAULT 'pending_review' NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"summary" text NOT NULL,
	"likely_cause" text,
	"suggested_fix" text,
	"affected_area" text,
	"confidence" text DEFAULT 'low' NOT NULL,
	"model" text,
	"analyzed_count" integer DEFAULT 0 NOT NULL,
	"github_issue_number" integer,
	"github_issue_url" text,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funnel_daily" (
	"day" date NOT NULL,
	"step" text NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "funnel_daily_day_step_pk" PRIMARY KEY("day","step")
);
--> statement-breakpoint
CREATE TABLE "gas_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"station" text NOT NULL,
	"parish" text NOT NULL,
	"fuel" text NOT NULL,
	"price_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hidden_profile_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"hidden_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"incident_id" uuid NOT NULL,
	"kind" text DEFAULT 'note' NOT NULL,
	"note" text,
	"author_handle" text,
	"actor_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"details" text,
	"category" text DEFAULT 'notice' NOT NULL,
	"severity" integer DEFAULT 2 NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"accuracy_meters" double precision,
	"address" text,
	"street" text,
	"parish" text,
	"status" text DEFAULT 'active' NOT NULL,
	"confirmations" integer DEFAULT 0 NOT NULL,
	"sightings" integer DEFAULT 0 NOT NULL,
	"source_kind" text DEFAULT 'resident' NOT NULL,
	"source_name" text,
	"source_url" text,
	"photo_note" text,
	"user_id" uuid,
	"author_handle" text,
	"anonymous" boolean DEFAULT false NOT NULL,
	"pin_approximated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "live_streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"author_handle" text NOT NULL,
	"title" text NOT NULL,
	"incident_id" uuid,
	"playback_url" text,
	"status" text DEFAULT 'live' NOT NULL,
	"kill_reason" text,
	"killed_by" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "member_avatars" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"author_handle" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"visibility" text DEFAULT 'open' NOT NULL,
	"bio" text,
	"show_alert_summary" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"url" text NOT NULL,
	"source_name" text DEFAULT 'NowBey Wire' NOT NULL,
	"image_url" text,
	"parish" text,
	"lat" double precision,
	"lng" double precision,
	"geocoded" boolean DEFAULT false NOT NULL,
	"category" text DEFAULT 'news' NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"review" text DEFAULT 'approved' NOT NULL,
	"alert_level" text DEFAULT 'none' NOT NULL,
	"alerted_at" timestamp with time zone,
	"ai_summary" text,
	"ai_at" timestamp with time zone,
	CONSTRAINT "news_items_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "place_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"place_id" uuid NOT NULL,
	"kind" text DEFAULT 'photo' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"data" "bytea" NOT NULL,
	"thumb" "bytea" NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"parish" text NOT NULL,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"hours" text,
	"menu_text" text,
	"last_edited_by" text,
	"source" text,
	"external_id" text,
	"image_urls" text,
	"menu_link" text,
	"contact_number" text,
	"email" text,
	"social_links" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_flags" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"actor_key" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"data" "bytea" NOT NULL,
	"thumb" "bytea" NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"author_handle" text NOT NULL,
	"kind" text NOT NULL,
	"place_name" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"rating" integer,
	"price_level" integer,
	"parish" text,
	"lat" double precision,
	"lng" double precision,
	"street" text,
	"status" text DEFAULT 'published' NOT NULL,
	"flag_count" integer DEFAULT 0 NOT NULL,
	"photo_count" integer DEFAULT 0 NOT NULL,
	"place_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"token" text NOT NULL,
	"platform" text DEFAULT 'web' NOT NULL,
	"parishes" text DEFAULT 'New Providence' NOT NULL,
	"categories" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_push_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"hits" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"post_id" uuid,
	"incident_id" uuid,
	"news_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_one_target" CHECK (num_nonnulls("reactions"."post_id", "reactions"."incident_id", "reactions"."news_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "service_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"parish" text DEFAULT 'New Providence' NOT NULL,
	"address" text,
	"status" text DEFAULT 'unknown' NOT NULL,
	"note" text,
	"source_name" text,
	"source_url" text,
	"verified" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"password_hash" text,
	"role" text DEFAULT 'resident' NOT NULL,
	"parish" text,
	"ad_free_tier" text,
	"plan_interval" text,
	"plan_status" text,
	"plan_renews_at" timestamp with time zone,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"email_verified_at" timestamp with time zone,
	"google_sub" text,
	"session_version" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"suspended_reason" text,
	"suspended_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_grants" ADD CONSTRAINT "badge_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banned_devices" ADD CONSTRAINT "banned_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_flags" ADD CONSTRAINT "comment_flags_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_news_id_news_items_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_analyses" ADD CONSTRAINT "error_analyses_error_id_client_errors_id_fk" FOREIGN KEY ("error_id") REFERENCES "public"."client_errors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gas_reports" ADD CONSTRAINT "gas_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_profile_reports" ADD CONSTRAINT "hidden_profile_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_profile_reports" ADD CONSTRAINT "hidden_profile_reports_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_updates" ADD CONSTRAINT "incident_updates_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_avatars" ADD CONSTRAINT "member_avatars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_profiles" ADD CONSTRAINT "member_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "place_photos" ADD CONSTRAINT "place_photos_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_flags" ADD CONSTRAINT "post_flags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_photos" ADD CONSTRAINT "post_photos_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_news_id_news_items_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_tokens_user_idx" ON "account_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "admin_audit_created_idx" ON "admin_audit" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "alert_token_idx" ON "alert_subscriptions" USING btree ("token");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_token_hash_idx" ON "alert_subscriptions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "alert_target_idx" ON "alert_subscriptions" USING btree ("target");--> statement-breakpoint
CREATE INDEX "badge_grants_user_idx" ON "badge_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "banned_devices_user_idx" ON "banned_devices" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_errors_digest_idx" ON "client_errors" USING btree ("digest");--> statement-breakpoint
CREATE INDEX "client_errors_seen_idx" ON "client_errors" USING btree ("last_seen_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "comment_flags_unique_idx" ON "comment_flags" USING btree ("comment_id","actor_key");--> statement-breakpoint
CREATE INDEX "comments_post_idx" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_incident_idx" ON "comments" USING btree ("incident_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_news_idx" ON "comments" USING btree ("news_id","created_at");--> statement-breakpoint
CREATE INDEX "comments_parent_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "comments_user_idx" ON "comments" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_user_token_idx" ON "device_tokens" USING btree ("user_id","token");--> statement-breakpoint
CREATE INDEX "digest_drafts_created_idx" ON "digest_drafts" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "error_analyses_error_idx" ON "error_analyses" USING btree ("error_id");--> statement-breakpoint
CREATE INDEX "error_analyses_status_idx" ON "error_analyses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "gas_reports_recent_idx" ON "gas_reports" USING btree ("parish","fuel","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "hidden_profile_reports_user_incident_idx" ON "hidden_profile_reports" USING btree ("user_id","incident_id");--> statement-breakpoint
CREATE INDEX "hidden_profile_reports_user_idx" ON "hidden_profile_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "incident_updates_incident_idx" ON "incident_updates" USING btree ("incident_id");--> statement-breakpoint
CREATE INDEX "incident_updates_actor_idx" ON "incident_updates" USING btree ("actor_key");--> statement-breakpoint
CREATE INDEX "incidents_created_idx" ON "incidents" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "incidents_status_idx" ON "incidents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "incidents_parish_idx" ON "incidents" USING btree ("parish");--> statement-breakpoint
CREATE INDEX "incidents_user_idx" ON "incidents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "live_streams_status_idx" ON "live_streams" USING btree ("status");--> statement-breakpoint
CREATE INDEX "live_streams_user_idx" ON "live_streams" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_notes_user_idx" ON "member_notes" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "news_published_idx" ON "news_items" USING btree ("published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "place_photos_place_idx" ON "place_photos" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "places_kind_idx" ON "places" USING btree ("kind","parish");--> statement-breakpoint
CREATE UNIQUE INDEX "places_external_idx" ON "places" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_flags_unique_idx" ON "post_flags" USING btree ("post_id","actor_key");--> statement-breakpoint
CREATE INDEX "post_photos_post_idx" ON "post_photos" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "posts_created_idx" ON "posts" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "posts_kind_idx" ON "posts" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "posts_parish_idx" ON "posts" USING btree ("parish");--> statement-breakpoint
CREATE INDEX "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "posts_user_idx" ON "posts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_tokens_token_idx" ON "push_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "push_tokens_active_idx" ON "push_tokens" USING btree ("active");--> statement-breakpoint
CREATE INDEX "rate_limits_expires_idx" ON "rate_limits" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_post_user_idx" ON "reactions" USING btree ("post_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_incident_user_idx" ON "reactions" USING btree ("incident_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reactions_news_user_idx" ON "reactions" USING btree ("news_id","user_id");--> statement-breakpoint
CREATE INDEX "reactions_user_idx" ON "reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "service_statuses_parish_idx" ON "service_statuses" USING btree ("parish","status");--> statement-breakpoint
CREATE INDEX "service_statuses_updated_idx" ON "service_statuses" USING btree ("updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_google_sub_idx" ON "users" USING btree ("google_sub");
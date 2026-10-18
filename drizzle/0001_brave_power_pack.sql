CREATE TABLE "news_quarantine" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"source_name" text DEFAULT '' NOT NULL,
	"reason" text NOT NULL,
	"detail" text,
	"published_at" timestamp with time zone,
	"quarantined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"review" text DEFAULT 'held' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN "placement" text DEFAULT 'none' NOT NULL;--> statement-breakpoint
CREATE INDEX "news_quarantine_review_idx" ON "news_quarantine" USING btree ("review");--> statement-breakpoint
CREATE UNIQUE INDEX "news_quarantine_url_idx" ON "news_quarantine" USING btree ("url");
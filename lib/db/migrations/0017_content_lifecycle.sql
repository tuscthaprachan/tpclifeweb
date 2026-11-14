CREATE TABLE "redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_path" text NOT NULL,
	"to_path" text NOT NULL,
	"status" integer DEFAULT 301 NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp with time zone,
	CONSTRAINT "redirects_from_path_unique" UNIQUE("from_path"),
	CONSTRAINT "redirects_status" CHECK ("redirects"."status" in (301, 308)),
	CONSTRAINT "redirects_not_self" CHECK ("redirects"."from_path" <> "redirects"."to_path")
);
--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "forms" ADD COLUMN "unpublish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "unpublish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "news_posts" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "news_posts" ADD COLUMN "unpublish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "unpublish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content_pages" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "content_pages" ADD COLUMN "unpublish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "publish_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "unpublish_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "redirects_to_path_idx" ON "redirects" USING btree ("to_path");
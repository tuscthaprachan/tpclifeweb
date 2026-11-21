CREATE TABLE "site_text" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"singleton_key" text DEFAULT 'site-text' NOT NULL,
	"texts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "site_text_singleton_key" UNIQUE("singleton_key"),
	CONSTRAINT "site_text_singleton" CHECK ("site_text"."singleton_key" = 'site-text')
);

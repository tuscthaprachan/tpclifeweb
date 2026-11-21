CREATE TABLE "service_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"singleton_key" text DEFAULT 'service-pages' NOT NULL,
	"texts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "service_pages_singleton_key" UNIQUE("singleton_key"),
	CONSTRAINT "service_pages_singleton" CHECK ("service_pages"."singleton_key" = 'service-pages')
);

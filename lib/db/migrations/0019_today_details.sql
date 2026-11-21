CREATE TABLE "today_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"singleton_key" text DEFAULT 'today' NOT NULL,
	"rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"heat_advice" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"pm25_advice" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"weather_note_th" text,
	"weather_note_en" text,
	"libraries_intro_th" text,
	"libraries_intro_en" text,
	"libraries_guide_path" text,
	CONSTRAINT "today_settings_singleton_key" UNIQUE("singleton_key"),
	CONSTRAINT "today_settings_singleton" CHECK ("today_settings"."singleton_key" = 'today')
);
--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "contacts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "accessibility_th" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "accessibility_en" text;--> statement-breakpoint
ALTER TABLE "places" ADD COLUMN "more_info_url" text;
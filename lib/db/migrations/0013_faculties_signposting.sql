CREATE TYPE "public"."directory_organisation_scope" AS ENUM('faculty', 'programme');--> statement-breakpoint
CREATE TABLE "faculties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"name_th" text DEFAULT '' NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"office_location_th" text,
	"office_location_en" text,
	"office_phone" text,
	"office_email" text,
	"office_website" text,
	"office_note_th" text,
	"office_note_en" text,
	CONSTRAINT "faculties_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "journey_metrics" DROP CONSTRAINT "journey_metrics_kind";--> statement-breakpoint
ALTER TABLE "directory_organisations" ADD COLUMN "faculty_id" uuid;--> statement-breakpoint
ALTER TABLE "directory_organisations" ADD COLUMN "scope" "directory_organisation_scope";--> statement-breakpoint
ALTER TABLE "directory_organisations" ADD COLUMN "programme_name_th" text;--> statement-breakpoint
ALTER TABLE "directory_organisations" ADD COLUMN "programme_name_en" text;--> statement-breakpoint
ALTER TABLE "complaint_cases" ADD COLUMN "redirected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "complaint_cases" ADD COLUMN "redirect_level" text;--> statement-breakpoint
ALTER TABLE "complaint_cases" ADD COLUMN "redirect_faculty_id" uuid;--> statement-breakpoint
ALTER TABLE "complaint_cases" ADD COLUMN "redirect_organisation_id" uuid;--> statement-breakpoint
CREATE INDEX "faculties_listing_idx" ON "faculties" USING btree ("status","sort_order","name_en");--> statement-breakpoint
ALTER TABLE "directory_organisations" ADD CONSTRAINT "directory_organisations_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_cases" ADD CONSTRAINT "complaint_cases_redirect_faculty_id_faculties_id_fk" FOREIGN KEY ("redirect_faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_cases" ADD CONSTRAINT "complaint_cases_redirect_organisation_id_directory_organisations_id_fk" FOREIGN KEY ("redirect_organisation_id") REFERENCES "public"."directory_organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "directory_organisations_faculty_idx" ON "directory_organisations" USING btree ("faculty_id");--> statement-breakpoint
ALTER TABLE "complaint_cases" ADD CONSTRAINT "complaint_cases_redirect_level" CHECK ("complaint_cases"."redirect_level" is null or "complaint_cases"."redirect_level" in ('faculty', 'course'));--> statement-breakpoint
ALTER TABLE "journey_metrics" ADD CONSTRAINT "journey_metrics_kind" CHECK ("journey_metrics"."kind" in ('lost', 'found', 'claim', 'complaint', 'signpost_faculty', 'signpost_course', 'signpost_emergency'));
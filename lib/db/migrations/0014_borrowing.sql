ALTER TYPE "public"."staff_role" ADD VALUE 'equipment_officer';--> statement-breakpoint
ALTER TYPE "public"."case_service" ADD VALUE 'borrowing';--> statement-breakpoint
CREATE TABLE "borrowing_journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"data_enc" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "borrowing_journeys_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "borrowing_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"returned_good" integer,
	"damaged" integer,
	"lost" integer,
	CONSTRAINT "borrowing_lines_quantity" CHECK ("borrowing_lines"."quantity" >= 1),
	CONSTRAINT "borrowing_lines_return" CHECK (("borrowing_lines"."returned_good" is null and "borrowing_lines"."damaged" is null and "borrowing_lines"."lost" is null) or ("borrowing_lines"."returned_good" >= 0 and "borrowing_lines"."damaged" >= 0 and "borrowing_lines"."lost" >= 0 and "borrowing_lines"."returned_good" + "borrowing_lines"."damaged" + "borrowing_lines"."lost" = "borrowing_lines"."quantity"))
);
--> statement-breakpoint
CREATE TABLE "borrowing_requests" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"borrower_kind" text NOT NULL,
	"group_name" text,
	"event_name" text NOT NULL,
	"venue" text NOT NULL,
	"purpose" text NOT NULL,
	"collect_at" timestamp with time zone NOT NULL,
	"return_due_at" timestamp with time zone NOT NULL,
	"student_id_enc" text,
	"faculty_id" uuid,
	"affiliation_enc" text,
	"terms_version" text NOT NULL,
	"terms_accepted_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	"collected_at" timestamp with time zone,
	"handover_checked" boolean DEFAULT false NOT NULL,
	"deposit_kind" text,
	"deposit_count" integer,
	"deposit_returned_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"compensation_baht" integer,
	"compensation_note" text,
	"settled_at" timestamp with time zone,
	"settlement" text,
	"reminder_sent_at" timestamp with time zone,
	"overdue_notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "borrowing_requests_kind" CHECK ("borrowing_requests"."borrower_kind" in ('group', 'personal')),
	CONSTRAINT "borrowing_requests_group" CHECK ("borrowing_requests"."borrower_kind" = 'personal' or "borrowing_requests"."group_name" is not null),
	CONSTRAINT "borrowing_requests_period" CHECK ("borrowing_requests"."return_due_at" > "borrowing_requests"."collect_at"),
	CONSTRAINT "borrowing_requests_deposit_kind" CHECK ("borrowing_requests"."deposit_kind" is null or "borrowing_requests"."deposit_kind" in ('student_card', 'national_id_card', 'other')),
	CONSTRAINT "borrowing_requests_compensation" CHECK ("borrowing_requests"."compensation_baht" is null or "borrowing_requests"."compensation_baht" >= 0),
	CONSTRAINT "borrowing_requests_settlement" CHECK ("borrowing_requests"."settlement" is null or "borrowing_requests"."settlement" in ('paid', 'waived', 'replaced'))
);
--> statement-breakpoint
CREATE TABLE "equipment_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name_th" text NOT NULL,
	"name_en" text NOT NULL,
	"hint_th" text DEFAULT '' NOT NULL,
	"hint_en" text DEFAULT '' NOT NULL,
	"notice_working_days" integer DEFAULT 3 NOT NULL,
	"max_per_request" integer,
	"deposit_cards" integer DEFAULT 1 NOT NULL,
	"terms_th" text DEFAULT '' NOT NULL,
	"terms_en" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_categories_key_unique" UNIQUE("key"),
	CONSTRAINT "equipment_categories_key_format" CHECK ("equipment_categories"."key" ~ '^[a-z][a-z0-9-]{0,39}$'),
	CONSTRAINT "equipment_categories_notice" CHECK ("equipment_categories"."notice_working_days" between 0 and 30),
	CONSTRAINT "equipment_categories_max" CHECK ("equipment_categories"."max_per_request" is null or "equipment_categories"."max_per_request" >= 1),
	CONSTRAINT "equipment_categories_deposit" CHECK ("equipment_categories"."deposit_cards" between 0 and 5)
);
--> statement-breakpoint
CREATE TABLE "equipment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name_th" text NOT NULL,
	"name_en" text NOT NULL,
	"hint_th" text DEFAULT '' NOT NULL,
	"hint_en" text DEFAULT '' NOT NULL,
	"unit_th" text DEFAULT 'อัน' NOT NULL,
	"unit_en" text DEFAULT 'item' NOT NULL,
	"total_quantity" integer DEFAULT 0 NOT NULL,
	"out_of_service" integer DEFAULT 0 NOT NULL,
	"max_per_request" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "equipment_items_slug_unique" UNIQUE("slug"),
	CONSTRAINT "equipment_items_slug_format" CHECK ("equipment_items"."slug" ~ '^[a-z0-9][a-z0-9-]{0,63}$'),
	CONSTRAINT "equipment_items_quantities" CHECK ("equipment_items"."total_quantity" >= 0 and "equipment_items"."out_of_service" >= 0 and "equipment_items"."out_of_service" <= "equipment_items"."total_quantity"),
	CONSTRAINT "equipment_items_max" CHECK ("equipment_items"."max_per_request" is null or "equipment_items"."max_per_request" >= 1)
);
--> statement-breakpoint
ALTER TABLE "cases" DROP CONSTRAINT "cases_reference_format";--> statement-breakpoint
ALTER TABLE "cases" DROP CONSTRAINT "cases_reference_matches_service";--> statement-breakpoint
ALTER TABLE "journey_metrics" DROP CONSTRAINT "journey_metrics_kind";--> statement-breakpoint
ALTER TABLE "borrowing_lines" ADD CONSTRAINT "borrowing_lines_case_id_borrowing_requests_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."borrowing_requests"("case_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowing_lines" ADD CONSTRAINT "borrowing_lines_item_id_equipment_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."equipment_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowing_requests" ADD CONSTRAINT "borrowing_requests_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "borrowing_requests" ADD CONSTRAINT "borrowing_requests_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_items" ADD CONSTRAINT "equipment_items_category_id_equipment_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."equipment_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "borrowing_lines_case_item_unique" ON "borrowing_lines" USING btree ("case_id","item_id");--> statement-breakpoint
CREATE INDEX "borrowing_lines_item_idx" ON "borrowing_lines" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "borrowing_requests_period_idx" ON "borrowing_requests" USING btree ("collect_at","return_due_at");--> statement-breakpoint
CREATE INDEX "equipment_items_category_idx" ON "equipment_items" USING btree ("category_id","position");--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_reference_format" CHECK ("cases"."reference" ~ '^(LF|CP|BR)-[0-9]{4}-[0-9]{4,}$');--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_reference_matches_service" CHECK (("cases"."service"::text = 'lost_found' and "cases"."reference" like 'LF-%') or ("cases"."service"::text = 'complaint' and "cases"."reference" like 'CP-%') or ("cases"."service"::text = 'borrowing' and "cases"."reference" like 'BR-%'));--> statement-breakpoint
ALTER TABLE "journey_metrics" ADD CONSTRAINT "journey_metrics_kind" CHECK ("journey_metrics"."kind" in ('lost', 'found', 'claim', 'complaint', 'borrow', 'signpost_faculty', 'signpost_course', 'signpost_emergency'));
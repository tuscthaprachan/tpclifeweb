CREATE TYPE "public"."open_data_body_kind" AS ENUM('council', 'committee', 'office');--> statement-breakpoint
CREATE TYPE "public"."open_data_budget_view" AS ENUM('organisation', 'project', 'category');--> statement-breakpoint
CREATE TYPE "public"."open_data_document_type" AS ENUM('announcement', 'regulation', 'university-regulation', 'agenda', 'minutes', 'report', 'fund-list', 'guide', 'other');--> statement-breakpoint
CREATE TYPE "public"."open_data_session_type" AS ENUM('ordinary', 'extraordinary');--> statement-breakpoint
CREATE TABLE "open_data_bodies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"owner" "content_owner" DEFAULT 'tusc' NOT NULL,
	"slug" text NOT NULL,
	"kind" "open_data_body_kind" NOT NULL,
	"name_th" text NOT NULL,
	"name_en" text,
	"committee_type" text,
	"parent_id" uuid,
	"remit" text,
	"legal_basis" text,
	"appointed_on" date,
	"ended_on" date,
	"members_as_appointed" integer,
	"chair" text,
	"activity" text,
	"source_document_id" uuid,
	CONSTRAINT "open_data_bodies_slug" UNIQUE("owner","slug"),
	CONSTRAINT "open_data_bodies_name" UNIQUE("owner","name_th"),
	CONSTRAINT "open_data_bodies_owner" CHECK ("open_data_bodies"."owner" in ('tusc', 'tusu'))
);
--> statement-breakpoint
CREATE TABLE "open_data_budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"owner" "content_owner" DEFAULT 'tusc' NOT NULL,
	"fiscal_year" integer NOT NULL,
	"view" "open_data_budget_view" NOT NULL,
	"organisation_type" text NOT NULL,
	"organisation" text NOT NULL,
	"project" text NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"source_document_id" uuid,
	"source_page" integer,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "open_data_budget_lines_owner" CHECK ("open_data_budget_lines"."owner" in ('tusc', 'tusu'))
);
--> statement-breakpoint
CREATE TABLE "open_data_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"owner" "content_owner" DEFAULT 'tusc' NOT NULL,
	"ref" text NOT NULL,
	"meeting_id" uuid NOT NULL,
	"item" text NOT NULL,
	"topic" text NOT NULL,
	"type" text NOT NULL,
	"text_th" text DEFAULT '' NOT NULL,
	"text_en" text DEFAULT '' NOT NULL,
	"votes_for" text,
	"votes_against" text,
	"votes_abstain" text,
	"members_voting" text,
	"party_breakdown" text,
	"outcome" text NOT NULL,
	"amount" text,
	"minutes_anchor" text,
	CONSTRAINT "open_data_decisions_ref" UNIQUE("owner","ref"),
	CONSTRAINT "open_data_decisions_owner" CHECK ("open_data_decisions"."owner" in ('tusc', 'tusu'))
);
--> statement-breakpoint
CREATE TABLE "open_data_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"owner" "content_owner" DEFAULT 'tusc' NOT NULL,
	"number" text NOT NULL,
	"slug" text NOT NULL,
	"type" "open_data_document_type" NOT NULL,
	"title_th" text DEFAULT '' NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"issuer_th" text,
	"issuer_en" text,
	"reference" text,
	"date_text" text,
	"date_iso" date,
	"signatory" text,
	"pages" integer,
	"scan" boolean DEFAULT false NOT NULL,
	"drive_folder_path" text DEFAULT '' NOT NULL,
	"drive_file_name" text DEFAULT '' NOT NULL,
	"drive_url" text DEFAULT '' NOT NULL,
	"file_key" text,
	"file_url" text,
	"file_bytes" integer,
	"file_content_type" text,
	"transcript_markdown" text DEFAULT '' NOT NULL,
	"replaced_by_id" uuid,
	CONSTRAINT "open_data_documents_number" UNIQUE("owner","number"),
	CONSTRAINT "open_data_documents_slug" UNIQUE("owner","slug"),
	CONSTRAINT "open_data_documents_owner" CHECK ("open_data_documents"."owner" in ('tusc', 'tusu')),
	CONSTRAINT "open_data_documents_pages" CHECK ("open_data_documents"."pages" is null or "open_data_documents"."pages" >= 0)
);
--> statement-breakpoint
CREATE TABLE "open_data_funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"owner" "content_owner" DEFAULT 'tusc' NOT NULL,
	"number" integer NOT NULL,
	"type" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"annotation" text,
	CONSTRAINT "open_data_funds_number" UNIQUE("owner","number"),
	CONSTRAINT "open_data_funds_owner" CHECK ("open_data_funds"."owner" in ('tusc', 'tusu'))
);
--> statement-breakpoint
CREATE TABLE "open_data_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"owner" "content_owner" DEFAULT 'tusc' NOT NULL,
	"slug" text NOT NULL,
	"session_type" "open_data_session_type" NOT NULL,
	"session" integer NOT NULL,
	"meeting" integer NOT NULL,
	"title_th" text DEFAULT '' NOT NULL,
	"academic_year" integer NOT NULL,
	"meeting_date" date NOT NULL,
	"place" text,
	"chair" text,
	"seats" integer,
	"present" integer,
	"on_leave" integer,
	"absent" integer,
	"minutes_adopted_on" date,
	"minutes_document_id" uuid,
	"agenda_document_id" uuid,
	CONSTRAINT "open_data_meetings_slug" UNIQUE("owner","slug"),
	CONSTRAINT "open_data_meetings_natural" UNIQUE("owner","session_type","session","meeting"),
	CONSTRAINT "open_data_meetings_owner" CHECK ("open_data_meetings"."owner" in ('tusc', 'tusu'))
);
--> statement-breakpoint
CREATE TABLE "open_data_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"owner" "content_owner" DEFAULT 'tusc' NOT NULL,
	"person_id" uuid NOT NULL,
	"body_id" uuid NOT NULL,
	"role_th" text NOT NULL,
	"role_en" text,
	"from_date" date,
	"to_date" date,
	"source_document_id" uuid,
	"source_documents" text,
	"source_anchor" text,
	CONSTRAINT "open_data_memberships_natural" UNIQUE NULLS NOT DISTINCT("person_id","body_id","role_th","from_date"),
	CONSTRAINT "open_data_memberships_owner" CHECK ("open_data_memberships"."owner" in ('tusc', 'tusu'))
);
--> statement-breakpoint
CREATE TABLE "open_data_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"owner" "content_owner" DEFAULT 'tusc' NOT NULL,
	"name_th" text NOT NULL,
	"name_latin" text,
	"faculty" text,
	"party" text,
	CONSTRAINT "open_data_people_name" UNIQUE("owner","name_th"),
	CONSTRAINT "open_data_people_owner" CHECK ("open_data_people"."owner" in ('tusc', 'tusu'))
);
--> statement-breakpoint
CREATE TABLE "open_data_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"owner" "content_owner" DEFAULT 'tusc' NOT NULL,
	"report_document_id" uuid NOT NULL,
	"section" text NOT NULL,
	"text_th" text DEFAULT '' NOT NULL,
	"text_en" text DEFAULT '' NOT NULL,
	"addressed_to" text,
	"urgency" text,
	"response_status" text,
	"response_date" text,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "open_data_recommendations_natural" UNIQUE("report_document_id","section","text_en"),
	CONSTRAINT "open_data_recommendations_owner" CHECK ("open_data_recommendations"."owner" in ('tusc', 'tusu'))
);
--> statement-breakpoint
CREATE TABLE "open_data_survey_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"owner" "content_owner" DEFAULT 'tusc' NOT NULL,
	"report_document_id" uuid NOT NULL,
	"problem_th" text NOT NULL,
	"problem_en" text DEFAULT '' NOT NULL,
	"mentions" integer NOT NULL,
	CONSTRAINT "open_data_survey_results_natural" UNIQUE("report_document_id","problem_th"),
	CONSTRAINT "open_data_survey_results_owner" CHECK ("open_data_survey_results"."owner" in ('tusc', 'tusu')),
	CONSTRAINT "open_data_survey_results_mentions" CHECK ("open_data_survey_results"."mentions" >= 0)
);
--> statement-breakpoint
ALTER TABLE "open_data_bodies" ADD CONSTRAINT "open_data_bodies_parent_id_open_data_bodies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."open_data_bodies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_bodies" ADD CONSTRAINT "open_data_bodies_source_document_id_open_data_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."open_data_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_budget_lines" ADD CONSTRAINT "open_data_budget_lines_source_document_id_open_data_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."open_data_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_decisions" ADD CONSTRAINT "open_data_decisions_meeting_id_open_data_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."open_data_meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_documents" ADD CONSTRAINT "open_data_documents_replaced_by_id_open_data_documents_id_fk" FOREIGN KEY ("replaced_by_id") REFERENCES "public"."open_data_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_meetings" ADD CONSTRAINT "open_data_meetings_minutes_document_id_open_data_documents_id_fk" FOREIGN KEY ("minutes_document_id") REFERENCES "public"."open_data_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_meetings" ADD CONSTRAINT "open_data_meetings_agenda_document_id_open_data_documents_id_fk" FOREIGN KEY ("agenda_document_id") REFERENCES "public"."open_data_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_memberships" ADD CONSTRAINT "open_data_memberships_person_id_open_data_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."open_data_people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_memberships" ADD CONSTRAINT "open_data_memberships_body_id_open_data_bodies_id_fk" FOREIGN KEY ("body_id") REFERENCES "public"."open_data_bodies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_memberships" ADD CONSTRAINT "open_data_memberships_source_document_id_open_data_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."open_data_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_recommendations" ADD CONSTRAINT "open_data_recommendations_report_document_id_open_data_documents_id_fk" FOREIGN KEY ("report_document_id") REFERENCES "public"."open_data_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "open_data_survey_results" ADD CONSTRAINT "open_data_survey_results_report_document_id_open_data_documents_id_fk" FOREIGN KEY ("report_document_id") REFERENCES "public"."open_data_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "open_data_budget_lines_natural" ON "open_data_budget_lines" USING btree ("owner","fiscal_year","view","organisation","project","category");--> statement-breakpoint
CREATE INDEX "open_data_budget_lines_year_idx" ON "open_data_budget_lines" USING btree ("owner","fiscal_year","view");--> statement-breakpoint
CREATE INDEX "open_data_decisions_meeting_idx" ON "open_data_decisions" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "open_data_decisions_topic_idx" ON "open_data_decisions" USING btree ("owner","topic");--> statement-breakpoint
CREATE INDEX "open_data_documents_listing_idx" ON "open_data_documents" USING btree ("owner","status","number");--> statement-breakpoint
CREATE INDEX "open_data_documents_date_idx" ON "open_data_documents" USING btree ("date_iso");--> statement-breakpoint
CREATE INDEX "open_data_funds_type_idx" ON "open_data_funds" USING btree ("owner","type");--> statement-breakpoint
CREATE INDEX "open_data_meetings_date_idx" ON "open_data_meetings" USING btree ("owner","meeting_date");--> statement-breakpoint
CREATE INDEX "open_data_memberships_body_idx" ON "open_data_memberships" USING btree ("body_id");
CREATE TABLE "complaint_cases" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"category_id" uuid NOT NULL,
	"identity" text NOT NULL,
	"description_enc" text,
	"when_enc" text,
	"where_enc" text,
	"remedy_enc" text,
	"reopen_reason_enc" text,
	"acknowledge_due_at" timestamp with time zone NOT NULL,
	"resolve_due_at" timestamp with time zone NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"escalated_at" timestamp with time zone,
	"escalated_reason" text,
	"wellbeing_routed_at" timestamp with time zone,
	"reopen_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_cases_identity" CHECK ("complaint_cases"."identity" in ('named', 'pseudonymous', 'anonymous'))
);
--> statement-breakpoint
CREATE TABLE "complaint_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name_th" text NOT NULL,
	"name_en" text NOT NULL,
	"hint_th" text DEFAULT '' NOT NULL,
	"hint_en" text DEFAULT '' NOT NULL,
	"acknowledge_days" integer NOT NULL,
	"resolve_days" integer NOT NULL,
	"restricted" boolean DEFAULT false NOT NULL,
	"offer_wellbeing" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_categories_key_unique" UNIQUE("key"),
	CONSTRAINT "complaint_categories_key_format" CHECK ("complaint_categories"."key" ~ '^[a-z][a-z0-9-]{0,39}$'),
	CONSTRAINT "complaint_categories_targets" CHECK ("complaint_categories"."acknowledge_days" >= 1 and "complaint_categories"."resolve_days" >= "complaint_categories"."acknowledge_days" and "complaint_categories"."resolve_days" <= 365)
);
--> statement-breakpoint
CREATE TABLE "complaint_category_access" (
	"category_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_category_access_category_id_user_id_pk" PRIMARY KEY("category_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "complaint_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"attachment_id" uuid NOT NULL,
	"name_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_evidence_attachment_id_unique" UNIQUE("attachment_id")
);
--> statement-breakpoint
CREATE TABLE "complaint_journey_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"journey_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"name_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaint_journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"data_enc" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "complaint_journeys_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "complaint_surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"round" integer DEFAULT 0 NOT NULL,
	"score" smallint NOT NULL,
	"comment_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "complaint_surveys_case_round" UNIQUE("case_id","round"),
	CONSTRAINT "complaint_surveys_score" CHECK ("complaint_surveys"."score" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "complaint_cases" ADD CONSTRAINT "complaint_cases_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_cases" ADD CONSTRAINT "complaint_cases_category_id_complaint_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."complaint_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_category_access" ADD CONSTRAINT "complaint_category_access_category_id_complaint_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."complaint_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_category_access" ADD CONSTRAINT "complaint_category_access_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_category_access" ADD CONSTRAINT "complaint_category_access_granted_by_user_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_evidence" ADD CONSTRAINT "complaint_evidence_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_evidence" ADD CONSTRAINT "complaint_evidence_attachment_id_case_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."case_attachments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_journey_files" ADD CONSTRAINT "complaint_journey_files_journey_id_complaint_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."complaint_journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_surveys" ADD CONSTRAINT "complaint_surveys_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "complaint_surveys" ADD CONSTRAINT "complaint_surveys_category_id_complaint_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."complaint_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaint_cases_category_idx" ON "complaint_cases" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "complaint_cases_resolved_idx" ON "complaint_cases" USING btree ("resolved_at");--> statement-breakpoint
CREATE INDEX "complaint_category_access_user_idx" ON "complaint_category_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "complaint_evidence_case_idx" ON "complaint_evidence" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "complaint_journey_files_journey_idx" ON "complaint_journey_files" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "complaint_journeys_expires_idx" ON "complaint_journeys" USING btree ("expires_at");
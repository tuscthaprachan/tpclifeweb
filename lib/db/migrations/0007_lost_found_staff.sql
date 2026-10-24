CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "lost_found_case_details" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"storage_organisation_id" integer,
	"storage_shelf" text,
	"verification_detail_enc" text,
	"verification_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lost_found_case_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lost_case_id" uuid NOT NULL,
	"found_case_id" uuid NOT NULL,
	"status" text DEFAULT 'possible' NOT NULL,
	"score" integer,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lost_found_case_links_status" CHECK ("lost_found_case_links"."status" in ('possible', 'confirmed', 'dismissed'))
);
--> statement-breakpoint
CREATE TABLE "lost_found_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"lost_case_id" uuid,
	"claimant_contact_id" uuid,
	"answer_enc" text,
	"decision" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lost_found_claims_decision" CHECK ("lost_found_claims"."decision" is null or "lost_found_claims"."decision" in ('accepted', 'rejected'))
);
--> statement-breakpoint
CREATE TABLE "lost_found_handovers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"lost_case_id" uuid,
	"collected_by_contact_id" uuid,
	"id_check_type" text NOT NULL,
	"collected_at" timestamp with time zone NOT NULL,
	"desk_organisation_id" integer NOT NULL,
	"officer_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lost_found_handovers_case_id_unique" UNIQUE("case_id"),
	CONSTRAINT "lost_found_handovers_id_check" CHECK ("lost_found_handovers"."id_check_type" in ('student_card', 'national_id', 'passport', 'driving_licence', 'other_photo_id'))
);
--> statement-breakpoint
ALTER TABLE "lost_found_case_details" ADD CONSTRAINT "lost_found_case_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_case_details" ADD CONSTRAINT "lost_found_case_details_storage_organisation_id_organisations_id_fk" FOREIGN KEY ("storage_organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_case_links" ADD CONSTRAINT "lost_found_case_links_lost_case_id_cases_id_fk" FOREIGN KEY ("lost_case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_case_links" ADD CONSTRAINT "lost_found_case_links_found_case_id_cases_id_fk" FOREIGN KEY ("found_case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_claims" ADD CONSTRAINT "lost_found_claims_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_claims" ADD CONSTRAINT "lost_found_claims_lost_case_id_cases_id_fk" FOREIGN KEY ("lost_case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_claims" ADD CONSTRAINT "lost_found_claims_claimant_contact_id_case_contacts_id_fk" FOREIGN KEY ("claimant_contact_id") REFERENCES "public"."case_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_handovers" ADD CONSTRAINT "lost_found_handovers_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_handovers" ADD CONSTRAINT "lost_found_handovers_lost_case_id_cases_id_fk" FOREIGN KEY ("lost_case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_handovers" ADD CONSTRAINT "lost_found_handovers_collected_by_contact_id_case_contacts_id_fk" FOREIGN KEY ("collected_by_contact_id") REFERENCES "public"."case_contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_handovers" ADD CONSTRAINT "lost_found_handovers_desk_organisation_id_organisations_id_fk" FOREIGN KEY ("desk_organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lost_found_case_links_pair_unique" ON "lost_found_case_links" USING btree ("lost_case_id","found_case_id");--> statement-breakpoint
CREATE INDEX "lost_found_case_links_found_idx" ON "lost_found_case_links" USING btree ("found_case_id");--> statement-breakpoint
CREATE INDEX "lost_found_claims_case_idx" ON "lost_found_claims" USING btree ("case_id");
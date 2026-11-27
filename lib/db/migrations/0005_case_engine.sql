CREATE TYPE "public"."case_event_visibility" AS ENUM('internal', 'public');--> statement-breakpoint
CREATE TYPE "public"."case_service" AS ENUM('lost_found', 'complaint');--> statement-breakpoint
CREATE TABLE "case_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "case_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"event_id" uuid,
	"storage_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"role" text NOT NULL,
	"name_enc" text,
	"email_enc" text,
	"phone_enc" text,
	"line_id_enc" text,
	"preferred_contact" text,
	"consent_contact" boolean DEFAULT false NOT NULL,
	"consent_share" boolean DEFAULT false NOT NULL,
	"consent_recorded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"type" text NOT NULL,
	"visibility" "case_event_visibility" DEFAULT 'internal' NOT NULL,
	"body" text,
	"body_th" text,
	"body_en" text,
	"from_status" text,
	"to_status" text,
	"actor_user_id" text,
	"acting_organisation_id" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service" "case_service" NOT NULL,
	"reference" text NOT NULL,
	"kind" text NOT NULL,
	"subtype" text,
	"status" text NOT NULL,
	"summary" text,
	"locale" text,
	"acting_organisation_id" integer,
	"owning_organisation_id" integer,
	"assigned_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"pii_delete_after" timestamp with time zone,
	"pii_deleted_at" timestamp with time zone,
	CONSTRAINT "cases_reference_unique" UNIQUE("reference"),
	CONSTRAINT "cases_reference_format" CHECK ("cases"."reference" ~ '^(LF|CP)-[0-9]{4}-[0-9]{4,}$'),
	CONSTRAINT "cases_reference_matches_service" CHECK (("cases"."service" = 'lost_found' and "cases"."reference" like 'LF-%') or ("cases"."service" = 'complaint' and "cases"."reference" like 'CP-%'))
);
--> statement-breakpoint
ALTER TABLE "case_access_tokens" ADD CONSTRAINT "case_access_tokens_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_attachments" ADD CONSTRAINT "case_attachments_event_id_case_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."case_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_contacts" ADD CONSTRAINT "case_contacts_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_acting_organisation_id_organisations_id_fk" FOREIGN KEY ("acting_organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_acting_organisation_id_organisations_id_fk" FOREIGN KEY ("acting_organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_owning_organisation_id_organisations_id_fk" FOREIGN KEY ("owning_organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_to_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_access_tokens_hash_unique" ON "case_access_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "case_access_tokens_case_idx" ON "case_access_tokens" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_attachments_case_idx" ON "case_attachments" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_contacts_case_idx" ON "case_contacts" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_events_case_idx" ON "case_events" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE INDEX "cases_inbox_idx" ON "cases" USING btree ("service","status","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "cases_assigned_idx" ON "cases" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "cases_pii_due_idx" ON "cases" USING btree ("pii_delete_after") WHERE "cases"."pii_deleted_at" is null and "cases"."pii_delete_after" is not null;
--> statement-breakpoint
-- case_events is append-only, like audit_log: corrections are new events.
CREATE FUNCTION case_events_reject_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'case_events is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER case_events_no_update_delete
BEFORE UPDATE OR DELETE ON case_events
FOR EACH ROW EXECUTE FUNCTION case_events_reject_mutation();
--> statement-breakpoint
CREATE TRIGGER case_events_no_truncate
BEFORE TRUNCATE ON case_events
FOR EACH STATEMENT EXECUTE FUNCTION case_events_reject_mutation();

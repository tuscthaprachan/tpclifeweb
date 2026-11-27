CREATE TABLE "lost_found_identifying_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"detail_enc" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lost_found_journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"journey" text NOT NULL,
	"data_enc" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "lost_found_journeys_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "lost_found_identifying_details" ADD CONSTRAINT "lost_found_identifying_details_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_identifying_details" ADD CONSTRAINT "lost_found_identifying_details_contact_id_case_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."case_contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lost_found_identifying_details_case_idx" ON "lost_found_identifying_details" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "lost_found_journeys_expires_idx" ON "lost_found_journeys" USING btree ("expires_at");
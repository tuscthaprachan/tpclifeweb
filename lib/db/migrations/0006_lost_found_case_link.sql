ALTER TABLE "lost_found_items" ADD COLUMN "case_id" uuid;--> statement-breakpoint
ALTER TABLE "lost_found_items" ADD CONSTRAINT "lost_found_items_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lost_found_case_idx" ON "lost_found_items" USING btree ("case_id");
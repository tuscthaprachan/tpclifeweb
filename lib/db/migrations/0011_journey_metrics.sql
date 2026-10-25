CREATE TABLE "journey_metrics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	CONSTRAINT "journey_metrics_kind" CHECK ("journey_metrics"."kind" in ('lost', 'found', 'claim', 'complaint'))
);
--> statement-breakpoint
CREATE INDEX "journey_metrics_kind_started_idx" ON "journey_metrics" USING btree ("kind","started_at");
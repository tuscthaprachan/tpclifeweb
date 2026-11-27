UPDATE "content_pages" SET "section" = CASE "kind" WHEN 'guide' THEN 'start'::"content_section" ELSE 'health'::"content_section" END WHERE "section" IS NULL;--> statement-breakpoint
ALTER TABLE "content_pages" DROP CONSTRAINT "content_pages_kind_slug";--> statement-breakpoint
DROP INDEX "content_pages_listing_idx";--> statement-breakpoint
ALTER TABLE "content_pages" ALTER COLUMN "section" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "content_pages_listing_idx" ON "content_pages" USING btree ("section","status","sort_order","title_en");--> statement-breakpoint
ALTER TABLE "content_pages" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "content_pages" ADD CONSTRAINT "content_pages_slug" UNIQUE("slug");--> statement-breakpoint
DROP TYPE "public"."content_page_kind";
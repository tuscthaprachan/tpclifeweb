CREATE TYPE "public"."content_section" AS ENUM('start', 'campus', 'study', 'health', 'money', 'help', 'say');--> statement-breakpoint
ALTER TABLE "content_pages" ADD COLUMN "section" "content_section";--> statement-breakpoint
ALTER TABLE "content_pages" ADD COLUMN "user_need" text DEFAULT '' NOT NULL;
CREATE TYPE "public"."alert_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TYPE "public"."alert_surface" AS ENUM('shuttle', 'campus', 'forms', 'sitewide');--> statement-breakpoint
CREATE TYPE "public"."dish_allergen" AS ENUM('peanut', 'treeNut', 'milk', 'egg', 'wheat', 'soy', 'sesame', 'fish', 'shellfish');--> statement-breakpoint
CREATE TYPE "public"."canteen_cuisine" AS ENUM('thaiRice', 'madeToOrder', 'noodles', 'isan', 'chickenRice', 'curryOverRice', 'muslim', 'international', 'drinks', 'desserts', 'fruit');--> statement-breakpoint
CREATE TYPE "public"."content_category" AS ENUM('transport', 'welfare', 'activity', 'governance');--> statement-breakpoint
CREATE TYPE "public"."content_page_kind" AS ENUM('welfare', 'guide');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."cooking_style" AS ENUM('stirFried', 'deepFried', 'boiled', 'grilled', 'steamed', 'salad', 'curry');--> statement-breakpoint
CREATE TYPE "public"."directory_organisation_type" AS ENUM('facultyCommittee', 'club', 'independentGroup', 'universityDivision', 'studentBody');--> statement-breakpoint
CREATE TYPE "public"."dish_course" AS ENUM('main', 'side', 'drink', 'dessert');--> statement-breakpoint
CREATE TYPE "public"."dish_type" AS ENUM('rice', 'noodles', 'soup', 'curryOverRice', 'madeToOrder', 'singlePlate', 'snack', 'drink', 'dessert');--> statement-breakpoint
CREATE TYPE "public"."floor_side" AS ENUM('north', 'south', 'east', 'west');--> statement-breakpoint
CREATE TYPE "public"."form_destination" AS ENUM('googleForm', 'externalSite', 'email', 'inPerson', 'line');--> statement-breakpoint
CREATE TYPE "public"."lost_found_category" AS ENUM('idCard', 'bankCard', 'keys', 'wallet', 'phone', 'laptop', 'bag', 'clothing', 'book', 'stationery', 'jewellery', 'eyewear', 'umbrella', 'waterBottle', 'other');--> statement-breakpoint
CREATE TYPE "public"."lost_found_kind" AS ENUM('lost', 'found');--> statement-breakpoint
CREATE TYPE "public"."lost_found_status" AS ENUM('open', 'matched', 'returned', 'unclaimed', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."map_shape" AS ENUM('rect', 'triangleBottomRight', 'triangleBottomLeft');--> statement-breakpoint
CREATE TYPE "public"."content_owner" AS ENUM('tusu', 'tusc', 'university', 'joint');--> statement-breakpoint
CREATE TYPE "public"."policy_status" AS ENUM('notStarted', 'inProgress', 'delivered', 'blocked', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."dish_protein" AS ENUM('pork', 'chicken', 'beef', 'seafood', 'fish', 'egg', 'tofu', 'none');--> statement-breakpoint
CREATE TYPE "public"."service_phase" AS ENUM('alpha', 'beta', 'live');--> statement-breakpoint
CREATE TYPE "public"."form_sign_in_type" AS ENUM('google', 'tuAccount', 'other');--> statement-breakpoint
CREATE TYPE "public"."dish_temperature" AS ENUM('hot', 'cold');--> statement-breakpoint
CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text,
	"width" integer,
	"height" integer,
	"alt_th" text DEFAULT '' NOT NULL,
	"alt_en" text DEFAULT '' NOT NULL,
	"is_decorative" boolean DEFAULT false NOT NULL,
	"caption_th" text,
	"caption_en" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "images_storage_key_unique" UNIQUE("storage_key"),
	CONSTRAINT "images_size_positive" CHECK (("images"."width" is null or "images"."width" > 0) and ("images"."height" is null or "images"."height" > 0))
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"singleton_key" text DEFAULT 'site' NOT NULL,
	"service_name_th" text DEFAULT '' NOT NULL,
	"service_name_en" text DEFAULT '' NOT NULL,
	"tagline_th" text DEFAULT '' NOT NULL,
	"tagline_en" text DEFAULT '' NOT NULL,
	"phase" "service_phase" DEFAULT 'alpha' NOT NULL,
	"phase_note_th" text,
	"phase_note_en" text,
	"primary_nav" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"footer_nav" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"help_contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"organisation_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK ("site_settings"."singleton_key" = 'site')
);
--> statement-breakpoint
CREATE TABLE "service_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"title_th" text DEFAULT '' NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"body_th" text DEFAULT '' NOT NULL,
	"body_en" text DEFAULT '' NOT NULL,
	"severity" "alert_severity" DEFAULT 'info' NOT NULL,
	"affects" "alert_surface"[] DEFAULT '{}' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"more_info_url" text,
	CONSTRAINT "service_alerts_window" CHECK ("service_alerts"."ends_at" is null or "service_alerts"."ends_at" >= "service_alerts"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "shuttle_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"name_th" text DEFAULT '' NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"description_th" text,
	"description_en" text,
	"days_of_week" smallint[] DEFAULT '{}' NOT NULL,
	"excluded_dates" date[] DEFAULT '{}' NOT NULL,
	"added_dates" date[] DEFAULT '{}' NOT NULL,
	"valid_from" date,
	"valid_until" date,
	"departures" text[] DEFAULT '{}' NOT NULL,
	"fare_th" text,
	"fare_en" text,
	"notes_th" text,
	"notes_en" text,
	"realtime_feed_url" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"source_note_th" text,
	"source_note_en" text,
	"last_verified" date,
	CONSTRAINT "shuttle_routes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shuttle_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name_th" text DEFAULT '' NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"offset_minutes" integer DEFAULT 0 NOT NULL,
	"note_th" text,
	"note_en" text,
	"lat" double precision,
	"lng" double precision,
	CONSTRAINT "shuttle_stops_route_position" UNIQUE("route_id","position")
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"title_th" text DEFAULT '' NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"purpose_th" text DEFAULT '' NOT NULL,
	"purpose_en" text DEFAULT '' NOT NULL,
	"description_th" jsonb,
	"description_en" jsonb,
	"category" "content_category" NOT NULL,
	"owner" "content_owner" NOT NULL,
	"audience_th" text,
	"audience_en" text,
	"prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"requires_sign_in" boolean DEFAULT false NOT NULL,
	"sign_in_type" "form_sign_in_type",
	"sign_in_note_th" text,
	"sign_in_note_en" text,
	"destination_type" "form_destination" NOT NULL,
	"destination_url" text,
	"estimated_minutes" integer,
	"turnaround_th" text,
	"turnaround_en" text,
	"deadline" date,
	"contact" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_priority" boolean DEFAULT false NOT NULL,
	"last_verified" date,
	CONSTRAINT "forms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "directory_organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"name_th" text DEFAULT '' NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"type" "directory_organisation_type" NOT NULL,
	"faculty_th" text,
	"faculty_en" text,
	"description_th" text,
	"description_en" text,
	"contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location_th" text,
	"location_en" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"organisation_id" integer,
	CONSTRAINT "directory_organisations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"name_th" text DEFAULT '' NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"building_th" text,
	"building_en" text,
	"description_th" text,
	"description_en" text,
	"category" "content_category" NOT NULL,
	"opening_hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"closure_note_th" text,
	"closure_note_en" text,
	"lat" double precision,
	"lng" double precision,
	"is_key_location" boolean DEFAULT false NOT NULL,
	CONSTRAINT "places_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"title_th" text DEFAULT '' NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"summary_th" text DEFAULT '' NOT NULL,
	"summary_en" text DEFAULT '' NOT NULL,
	"body_th" jsonb,
	"body_en" jsonb,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"location_th" text,
	"location_en" text,
	"place_id" uuid,
	"owner" "content_owner" NOT NULL,
	"category" "content_category",
	"cover_image_id" uuid,
	"related_form_id" uuid,
	"registration_url" text,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"cancellation_note_th" text,
	"cancellation_note_en" text,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "news_post_images" (
	"news_post_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "news_post_images_news_post_id_position_pk" PRIMARY KEY("news_post_id","position")
);
--> statement-breakpoint
CREATE TABLE "news_post_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"news_post_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label_th" text DEFAULT '' NOT NULL,
	"label_en" text DEFAULT '' NOT NULL,
	CONSTRAINT "news_post_tags_position" UNIQUE("news_post_id","position")
);
--> statement-breakpoint
CREATE TABLE "news_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"title_th" text DEFAULT '' NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"summary_th" text DEFAULT '' NOT NULL,
	"summary_en" text DEFAULT '' NOT NULL,
	"body_th" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"body_en" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"owner" "content_owner" NOT NULL,
	"category" "content_category",
	"cover_image_id" uuid,
	CONSTRAINT "news_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"title_th" text DEFAULT '' NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"summary_th" text DEFAULT '' NOT NULL,
	"summary_en" text DEFAULT '' NOT NULL,
	"detail_th" jsonb,
	"detail_en" jsonb,
	"owner" "content_owner" NOT NULL,
	"policy_area_th" text DEFAULT '' NOT NULL,
	"policy_area_en" text DEFAULT '' NOT NULL,
	"policy_status" "policy_status" DEFAULT 'notStarted' NOT NULL,
	"progress_percent" integer,
	"started_at" date,
	"target_date" date,
	"completed_at" date,
	"oversight_of_id" uuid,
	"evidence_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "policies_slug_unique" UNIQUE("slug"),
	CONSTRAINT "policies_progress_range" CHECK ("policies"."progress_percent" is null or ("policies"."progress_percent" between 0 and 100)),
	CONSTRAINT "policies_not_self_oversight" CHECK ("policies"."oversight_of_id" is null or "policies"."oversight_of_id" <> "policies"."id")
);
--> statement-breakpoint
CREATE TABLE "policy_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"date" date NOT NULL,
	"note_th" text DEFAULT '' NOT NULL,
	"note_en" text DEFAULT '' NOT NULL,
	"policy_status" "policy_status" NOT NULL,
	"author_th" text,
	"author_en" text,
	"evidence_url" text,
	CONSTRAINT "policy_updates_position" UNIQUE("policy_id","position")
);
--> statement-breakpoint
CREATE TABLE "content_page_forms" (
	"page_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "content_page_forms_page_id_form_id_pk" PRIMARY KEY("page_id","form_id")
);
--> statement-breakpoint
CREATE TABLE "content_page_related" (
	"page_id" uuid NOT NULL,
	"related_page_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "content_page_related_page_id_related_page_id_pk" PRIMARY KEY("page_id","related_page_id"),
	CONSTRAINT "content_page_related_not_self" CHECK ("content_page_related"."page_id" <> "content_page_related"."related_page_id")
);
--> statement-breakpoint
CREATE TABLE "content_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"kind" "content_page_kind" NOT NULL,
	"slug" text NOT NULL,
	"title_th" text DEFAULT '' NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"summary_th" text DEFAULT '' NOT NULL,
	"summary_en" text DEFAULT '' NOT NULL,
	"body_th" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"body_en" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"category" "content_category" NOT NULL,
	"related_links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_reviewed" date,
	"sort_order" integer,
	CONSTRAINT "content_pages_kind_slug" UNIQUE("kind","slug")
);
--> statement-breakpoint
CREATE TABLE "faq_forms" (
	"faq_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "faq_forms_faq_id_form_id_pk" PRIMARY KEY("faq_id","form_id")
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text,
	"question_th" text DEFAULT '' NOT NULL,
	"question_en" text DEFAULT '' NOT NULL,
	"answer_th" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"answer_en" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"category" "content_category" NOT NULL,
	"sort_order" integer,
	CONSTRAINT "faqs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lost_found_item_photos" (
	"item_id" uuid NOT NULL,
	"image_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "lost_found_item_photos_item_id_position_pk" PRIMARY KEY("item_id","position")
);
--> statement-breakpoint
CREATE TABLE "lost_found_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"reference" text NOT NULL,
	"slug" text NOT NULL,
	"kind" "lost_found_kind" NOT NULL,
	"title_th" text DEFAULT '' NOT NULL,
	"title_en" text DEFAULT '' NOT NULL,
	"description_th" text DEFAULT '' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"category" "lost_found_category" NOT NULL,
	"place_id" uuid,
	"location_note_th" text,
	"location_note_en" text,
	"occurred_on" date NOT NULL,
	"register_status" "lost_found_status" DEFAULT 'open' NOT NULL,
	"held_at_th" text,
	"held_at_en" text,
	"claim_by" date,
	"claim_contact" jsonb,
	"owner" "content_owner" NOT NULL,
	"resolved_at" timestamp with time zone,
	"submitted_by_student" boolean DEFAULT false NOT NULL,
	"submitter_contact" text,
	"staff_verification_detail" text,
	CONSTRAINT "lost_found_items_reference_unique" UNIQUE("reference"),
	CONSTRAINT "lost_found_items_slug_unique" UNIQUE("slug"),
	CONSTRAINT "lost_found_reference_format" CHECK ("lost_found_items"."reference" ~ '^LF-[0-9]{4}-[0-9]{4,}$')
);
--> statement-breakpoint
CREATE TABLE "reference_counters" (
	"prefix" text NOT NULL,
	"year" integer NOT NULL,
	"last_value" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "reference_counters_prefix_year_pk" PRIMARY KEY("prefix","year"),
	CONSTRAINT "reference_counters_nonneg" CHECK ("reference_counters"."last_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "canonical_dishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"name_th" text DEFAULT '' NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"aliases" text[] DEFAULT '{}' NOT NULL,
	"explainer_th" text,
	"explainer_en" text,
	"how_to_order" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "canonical_dishes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "canteen_dish_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dish_id" uuid NOT NULL,
	"price" integer NOT NULL,
	"checked_on" date NOT NULL,
	CONSTRAINT "canteen_dish_price_history_unique" UNIQUE("dish_id","checked_on"),
	CONSTRAINT "canteen_dish_price_history_nonneg" CHECK ("canteen_dish_price_history"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "canteen_dish_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dish_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label_th" text DEFAULT '' NOT NULL,
	"label_en" text DEFAULT '' NOT NULL,
	"delta" integer NOT NULL,
	CONSTRAINT "canteen_dish_variants_position" UNIQUE("dish_id","position"),
	CONSTRAINT "canteen_dish_variants_delta_nonneg" CHECK ("canteen_dish_variants"."delta" >= 0)
);
--> statement-breakpoint
CREATE TABLE "canteen_dishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"name_th" text DEFAULT '' NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"say_as" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"menu_number" text,
	"stall_id" uuid NOT NULL,
	"canonical_id" uuid,
	"price" integer NOT NULL,
	"type" "dish_type" NOT NULL,
	"course" "dish_course" NOT NULL,
	"protein" "dish_protein"[] DEFAULT '{}' NOT NULL,
	"contains" "dish_allergen"[] DEFAULT '{}' NOT NULL,
	"style" "cooking_style",
	"temperature" "dish_temperature" DEFAULT 'hot' NOT NULL,
	"wet" boolean DEFAULT false NOT NULL,
	"vegetarian" boolean DEFAULT false NOT NULL,
	"photo_id" uuid,
	"checked_on" date NOT NULL,
	"last_reviewed" date,
	CONSTRAINT "canteen_dishes_slug_unique" UNIQUE("slug"),
	CONSTRAINT "canteen_dishes_price_nonneg" CHECK ("canteen_dishes"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "canteen_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"singleton_key" text DEFAULT 'canteen' NOT NULL,
	"canteen_place_id" uuid,
	"grid_cols" integer NOT NULL,
	"grid_rows" integer NOT NULL,
	"entrances" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seating_zones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outline" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"landmarks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"river_side" "floor_side",
	CONSTRAINT "canteen_settings_singleton_key" UNIQUE("singleton_key"),
	CONSTRAINT "canteen_settings_singleton" CHECK ("canteen_settings"."singleton_key" = 'canteen'),
	CONSTRAINT "canteen_settings_grid" CHECK ("canteen_settings"."grid_cols" >= 1 and "canteen_settings"."grid_rows" >= 1)
);
--> statement-breakpoint
CREATE TABLE "canteen_stall_add_on_dishes" (
	"add_on_id" uuid NOT NULL,
	"dish_id" uuid NOT NULL,
	CONSTRAINT "canteen_stall_add_on_dishes_add_on_id_dish_id_pk" PRIMARY KEY("add_on_id","dish_id")
);
--> statement-breakpoint
CREATE TABLE "canteen_stall_add_ons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stall_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label_th" text DEFAULT '' NOT NULL,
	"label_en" text DEFAULT '' NOT NULL,
	"delta" integer NOT NULL,
	"courses" "dish_course"[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "canteen_stall_add_ons_position" UNIQUE("stall_id","position")
);
--> statement-breakpoint
CREATE TABLE "canteen_stalls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "content_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_by" text,
	"slug" text NOT NULL,
	"name_th" text DEFAULT '' NOT NULL,
	"name_en" text DEFAULT '' NOT NULL,
	"number" integer NOT NULL,
	"cuisine" "canteen_cuisine"[] DEFAULT '{}' NOT NULL,
	"halal" boolean DEFAULT false NOT NULL,
	"vegetarian_stall" boolean DEFAULT false NOT NULL,
	"hours" jsonb,
	"map_col" integer NOT NULL,
	"map_row" integer NOT NULL,
	"map_w" integer DEFAULT 1 NOT NULL,
	"map_h" integer DEFAULT 1 NOT NULL,
	"map_shape" "map_shape" DEFAULT 'rect' NOT NULL,
	"wayfinding_th" text,
	"wayfinding_en" text,
	"photo_id" uuid,
	CONSTRAINT "canteen_stalls_slug_unique" UNIQUE("slug"),
	CONSTRAINT "canteen_stalls_number_unique" UNIQUE("number"),
	CONSTRAINT "canteen_stalls_map_cell" CHECK ("canteen_stalls"."map_col" >= 0 and "canteen_stalls"."map_row" >= 0 and "canteen_stalls"."map_w" >= 1 and "canteen_stalls"."map_h" >= 1)
);
--> statement-breakpoint
CREATE TABLE "content_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"revision" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	CONSTRAINT "content_revisions_entity_number" UNIQUE("entity_type","entity_id","revision_number")
);
--> statement-breakpoint
ALTER TABLE "shuttle_stops" ADD CONSTRAINT "shuttle_stops_route_id_shuttle_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."shuttle_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "directory_organisations" ADD CONSTRAINT "directory_organisations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_cover_image_id_images_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_related_form_id_forms_id_fk" FOREIGN KEY ("related_form_id") REFERENCES "public"."forms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_post_images" ADD CONSTRAINT "news_post_images_news_post_id_news_posts_id_fk" FOREIGN KEY ("news_post_id") REFERENCES "public"."news_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_post_images" ADD CONSTRAINT "news_post_images_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_post_tags" ADD CONSTRAINT "news_post_tags_news_post_id_news_posts_id_fk" FOREIGN KEY ("news_post_id") REFERENCES "public"."news_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_cover_image_id_images_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_oversight_of_id_policies_id_fk" FOREIGN KEY ("oversight_of_id") REFERENCES "public"."policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_updates" ADD CONSTRAINT "policy_updates_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_page_forms" ADD CONSTRAINT "content_page_forms_page_id_content_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."content_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_page_forms" ADD CONSTRAINT "content_page_forms_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_page_related" ADD CONSTRAINT "content_page_related_page_id_content_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."content_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_page_related" ADD CONSTRAINT "content_page_related_related_page_id_content_pages_id_fk" FOREIGN KEY ("related_page_id") REFERENCES "public"."content_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_forms" ADD CONSTRAINT "faq_forms_faq_id_faqs_id_fk" FOREIGN KEY ("faq_id") REFERENCES "public"."faqs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faq_forms" ADD CONSTRAINT "faq_forms_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_item_photos" ADD CONSTRAINT "lost_found_item_photos_item_id_lost_found_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."lost_found_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_item_photos" ADD CONSTRAINT "lost_found_item_photos_image_id_images_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lost_found_items" ADD CONSTRAINT "lost_found_items_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_dish_price_history" ADD CONSTRAINT "canteen_dish_price_history_dish_id_canteen_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."canteen_dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_dish_variants" ADD CONSTRAINT "canteen_dish_variants_dish_id_canteen_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."canteen_dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_dishes" ADD CONSTRAINT "canteen_dishes_stall_id_canteen_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."canteen_stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_dishes" ADD CONSTRAINT "canteen_dishes_canonical_id_canonical_dishes_id_fk" FOREIGN KEY ("canonical_id") REFERENCES "public"."canonical_dishes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_dishes" ADD CONSTRAINT "canteen_dishes_photo_id_images_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_settings" ADD CONSTRAINT "canteen_settings_canteen_place_id_places_id_fk" FOREIGN KEY ("canteen_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_stall_add_on_dishes" ADD CONSTRAINT "canteen_stall_add_on_dishes_add_on_id_canteen_stall_add_ons_id_fk" FOREIGN KEY ("add_on_id") REFERENCES "public"."canteen_stall_add_ons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_stall_add_on_dishes" ADD CONSTRAINT "canteen_stall_add_on_dishes_dish_id_canteen_dishes_id_fk" FOREIGN KEY ("dish_id") REFERENCES "public"."canteen_dishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_stall_add_ons" ADD CONSTRAINT "canteen_stall_add_ons_stall_id_canteen_stalls_id_fk" FOREIGN KEY ("stall_id") REFERENCES "public"."canteen_stalls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canteen_stalls" ADD CONSTRAINT "canteen_stalls_photo_id_images_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."images"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "site_settings_singleton_idx" ON "site_settings" USING btree ("singleton_key");--> statement-breakpoint
CREATE INDEX "service_alerts_active_idx" ON "service_alerts" USING btree ("status","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "shuttle_routes_active_idx" ON "shuttle_routes" USING btree ("status","is_active","name_en");--> statement-breakpoint
CREATE INDEX "forms_listing_idx" ON "forms" USING btree ("status","is_active","is_priority","title_en");--> statement-breakpoint
CREATE INDEX "directory_organisations_listing_idx" ON "directory_organisations" USING btree ("status","is_active","name_en");--> statement-breakpoint
CREATE INDEX "places_listing_idx" ON "places" USING btree ("status","name_en");--> statement-breakpoint
CREATE INDEX "places_key_location_idx" ON "places" USING btree ("name_en") WHERE "places"."is_key_location" and "places"."status" = 'published';--> statement-breakpoint
CREATE INDEX "events_upcoming_idx" ON "events" USING btree ("status",coalesce("ends_at", "starts_at"));--> statement-breakpoint
CREATE INDEX "events_starts_at_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "events_place_idx" ON "events" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "events_related_form_idx" ON "events" USING btree ("related_form_id");--> statement-breakpoint
CREATE INDEX "news_post_images_image_idx" ON "news_post_images" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "news_posts_listing_idx" ON "news_posts" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "policies_listing_idx" ON "policies" USING btree ("status","owner","title_en");--> statement-breakpoint
CREATE INDEX "policies_oversight_idx" ON "policies" USING btree ("oversight_of_id");--> statement-breakpoint
CREATE INDEX "policy_updates_policy_date_idx" ON "policy_updates" USING btree ("policy_id","date");--> statement-breakpoint
CREATE INDEX "content_page_forms_form_idx" ON "content_page_forms" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "content_page_related_target_idx" ON "content_page_related" USING btree ("related_page_id");--> statement-breakpoint
CREATE INDEX "content_pages_listing_idx" ON "content_pages" USING btree ("kind","status","sort_order","title_en");--> statement-breakpoint
CREATE INDEX "faq_forms_form_idx" ON "faq_forms" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "faqs_listing_idx" ON "faqs" USING btree ("status","sort_order");--> statement-breakpoint
CREATE INDEX "lost_found_item_photos_image_idx" ON "lost_found_item_photos" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "lost_found_listing_idx" ON "lost_found_items" USING btree ("status","register_status","occurred_on" DESC NULLS LAST,"published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "lost_found_kind_category_idx" ON "lost_found_items" USING btree ("kind","category");--> statement-breakpoint
CREATE INDEX "lost_found_place_idx" ON "lost_found_items" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "lost_found_pending_idx" ON "lost_found_items" USING btree ("created_at") WHERE "lost_found_items"."status" = 'draft';--> statement-breakpoint
CREATE INDEX "lost_found_reference_lower_idx" ON "lost_found_items" USING btree (lower("reference"));--> statement-breakpoint
CREATE INDEX "canonical_dishes_listing_idx" ON "canonical_dishes" USING btree ("status","name_en");--> statement-breakpoint
CREATE INDEX "canteen_dishes_stall_idx" ON "canteen_dishes" USING btree ("stall_id");--> statement-breakpoint
CREATE INDEX "canteen_dishes_canonical_idx" ON "canteen_dishes" USING btree ("canonical_id");--> statement-breakpoint
CREATE INDEX "canteen_dishes_listing_idx" ON "canteen_dishes" USING btree ("status","name_en");--> statement-breakpoint
CREATE INDEX "canteen_dishes_course_idx" ON "canteen_dishes" USING btree ("course");--> statement-breakpoint
CREATE INDEX "canteen_dishes_checked_on_idx" ON "canteen_dishes" USING btree ("checked_on");--> statement-breakpoint
CREATE INDEX "canteen_stall_add_on_dishes_dish_idx" ON "canteen_stall_add_on_dishes" USING btree ("dish_id");--> statement-breakpoint
CREATE INDEX "canteen_stalls_listing_idx" ON "canteen_stalls" USING btree ("status","number");--> statement-breakpoint
CREATE INDEX "content_revisions_entity_idx" ON "content_revisions" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE VIEW "public"."lost_found_public" AS (select "id", "reference", "slug", "kind", "title_th", "title_en", "description_th", "description_en", "category", "place_id", "location_note_th", "location_note_en", "occurred_on", "register_status", "held_at_th", "held_at_en", "claim_by", "claim_contact", "owner", "published_at", "resolved_at", "submitted_by_student", "created_at", "updated_at" from "lost_found_items" where "lost_found_items"."status" = 'published');
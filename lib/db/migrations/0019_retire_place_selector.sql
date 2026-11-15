UPDATE "lost_found_items" AS i SET "location_note_th" = NULLIF(p."name_th", ''), "location_note_en" = NULLIF(p."name_en", '') FROM "places" AS p WHERE i."place_id" = p."id" AND COALESCE(i."location_note_th", '') = '' AND COALESCE(i."location_note_en", '') = '';--> statement-breakpoint
UPDATE "lost_found_items" SET "place_id" = NULL WHERE "place_id" IS NOT NULL;--> statement-breakpoint
UPDATE "events" AS e SET "location_th" = NULLIF(p."name_th", ''), "location_en" = NULLIF(p."name_en", '') FROM "places" AS p WHERE e."place_id" = p."id" AND COALESCE(e."location_th", '') = '' AND COALESCE(e."location_en", '') = '';--> statement-breakpoint
UPDATE "events" SET "place_id" = NULL WHERE "place_id" IS NOT NULL;

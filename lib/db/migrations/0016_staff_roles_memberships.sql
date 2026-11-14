CREATE TABLE "staff_memberships" (
	"user_id" text NOT NULL,
	"organisation_id" integer NOT NULL,
	"added_by" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_memberships_user_id_organisation_id_pk" PRIMARY KEY("user_id","organisation_id")
);
--> statement-breakpoint
ALTER TABLE "staff_memberships" ADD CONSTRAINT "staff_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_memberships" ADD CONSTRAINT "staff_memberships_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_memberships" ADD CONSTRAINT "staff_memberships_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
INSERT INTO "staff_memberships" ("user_id", "organisation_id", "added_by", "added_at")
SELECT "user_id", "organisation_id", (array_agg("granted_by" ORDER BY "granted_at", "id"))[1], min("granted_at")
FROM "staff_roles"
WHERE "revoked_at" IS NULL
GROUP BY "user_id", "organisation_id";--> statement-breakpoint
DROP INDEX "staff_roles_active_unique";--> statement-breakpoint
ALTER TABLE "staff_roles" ALTER COLUMN "role" SET DATA TYPE text USING "role"::text;--> statement-breakpoint
ALTER TABLE "staff_invites" ALTER COLUMN "roles" SET DATA TYPE text[] USING "roles"::text[];--> statement-breakpoint
UPDATE "staff_roles" SET "role" = CASE "role"
	WHEN 'lf_officer' THEN 'officer'
	WHEN 'complaints_handler' THEN 'officer'
	WHEN 'unit_lead' THEN 'officer'
	WHEN 'equipment_officer' THEN 'officer'
	ELSE "role"
END;--> statement-breakpoint
UPDATE "staff_roles" AS r SET "revoked_at" = now()
WHERE r."revoked_at" IS NULL
AND EXISTS (
	SELECT 1 FROM "staff_roles" AS k
	WHERE k."user_id" = r."user_id" AND k."role" = r."role" AND k."revoked_at" IS NULL AND k."id" < r."id"
);--> statement-breakpoint
UPDATE "staff_invites" SET "roles" = ARRAY(
	SELECT DISTINCT CASE x
		WHEN 'lf_officer' THEN 'officer'
		WHEN 'complaints_handler' THEN 'officer'
		WHEN 'unit_lead' THEN 'officer'
		WHEN 'equipment_officer' THEN 'officer'
		ELSE x
	END AS mapped
	FROM unnest("roles") AS x
	ORDER BY mapped
);--> statement-breakpoint
DROP TYPE "public"."staff_role";--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('admin', 'editor', 'officer');--> statement-breakpoint
ALTER TABLE "staff_roles" ALTER COLUMN "role" SET DATA TYPE "public"."staff_role" USING "role"::"public"."staff_role";--> statement-breakpoint
ALTER TABLE "staff_invites" ALTER COLUMN "roles" SET DATA TYPE "public"."staff_role"[] USING "roles"::"public"."staff_role"[];--> statement-breakpoint
CREATE UNIQUE INDEX "staff_roles_active_unique" ON "staff_roles" USING btree ("user_id","role") WHERE "staff_roles"."revoked_at" is null;--> statement-breakpoint
ALTER TABLE "staff_invites" ADD COLUMN "organisation_ids" integer[];--> statement-breakpoint
UPDATE "staff_invites" SET "organisation_ids" = ARRAY["organisation_id"];--> statement-breakpoint
ALTER TABLE "staff_invites" ALTER COLUMN "organisation_ids" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_roles" DROP CONSTRAINT "staff_roles_organisation_id_organisations_id_fk";--> statement-breakpoint
ALTER TABLE "staff_invites" DROP CONSTRAINT "staff_invites_organisation_id_organisations_id_fk";--> statement-breakpoint
ALTER TABLE "staff_roles" DROP COLUMN "organisation_id";--> statement-breakpoint
ALTER TABLE "staff_invites" DROP COLUMN "organisation_id";

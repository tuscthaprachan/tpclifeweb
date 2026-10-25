import { createTestDb, makeUser } from "../db/harness";
import * as schema from "@/lib/db/schema";
import type { StaffRole } from "@/lib/db/schema/staff-roles";
import type { StaffActor } from "@/lib/cases";

export type TestCtx = Awaited<ReturnType<typeof createTestDb>>;

/** A fresh database and a helper that makes a staff user with roles granted in the database. */
export async function setup() {
  const ctx = await createTestDb();
  const orgs = await ctx.db.select().from(schema.organisations);
  const orgId = (slug: string) => orgs.find((o) => o.slug === slug)!.id;
  const admin = await makeUser(ctx.db, "Granter");

  async function staff(name: string, role: StaffRole, org: "tusu" | "tusc" = "tusu"): Promise<StaffActor> {
    const userId = await makeUser(ctx.db, name);
    const organisationId = orgId(org);
    await ctx.db.insert(schema.staffRoles).values({ userId, role, organisationId, grantedBy: admin });
    return { kind: "staff", userId, organisationId, roles: [{ role, organisationId }] };
  }
  return { ...ctx, orgId, staff };
}

export const KEY_A = Buffer.alloc(32, 1).toString("base64");
export const KEY_B = Buffer.alloc(32, 2).toString("base64");

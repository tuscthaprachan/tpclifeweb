import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { seedComplaintCategories } from "@/lib/db/seed/complaints";
import type { StaffActor } from "@/lib/cases";
import { createComplaint, type NewComplaint } from "@/lib/complaints/create";
import { grantCategoryAccess } from "@/lib/complaints/categories";
import { KEY_A, setup } from "../cases/helpers";

export const env = { PII_ENCRYPTION_KEY: KEY_A, NODE_ENV: "test" };
export const NOW = new Date("2026-03-09T05:00:00Z"); // a Monday in Bangkok

/** A seeded database with a few staff: two handlers (TUSU and TUSC), an admin, a lead, and a person named on the restricted categories. */
export async function setupComplaints() {
  const t = await setup();
  await seedComplaintCategories(t.db);
  const handler = await t.staff("Handler One", "complaints_handler", "tusu");
  const handler2 = await t.staff("Handler Two", "complaints_handler", "tusc");
  const lead = await t.staff("Lead", "unit_lead", "tusu");
  const admin = await t.staff("Admin", "admin", "tusu");
  const named = await t.staff("Named Handler", "complaints_handler", "tusc");
  const category = async (key: string) => (await t.db.select().from(schema.complaintCategories).where(eq(schema.complaintCategories.key, key)))[0]!;
  for (const key of ["harassment", "safety"]) await grantCategoryAccess(t.db, (await category(key)).id, named.userId, admin, { now: NOW });

  async function file(over: Partial<NewComplaint> & { key?: string } = {}) {
    const { key = "facilities", ...rest } = over;
    return createComplaint(
      t.db,
      {
        categoryId: (await category(key)).id,
        identity: "named",
        description: "The tap in room 301 has leaked for a week",
        when: "Last week",
        where: "Room 301",
        remedy: "Fix it",
        contact: { role: "reporter", name: "Somchai Tester", email: "somchai@example.com", preferredContact: "email", consentContact: true },
        locale: "en",
        ...rest,
      },
      { kind: "public" },
      { now: NOW, env },
    );
  }
  return { ...t, handler, handler2, lead, admin, named, category, file };
}

export type Ctx = Awaited<ReturnType<typeof setupComplaints>>;
export type { StaffActor };

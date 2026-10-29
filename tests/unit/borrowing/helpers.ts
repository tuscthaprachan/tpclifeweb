import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { seedEquipment } from "@/lib/db/seed/equipment";
import type { StaffActor } from "@/lib/cases";
import { createLoanRequest, type NewLoanRequest } from "@/lib/borrowing/create";
import { bangkokInstant } from "@/lib/borrowing/time";
import { KEY_A, setup } from "../cases/helpers";

export const env = { PII_ENCRYPTION_KEY: KEY_A, NODE_ENV: "test" };
/** Monday 9 March 2026, 12:00 in Bangkok. Three working days' notice reaches Thursday 12 March; seven reaches Wednesday 18 March. */
export const NOW = new Date("2026-03-09T05:00:00Z");
export const at = (day: string, time = "10:00") => bangkokInstant(day, time)!;

/** A seeded database with the equipment inventory and a few staff: an officer at TUSU, a lead and an admin. */
export async function setupBorrowing() {
  const t = await setup();
  await seedEquipment(t.db);
  const officer = await t.staff("Officer", "equipment_officer", "tusu");
  const lead = await t.staff("Lead", "unit_lead", "tusu");
  const admin = await t.staff("Admin", "admin", "tusu");
  const item = async (slug: string) => (await t.db.select().from(schema.equipmentItems).where(eq(schema.equipmentItems.slug, slug)))[0]!;

  async function request(over: Partial<NewLoanRequest> = {}) {
    const football = await item("football");
    return createLoanRequest(
      t.db,
      {
        borrowerKind: "group",
        groupName: "Law Faculty Sports Club",
        eventName: "Freshers football match",
        venue: "Main field",
        purpose: "A friendly match for first year students",
        collectAt: at("2026-03-12", "10:00"),
        returnDueAt: at("2026-03-13", "16:00"),
        lines: [{ itemId: football.id, quantity: 2 }],
        studentId: "6501234567",
        facultyId: null,
        affiliation: null,
        contact: { role: "borrower", name: "Somchai Tester", email: "somchai@example.com", phone: "0812345678", preferredContact: "email", consentContact: true },
        locale: "en",
        ...over,
      },
      { kind: "public" },
      { now: NOW, env },
    );
  }
  return { ...t, officer, lead, admin, item, request };
}

export type Ctx = Awaited<ReturnType<typeof setupBorrowing>>;
export type { StaffActor };

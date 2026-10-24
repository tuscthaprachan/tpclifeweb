import { eq } from "drizzle-orm";
import { caseEvents, cases, auditLog } from "@/lib/db/schema";
import { logFoundItem, logWalkInLostReport, publishFoundItem, type ItemDescription } from "@/lib/lost-found/intake";
import { saveStorageLocation, saveVerificationDetail } from "@/lib/lost-found/details";
import type { StaffActor } from "@/lib/cases";
import { setup } from "../cases/helpers";

export const NOW = new Date("2026-10-20T05:00:00Z");

export const KEYS: ItemDescription = {
  category: "keys",
  title: { th: "พวงกุญแจสีแดง", en: "Red keyring" },
  description: { th: "กุญแจสามดอก", en: "Three keys on a red keyring" },
  placeId: null,
  locationNote: { th: "หน้าห้องสมุด", en: "Outside the library" },
  occurredOn: "2026-10-18",
};

export async function lfSetup() {
  const ctx = await setup();
  const officer = await ctx.staff("Officer", "lf_officer", "tusu");
  const other = await ctx.staff("Other", "lf_officer", "tusc");
  const complaints = await ctx.staff("Handler", "complaints_handler", "tusu");

  /** A found item, fully prepared, optionally published. */
  async function foundItem(actor: StaffActor = officer, input: Partial<ItemDescription> = {}, opts: { publish?: boolean; detail?: string } = {}) {
    const logged = await logFoundItem(ctx.db, { ...KEYS, ...input }, actor, { now: NOW });
    await saveStorageLocation(ctx.db, logged.caseId, { organisationId: actor.organisationId, shelf: "Shelf B, box 3" }, actor, { now: NOW });
    await saveVerificationDetail(ctx.db, logged.caseId, opts.detail ?? "Blue bottle-opener charm", actor, { now: NOW });
    if (opts.publish) await publishFoundItem(ctx.db, logged.caseId, actor, { now: NOW });
    return logged;
  }

  /** A walk-in lost report with an email-reachable reporter. */
  async function lostReport(actor: StaffActor = officer, input: Partial<ItemDescription> = {}, contact: Partial<Parameters<typeof logWalkInLostReport>[1]["contact"]> = {}) {
    return logWalkInLostReport(
      ctx.db,
      {
        ...KEYS,
        occurredOn: "2026-10-17",
        ...input,
        locale: "en",
        contact: { name: "Somchai Jaidee", email: "somchai@example.test", phone: "0812345678", preferredContact: "email", consentContact: true, ...contact },
      },
      actor,
      { now: NOW },
    );
  }

  const statusOf = async (id: string) => (await ctx.db.select({ s: cases.status }).from(cases).where(eq(cases.id, id)))[0]!.s;
  const events = (id: string) => ctx.db.select().from(caseEvents).where(eq(caseEvents.caseId, id));
  const audits = (action: string) => ctx.db.select().from(auditLog).where(eq(auditLog.action, action));

  return { ...ctx, officer, other, complaints, foundItem, lostReport, statusOf, events, audits };
}

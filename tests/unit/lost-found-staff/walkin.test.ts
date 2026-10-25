import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { readContacts } from "@/lib/cases";
import { caseContacts, cases, lostFoundItems } from "@/lib/db/schema";
import { lfSetup } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

describe("a walk-in lost report", () => {
  it("opens a lost case for the person, with their contact encrypted and a draft listing", async () => {
    const lost = await t.lostReport(t.officer, {}, { name: "SECRET-NAME", email: "secret@example.test" });
    const [row] = await t.db.select().from(cases).where(eq(cases.id, lost.caseId));
    expect(row).toMatchObject({ kind: "lost", status: "submitted", locale: "en", actingOrganisationId: t.officer.organisationId });
    const contacts = await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, lost.caseId));
    expect(contacts).toHaveLength(1);
    expect(JSON.stringify(contacts)).not.toContain("SECRET-NAME");
    expect(JSON.stringify(contacts)).not.toContain("secret@example.test");
    expect(contacts[0]).toMatchObject({ role: "reporter", consentContact: true, preferredContact: "email" });

    const [listing] = await t.db.select().from(lostFoundItems).where(eq(lostFoundItems.caseId, lost.caseId));
    expect(listing).toMatchObject({ kind: "lost", status: "draft", submittedByStudent: true, reference: lost.reference });
    expect(listing!.submitterContact).toBeNull();
    expect(JSON.stringify(listing)).not.toContain("SECRET");

    const shown = await readContacts(t.db, lost.caseId, t.officer);
    expect(shown[0]).toMatchObject({ name: "SECRET-NAME", email: "secret@example.test" });
  });

  it("is refused for staff outside the service", async () => {
    await expect(t.lostReport(t.complaints)).rejects.toMatchObject({ code: "forbidden" });
  });
});

import { beforeAll, describe, expect, it, vi } from "vitest";
import { encryptPii } from "@/lib/crypto/pii";
import { caseContacts } from "@/lib/db/schema";
import { lostFoundIdentifyingDetails } from "@/lib/db/schema/lost-found-cases";
import { hasIdentifyingDetail, readIdentifyingDetail } from "@/lib/lost-found/identifying";
import { identifyingDetailAad } from "@/lib/lost-found/public/aad";
import { eq } from "drizzle-orm";
import { lfSetup } from "./helpers";

vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: vi.fn() }));

let t: Awaited<ReturnType<typeof lfSetup>>;
beforeAll(async () => {
  t = await lfSetup();
}, 60_000);

describe("the identifying detail on a lost report", () => {
  it("is shown to staff only through a logged read", async () => {
    const lost = await t.lostReport();
    const [contact] = await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, lost.caseId));
    const id = crypto.randomUUID();
    await t.db.insert(lostFoundIdentifyingDetails).values({ id, caseId: lost.caseId, contactId: contact!.id, detailEnc: encryptPii("SECRET-STICKER-ON-LID", identifyingDetailAad(id)) });

    expect(await hasIdentifyingDetail(t.db, lost.caseId)).toBe(true);
    expect((await t.events(lost.caseId)).some((e) => e.type === "verification_viewed")).toBe(false);
    expect(await readIdentifyingDetail(t.db, lost.caseId, t.officer)).toBe("SECRET-STICKER-ON-LID");
    const views = (await t.events(lost.caseId)).filter((e) => e.type === "verification_viewed");
    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({ actorUserId: t.officer.userId, metadata: { subject: "identifying_detail" } });
    expect(JSON.stringify(await t.audits("lost_found.identifying_view"))).not.toContain("SECRET-STICKER");
    await expect(readIdentifyingDetail(t.db, lost.caseId, t.complaints)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("reads null and logs nothing when there is none, and refuses a found item", async () => {
    const lost = await t.lostReport();
    expect(await readIdentifyingDetail(t.db, lost.caseId, t.officer)).toBeNull();
    expect((await t.events(lost.caseId)).some((e) => e.type === "verification_viewed")).toBe(false);
    const found = await t.foundItem();
    await expect(readIdentifyingDetail(t.db, found.caseId, t.officer)).rejects.toMatchObject({ code: "invalid" });
  });
});

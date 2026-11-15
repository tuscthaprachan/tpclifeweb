/** The shared journey store and the email-once claim. On PGlite with the real migrations. */
import { beforeAll, describe, expect, it } from "vitest";
import { complaintStore, loadJourney, startJourney, type JourneyData, type JourneyResult } from "@/lib/complaints/public/store";
import { emailResultOnce } from "@/lib/journeys/email";
import { createTestDb } from "../db/harness";
import { KEY_A } from "../cases/helpers";

const env = { PII_ENCRYPTION_KEY: KEY_A, NODE_ENV: "test" };
const NOW = new Date("2026-03-09T05:00:00Z");

let db: Awaited<ReturnType<typeof createTestDb>>["db"];
beforeAll(async () => {
  db = (await createTestDb()).db;
});

const result = (over: Partial<JourneyResult> = {}): JourneyResult => ({ reference: "CP-1", token: "t", email: "a@b.co", emailed: false, categoryKey: "facilities", identity: "named", ...over });

describe("update", () => {
  it("applies two concurrent updates one after the other, so both persist", async () => {
    const { id, token } = await startJourney(db, { locale: "en" }, { now: NOW, env });
    await Promise.all([
      complaintStore.update(db, id, (d: JourneyData) => ({ ...d, values: { ...d.values, description: "from tab one" } }), { now: NOW, env }),
      complaintStore.update(db, id, (d: JourneyData) => ({ ...d, values: { ...d.values, category: "facilities" } }), { now: NOW, env }),
      complaintStore.update(db, id, (d: JourneyData) => ({ ...d, values: { ...d.values, level: "university" } }), { now: NOW, env }),
    ]);
    const { values } = (await loadJourney(db, token, { now: NOW, env }))!.data;
    expect(values).toMatchObject({ description: "from tab one", category: "facilities", level: "university" });
  });

  it("does not let a page view clear a flash that a later post set", async () => {
    const { id, token } = await startJourney(db, { locale: "en" }, { now: NOW, env });
    const flash = { step: "describe", errors: { description: "cpErrDescription" as const } };
    await complaintStore.update(db, id, (d) => ({ ...d, flash }), { now: NOW, env });
    const viewed = await complaintStore.update(db, id, (d) => ({ ...d, flash: undefined }), { now: NOW, env });
    expect(viewed?.before.flash).toEqual(flash);
    await complaintStore.update(db, id, (d) => ({ ...d, flash }), { now: NOW, env });
    expect((await loadJourney(db, token, { now: NOW, env }))!.data.flash).toEqual(flash);
  });

  it("writes nothing when the same object comes back, and nothing for an expired or unknown journey", async () => {
    const { id } = await startJourney(db, { locale: "en" }, { now: NOW, env });
    const later = new Date(NOW.getTime() + 60_000);
    const same = await complaintStore.update(db, id, (d) => d, { now: later, env });
    expect(same?.data).toBe(same?.before);
    expect(await complaintStore.update(db, id, (d) => d, { now: new Date(NOW.getTime() + 3 * 60 * 60 * 1000), env })).toBeNull();
    expect(await complaintStore.update(db, crypto.randomUUID(), (d) => d, { now: NOW, env })).toBeNull();
  });
});

describe("emailResultOnce", () => {
  async function sent(over: Partial<JourneyResult> = {}) {
    const { id, token } = await startJourney(db, { locale: "en" }, { now: NOW, env });
    await complaintStore.update(db, id, (d) => ({ ...d, result: result(over) }), { now: NOW, env });
    return { id, token };
  }
  const opts = { now: NOW, env };

  it("sends once under two concurrent calls", async () => {
    const { id } = await sent();
    let sends = 0;
    const send = async () => {
      sends += 1;
      await new Promise((r) => setTimeout(r, 20));
      return true;
    };
    const outcomes = await Promise.all([emailResultOnce(complaintStore, db, id, send, opts), emailResultOnce(complaintStore, db, id, send, opts)]);
    expect(sends).toBe(1);
    expect([...outcomes].sort()).toEqual(["sent", "skipped"]);
    expect(await emailResultOnce(complaintStore, db, id, send, opts)).toBe("skipped");
  });

  it("releases the claim when sending fails, so it can be tried again", async () => {
    const { id, token } = await sent();
    expect(await emailResultOnce(complaintStore, db, id, async () => false, opts)).toBe("failed");
    expect((await loadJourney(db, token, opts))!.data.result?.emailed).toBe(false);
    expect(await emailResultOnce(complaintStore, db, id, async () => {
      throw new Error("down");
    }, opts)).toBe("failed");
    expect(await emailResultOnce(complaintStore, db, id, async () => true, opts)).toBe("sent");
    expect((await loadJourney(db, token, opts))!.data.result?.emailed).toBe(true);
  });

  it("skips a result with no address, no result, or that the service says may not be emailed", async () => {
    let sends = 0;
    const send = async () => {
      sends += 1;
      return true;
    };
    const none = await sent({ email: null });
    expect(await emailResultOnce(complaintStore, db, none.id, send, opts)).toBe("skipped");
    const anonymous = await sent({ identity: "anonymous" });
    expect(await emailResultOnce(complaintStore, db, anonymous.id, send, { ...opts, eligible: (r) => r.identity !== "anonymous" })).toBe("skipped");
    const { id } = await startJourney(db, { locale: "en" }, { now: NOW, env });
    expect(await emailResultOnce(complaintStore, db, id, send, opts)).toBe("skipped");
    expect(sends).toBe(0);
  });
});

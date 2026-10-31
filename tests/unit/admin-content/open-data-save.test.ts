import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, openDataDecisions, openDataDocuments, openDataMeetings } from "@/lib/db/schema";
import { createTestDb, makeUser } from "../db/harness";

const revalidateFor = vi.fn();
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: (...args: unknown[]) => revalidateFor(...args) }));

const { ContentConflictError, saveContent } = await import("@/lib/admin/content/save");

let db: Awaited<ReturnType<typeof createTestDb>>["db"];
let userId: string;
const actor = () => ({ userId, context: { actorUserId: userId } });
const doc = (extra: Record<string, unknown> = {}) => ({ owner: "tusc", number: "07", slug: "07-rules", type: "regulation", titleEn: "Rules", ...extra });

beforeAll(async () => {
  ({ db } = await createTestDb());
  userId = await makeUser(db);
});

beforeEach(async () => {
  revalidateFor.mockClear();
  await db.delete(openDataDecisions);
  await db.delete(openDataMeetings);
  await db.delete(openDataDocuments);
});

describe("saving open data through saveContent", () => {
  it("writes the audit entry and expires the document tags, keeping the transcript exactly", async () => {
    const transcript = "  # Title\n\n[not stated]\n  ";
    const { id } = await saveContent({ entityType: "openDataDocument", table: openDataDocuments, actor: actor(), db, status: "published", values: doc({ transcriptMarkdown: transcript }) });
    const [row] = await db.select().from(openDataDocuments).where(eq(openDataDocuments.id, id));
    expect(row).toMatchObject({ status: "published", owner: "tusc", transcriptMarkdown: transcript, createdBy: userId });
    const audits = await db.select().from(auditLog).where(eq(auditLog.entityId, id));
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "open_data_documents.create", actorUserId: userId });
    expect(revalidateFor).toHaveBeenCalledWith("openDataDocument", "07-rules");
  });

  it("refuses a repeated number or slug in the same body but allows it in the other", async () => {
    await saveContent({ entityType: "openDataDocument", table: openDataDocuments, actor: actor(), db, values: doc() });
    await expect(saveContent({ entityType: "openDataDocument", table: openDataDocuments, actor: actor(), db, values: doc({ slug: "other" }) })).rejects.toMatchObject({
      constraint: "open_data_documents_number",
    });
    await expect(saveContent({ entityType: "openDataDocument", table: openDataDocuments, actor: actor(), db, values: doc({ number: "08" }) })).rejects.toBeInstanceOf(ContentConflictError);
    await expect(saveContent({ entityType: "openDataDocument", table: openDataDocuments, actor: actor(), db, values: doc({ owner: "tusu" }) })).resolves.toMatchObject({ created: true });
  });

  it("saves a decision with its printed vote totals and expires the meeting tag", async () => {
    const meeting = await saveContent({
      entityType: "openDataMeeting",
      table: openDataMeetings,
      actor: actor(),
      db,
      status: "published",
      values: { owner: "tusc", slug: "ordinary-1-1", sessionType: "ordinary", session: 1, meeting: 1, academicYear: 2568, meetingDate: "2025-06-12" },
    });
    const saved = await saveContent({
      entityType: "openDataMeeting",
      table: openDataDecisions,
      actor: actor(),
      db,
      status: "published",
      values: { owner: "tusc", meetingId: meeting.id, ref: "D01", item: "1", topic: "Budget", type: "approval", outcome: "Passed", votesFor: "20", votesAgainst: "[not stated]" },
    });
    expect(saved.row).toMatchObject({ votesFor: "20", votesAgainst: "[not stated]", votesAbstain: null });
    expect(revalidateFor).toHaveBeenLastCalledWith("openDataMeeting");
  });
});

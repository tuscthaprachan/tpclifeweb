import { beforeAll, describe, expect, it } from "vitest";
import { searchConsole } from "@/lib/admin/search/search";
import type { StaffActor } from "@/lib/cases";
import { newsPosts } from "@/lib/db/schema";
import { setupComplaints, type Ctx } from "../complaints/helpers";

let t: Ctx;
let restricted: { caseId: string; reference: string };
let open: { caseId: string; reference: string };

beforeAll(async () => {
  t = await setupComplaints();
  restricted = await t.file({ key: "harassment" });
  open = await t.file({ key: "facilities" });
  await t.db.insert(newsPosts).values([
    { slug: "a", owner: "tusu", titleEn: "Exam timetable 100%", titleTh: "ตารางสอบ", status: "published" },
    { slug: "b", owner: "tusu", titleEn: "Library hours", status: "draft" },
  ]);
});

const search = (who: StaffActor, q: string) => searchConsole(t.db, { roles: who.roles, actor: who, q, locale: "en" });

describe("console search", () => {
  it("finds content by either language for an editor, escaping wildcards", async () => {
    const editor = { roles: [{ role: "editor" as const, organisationId: 1 }], actor: null, locale: "en" as const };
    const en = await searchConsole(t.db, { ...editor, q: "timetable" });
    expect(en.map((r) => r.href)).toHaveLength(1);
    expect(en[0]!.group).toContain("News");
    expect((await searchConsole(t.db, { ...editor, q: "ตารางสอบ" })).length).toBe(1);
    expect(await searchConsole(t.db, { ...editor, q: "100%" })).toHaveLength(1);
    expect(await searchConsole(t.db, { ...editor, q: "%%" })).toHaveLength(0);
    expect(await searchConsole(t.db, { ...editor, q: "a" })).toHaveLength(0);
  });

  it("returns no content to staff who cannot edit it", async () => {
    const results = await search(t.handler, "timetable");
    expect(results).toEqual([]);
  });

  it("lists cases a handler may see and hides restricted complaints", async () => {
    const mine = await search(t.handler, open.reference);
    expect(mine.map((r) => r.title)).toEqual([open.reference]);
    expect(await search(t.handler, restricted.reference)).toEqual([]);
  });

  it("shows a restricted complaint to the staff named on its category", async () => {
    const hit = await search(t.named, restricted.reference);
    expect(hit.map((r) => r.title)).toEqual([restricted.reference]);
    expect(hit[0]!.href).toBe(`/admin/cases/${restricted.caseId}`);
  });

  it("does not let an administrator who is not named see it", async () => {
    expect(await search(t.admin, restricted.reference)).toEqual([]);
  });
});

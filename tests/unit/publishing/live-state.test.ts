import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { liveState } from "@/lib/content/live-state";
import { liveStateSql, liveWindow } from "@/lib/content/window";
import { newsPosts, serviceAlerts } from "@/lib/db/schema";
import { createTestDb } from "../db/harness";

let db: Awaited<ReturnType<typeof createTestDb>>["db"];
beforeAll(async () => {
  ({ db } = await createTestDb());
});

const now = new Date("2026-06-10T12:00:00Z");
const at = (ms: number) => new Date(now.getTime() + ms);
const OFFSETS: (number | null)[] = [null, -3_600_000, -1, 0, 1, 3_600_000];

describe("liveState", () => {
  it("is draft, scheduled, live or expired, with an exclusive end and an inclusive start", () => {
    expect(liveState({ status: "draft", publishAt: null, unpublishAt: null }, now)).toBe("draft");
    expect(liveState({ status: "published", publishAt: at(1) }, now)).toBe("scheduled");
    expect(liveState({ status: "published", publishAt: at(0) }, now)).toBe("live");
    expect(liveState({ status: "published", unpublishAt: at(1) }, now)).toBe("live");
    expect(liveState({ status: "published", unpublishAt: at(0) }, now)).toBe("expired");
  });

  it("agrees with the SQL rule for every combination around the boundary", async () => {
    let n = 0;
    for (const status of ["draft", "published"] as const) {
      for (const start of OFFSETS) {
        for (const end of OFFSETS) {
          const publishAt = start === null ? null : at(start);
          const unpublishAt = end === null ? null : at(end);
          const [row] = await db
            .insert(newsPosts)
            .values({ slug: `p${n++}`, titleEn: "x", owner: "tusu", status, publishAt, unpublishAt })
            .returning({ id: newsPosts.id });
          const [state] = await db.select({ s: liveStateSql(newsPosts, now) }).from(newsPosts).where(sql`${newsPosts.id} = ${row!.id}`);
          const [window] = await db.select({ id: newsPosts.id }).from(newsPosts).where(sql`${newsPosts.id} = ${row!.id} and ${liveWindow(newsPosts, now)}`);
          const expected = liveState({ status, publishAt, unpublishAt }, now);
          expect(state!.s).toBe(expected);
          expect(Boolean(window)).toBe(expected === "live");
        }
      }
    }
  });

  it("ends a service alert exactly at its end", async () => {
    const base = { titleEn: "a", status: "published" as const, startsAt: at(-3_600_000) };
    await db.insert(serviceAlerts).values({ ...base, slug: "ends-now", endsAt: at(0) } as never);
    await db.insert(serviceAlerts).values({ ...base, slug: "ends-later", endsAt: at(1) } as never);
    const { alertWindow } = await import("@/lib/content/window");
    const rows = await db.select({ en: serviceAlerts.titleEn, ends: serviceAlerts.endsAt }).from(serviceAlerts).where(alertWindow(now));
    expect(rows.map((r) => r.ends?.getTime())).toEqual([at(1).getTime()]);
  });
});

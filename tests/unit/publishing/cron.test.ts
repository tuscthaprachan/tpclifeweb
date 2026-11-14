import { eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, events, faqs, forms, newsPosts } from "@/lib/db/schema";
import { createTestDb } from "../db/harness";

const revalidateFor = vi.fn();
vi.mock("@/lib/content/revalidate", () => ({ revalidateFor: (...args: unknown[]) => revalidateFor(...args) }));

const { runPublishingSweep } = await import("@/lib/publishing/sweep");
const { readEventBySlug } = await import("@/lib/content/events");
const { readFormBySlug } = await import("@/lib/content/forms");
const { readFaqs } = await import("@/lib/content/pages");

let db: Awaited<ReturnType<typeof createTestDb>>["db"];
const now = new Date("2026-06-10T12:00:00Z");
const hour = 3_600_000;
const at = (offset: number) => new Date(now.getTime() + offset * hour);

beforeAll(async () => {
  ({ db } = await createTestDb());
});
beforeEach(async () => {
  revalidateFor.mockClear();
  await db.delete(newsPosts);
});

const news = (slug: string, extra: Record<string, unknown> = {}) =>
  db.insert(newsPosts).values({ slug, titleEn: slug, owner: "tusu", status: "published", ...extra }).returning();

describe("runPublishingSweep", () => {
  it("records items that went live or came down once each, and expires their caches", async () => {
    const [live] = await news("live", { publishAt: at(-3) });
    const [down] = await news("down", { publishAt: at(-10), unpublishAt: at(-2) });
    await news("future", { publishAt: at(4) });
    await news("plain");

    expect(await runPublishingSweep(db, now)).toEqual({ wentLive: 2, cameDown: 1 });
    const mine = async () => (await db.select().from(auditLog)).filter((a) => [live!.id, down!.id].includes(a.entityId));
    const audits = await mine();
    expect(audits.map((a) => `${a.action}:${a.entityId}`).sort()).toEqual(
      [`news_posts.scheduled_live:${live!.id}`, `news_posts.scheduled_live:${down!.id}`, `news_posts.scheduled_down:${down!.id}`].sort(),
    );
    expect(audits.every((a) => a.actorUserId === null)).toBe(true);
    expect(revalidateFor).toHaveBeenCalledWith("newsPost", "live");
    expect(revalidateFor).toHaveBeenCalledWith("newsPost", "down");

    revalidateFor.mockClear();
    expect(await runPublishingSweep(db, now)).toEqual({ wentLive: 0, cameDown: 0 });
    expect(await mine()).toHaveLength(3);
    expect(revalidateFor).not.toHaveBeenCalled();
  });

  it("records a later transition on the next run, and ignores drafts", async () => {
    const [row] = await news("later", { publishAt: at(2) });
    await news("draft", { publishAt: at(-1), status: "draft" });
    expect(await runPublishingSweep(db, now)).toEqual({ wentLive: 0, cameDown: 0 });
    expect(await runPublishingSweep(db, at(3))).toEqual({ wentLive: 1, cameDown: 0 });
    expect((await db.select().from(auditLog).where(eq(auditLog.entityId, row!.id))).map((a) => a.action)).toEqual(["news_posts.scheduled_live"]);
  });
});

describe("windows on other types", () => {
  it("applies to events, forms and faqs", async () => {
    await db.insert(events).values({ slug: "ev", titleEn: "E", owner: "tusu", status: "published", startsAt: at(48), publishAt: at(1) });
    await db.insert(forms).values({ slug: "fm", titleEn: "F", owner: "tusu", status: "published", unpublishAt: at(-1), category: "welfare", destinationType: "inPerson" } as never);
    await db.insert(faqs).values({ questionEn: "Q?", category: "welfare", status: "published", publishAt: at(1) } as never);
    expect(await readEventBySlug(db, "ev", false, now)).toBeNull();
    expect(await readEventBySlug(db, "ev", false, at(2))).not.toBeNull();
    expect(await readFormBySlug(db, "fm", false, now)).toBeNull();
    expect(await readFaqs(db, now)).toHaveLength(0);
    expect(await readFaqs(db, at(2))).toHaveLength(1);
  });
});

describe("/api/cron/publishing", () => {
  const run = vi.fn(async () => ({ wentLive: 1, cameDown: 2 }));
  afterEach(() => {
    vi.unstubAllEnvs();
    run.mockClear();
  });
  async function call(auth?: string) {
    vi.resetModules();
    vi.doMock("@/lib/publishing/sweep", () => ({ runPublishingSweep: run }));
    vi.doMock("@/lib/db", () => ({ getDb: () => ({}) }));
    const { GET } = await import("@/app/api/cron/publishing/route");
    return GET(new Request("http://localhost/api/cron/publishing", { headers: auth ? { authorization: auth } : {} }));
  }

  it("is closed without CRON_SECRET, refuses a wrong token and runs with the right one", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect(run).not.toHaveBeenCalled();
    const ok = await call("Bearer s3cret-value");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ wentLive: 1, cameDown: 2 });
  });
});

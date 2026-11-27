import { afterAll, beforeAll, expect, it } from "vitest";
import { listImageChoices } from "@/lib/admin/content/images";
import { images } from "@/lib/db/schema";
import { createTestDb } from "./harness";

let ctx: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { ctx = await createTestDb(); }, 60_000);
afterAll(async () => { await ctx.client.close(); });

it("includes selected older images once without expanding the recent library", async () => {
  const inserted = await ctx.db.insert(images).values(Array.from({ length: 302 }, (_, index) => ({
    storageKey: `test/${index}.jpg`,
    isDecorative: true,
    createdAt: new Date(Date.UTC(2020, 0, 1, 0, 0, index)),
  }))).returning({ id: images.id });
  const oldest = inserted[0]!.id;
  const recent = inserted[301]!.id;
  const choices = await listImageChoices(ctx.db, [oldest, oldest, recent]);
  expect(choices).toHaveLength(301);
  expect(choices.filter((choice) => choice.id === oldest)).toHaveLength(1);
  expect(choices.filter((choice) => choice.id === recent)).toHaveLength(1);
  expect(choices.some((choice) => choice.id === inserted[1]!.id)).toBe(false);
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const next = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, ...next }));

import { CACHE_TAGS, TAGS_BY_TYPE, revalidateFor, type ContentEntityType } from "@/lib/content";

beforeEach(() => {
  next.revalidateTag.mockClear();
  next.revalidatePath.mockClear();
});

describe("revalidateFor", () => {
  it("invalidates each tag with stale-while-revalidate and returns them", () => {
    const tags = revalidateFor("newsPost");
    expect(tags).toEqual([CACHE_TAGS.news, CACHE_TAGS.searchIndex]);
    expect(next.revalidateTag.mock.calls).toEqual([
      [CACHE_TAGS.news, "max"],
      [CACHE_TAGS.searchIndex, "max"],
    ]);
    expect(next.revalidatePath).not.toHaveBeenCalled();
  });

  it("also refreshes both locales of the detail page when given a slug", () => {
    revalidateFor("event", "open-day");
    expect(next.revalidatePath.mock.calls.map((c) => c[0])).toEqual(["/th/events/open-day", "/en/events/open-day"]);
  });

  it("ignores a slug for kinds with no detail page", () => {
    revalidateFor("serviceAlert", "anything");
    expect(next.revalidatePath).not.toHaveBeenCalled();
    expect(next.revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.serviceAlert, "max");
  });

  it("maps each entity type to its cache tags", () => {
    const expected: Record<ContentEntityType, string[]> = {
      siteSettings: ["siteSettings"],
      serviceAlert: ["serviceAlert"],
      shuttleRoute: ["shuttle", "searchIndex"],
      form: ["form", "searchIndex"],
      newsPost: ["news", "searchIndex"],
      event: ["event", "searchIndex"],
      policy: ["policy", "searchIndex"],
      welfarePage: ["content", "searchIndex"],
      guidePage: ["content", "searchIndex"],
      faq: ["faq", "searchIndex"],
      organisation: ["directory", "searchIndex"],
      place: ["place", "canteen", "searchIndex"],
      lostFoundItem: ["lostFound", "searchIndex"],
      canteenSettings: ["canteen"],
      canteenStall: ["canteen", "searchIndex"],
      canteenDish: ["canteen", "searchIndex"],
      canonicalDish: ["canteen", "searchIndex"],
      image: ["image"],
    };
    expect(TAGS_BY_TYPE).toEqual(expected);
  });

  it("covers every tag the read layer uses", () => {
    const covered = new Set(Object.values(TAGS_BY_TYPE).flat());
    for (const tag of Object.values(CACHE_TAGS)) expect(covered, tag).toContain(tag);
  });
});

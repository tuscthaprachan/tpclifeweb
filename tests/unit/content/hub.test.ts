import { describe, expect, it } from "vitest";
import { hubItemKey, mergeHubItems } from "@/lib/content/hub";
import type { SectionEntry } from "@/lib/content/sections";
import type { ContentPage } from "@/lib/content/types";

const page = (slug: string, order?: number): ContentPage =>
  ({ _id: slug, _type: "topicPage", section: "study", slug: { current: slug }, order }) as unknown as ContentPage;

const entry = (path: string, order: number): SectionEntry => ({ path, order, label: { th: path, en: path }, description: { th: "", en: "" } });

const names = (items: ReturnType<typeof mergeHubItems>) => items.map((item) => (item.kind === "topic" ? item.page.slug.current : item.entry.path));

describe("mergeHubItems", () => {
  it("interleaves topic pages and entries by order", () => {
    const items = mergeHubItems({ entries: [entry("/forms", 15), entry("/places", 35)] }, [page("a", 10), page("b", 20), page("c", 40)]);
    expect(names(items)).toEqual(["a", "/forms", "b", "/places", "c"]);
  });

  it("puts pages with no order after everything that has one, keeping their arrival order", () => {
    const items = mergeHubItems({ entries: [entry("/forms", 90)] }, [page("late-b"), page("a", 10), page("late-a")]);
    expect(names(items)).toEqual(["a", "/forms", "late-b", "late-a"]);
  });

  it("lists a page before an entry that has the same order", () => {
    const items = mergeHubItems({ entries: [entry("/forms", 10)] }, [page("a", 10)]);
    expect(names(items)).toEqual(["a", "/forms"]);
  });

  it("lists only the entries when a section has no pages, and nothing when it has neither", () => {
    expect(names(mergeHubItems({ entries: [entry("/b", 2), entry("/a", 1)] }, []))).toEqual(["/a", "/b"]);
    expect(mergeHubItems({ entries: [] }, [])).toEqual([]);
  });

  it("gives every item its own key", () => {
    const items = mergeHubItems({ entries: [entry("/forms", 10)] }, [page("forms", 10)]);
    expect(new Set(items.map(hubItemKey)).size).toBe(2);
  });
});

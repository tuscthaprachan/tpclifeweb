import { describe, expect, it } from "vitest";
import { decodeSearchIndex, encodeSearchIndex } from "@/lib/search/wire";
import type { SearchRecord } from "@/lib/content/types";

const base: SearchRecord = {
  id: "1",
  type: "faq",
  path: { th: "/th/faq/a", en: "/en/faq/a" },
  title: { th: "ก", en: "A" },
  summary: { th: "ข", en: "B" },
  haystack: "ก A ข B extra words",
  weight: 10,
};

describe("search index wire format", () => {
  it.each<SearchRecord>([
    base,
    { ...base, haystack: "ก A ข B" },
    { ...base, haystack: "unrelated text" },
    { ...base, haystack: "" },
    { ...base, path: { th: "/th/x", en: "/en/y" } },
    { ...base, summary: { th: "", en: "" }, haystack: "ก A more", category: "governance" as SearchRecord["category"] },
  ])("round-trips %#", (record) => {
    const index = { generatedAt: "2026-01-01T00:00:00.000Z", records: [record] };
    expect(decodeSearchIndex(JSON.parse(JSON.stringify(encodeSearchIndex(index))))).toEqual(index);
  });

  it("drops the duplicated parts", () => {
    const [wire] = encodeSearchIndex({ generatedAt: "", records: [base] }).records;
    expect(wire).toMatchObject({ path: "/th/faq/a", rest: "extra words" });
    expect(wire).not.toHaveProperty("haystack");
  });
});

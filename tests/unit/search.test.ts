import { describe, expect, it } from "vitest";
import { tokenise, trigrams } from "@/lib/search/tokenise";
import { search } from "@/lib/search";
import type { SearchRecord } from "@/lib/content/types";

interface RecordOverrides {
  id: string;
  type: SearchRecord["type"];
  weight: number;
  path?: SearchRecord["path"];
  title?: SearchRecord["title"];
  summary?: SearchRecord["summary"];
  haystack?: string;
  category?: SearchRecord["category"];
  owner?: SearchRecord["owner"];
}

function record(overrides: RecordOverrides): SearchRecord {
  return {
    id: overrides.id,
    type: overrides.type,
    weight: overrides.weight,
    path: overrides.path ?? { th: `/th/x/${overrides.id}`, en: `/en/x/${overrides.id}` },
    title: overrides.title ?? { th: "", en: "" },
    summary: overrides.summary ?? { th: "", en: "" },
    haystack: overrides.haystack ?? "",
    category: overrides.category,
    owner: overrides.owner,
  };
}

/**
 * Temporarily removes `Intl.Segmenter` from the global so the code under
 * test takes its no-segmenter path, then restores it, even if the callback
 * throws. This is how the trigram fallback is exercised without depending
 * on the test runner's own ICU build lacking the feature.
 */
function withoutIntlSegmenter<T>(fn: () => T): T {
  const original = Intl.Segmenter;
  Object.defineProperty(Intl, "Segmenter", { value: undefined, configurable: true });
  try {
    return fn();
  } finally {
    Object.defineProperty(Intl, "Segmenter", { value: original, configurable: true });
  }
}

describe("tokenise: Thai word segmentation", () => {
  it("splits a real Thai compound into more than one word, not one unbroken blob", () => {
    const compound = "รถรับส่งท่าพระจันทร์";
    const { words } = tokenise(compound);

    expect(words.length).toBeGreaterThan(1);
    // Naive failure mode this guards against: the whole compound coming
    // back as a single token because nothing was actually segmented.
    expect(words).not.toEqual([compound]);
    // Every produced word is a genuine substring of the source, and none of
    // them is the whole thing.
    for (const word of words) {
      expect(compound.includes(word)).toBe(true);
      expect(word.length).toBeLessThan(compound.length);
    }
  });

  it("still produces trigrams for a Thai run even when word segmentation succeeded", () => {
    const { trigrams: grams } = tokenise("รถรับส่ง");
    expect(grams.length).toBeGreaterThan(0);
  });

  it("returns nothing for an empty or whitespace-only string", () => {
    expect(tokenise("")).toEqual({ words: [], trigrams: [] });
    expect(tokenise("   ")).toEqual({ words: [], trigrams: [] });
  });
});

describe("tokenise: trigram fallback when Intl.Segmenter is unavailable", () => {
  it("produces no word tokens for a Thai run, but still produces trigrams", () => {
    const compound = "รถรับส่งท่าพระจันทร์";

    const { words, trigrams: grams } = withoutIntlSegmenter(() => tokenise(compound));

    expect(words).toEqual([]);
    expect(grams.length).toBeGreaterThan(0);
    // Sliding window of 3 code points: char count minus 2.
    expect(grams.length).toBe(Array.from(compound).length - 2);
  });

  it("still tokenises Latin runs normally, since that path never depended on Intl.Segmenter", () => {
    const { words } = withoutIntlSegmenter(() => tokenise("Shuttle bus"));
    expect(words).toEqual(["shuttle", "bus"]);
  });

  it("degrades search rather than breaking it: a Thai query still finds a Thai record via trigrams alone", () => {
    const shuttle = record({
      id: "shuttle-1",
      type: "shuttleRoute",
      weight: 100,
      title: { th: "รถรับส่งท่าพระจันทร์", en: "Tha Prachan shuttle" },
      haystack: "รถรับส่งท่าพระจันทร์ Tha Prachan shuttle",
    });

    const results = withoutIntlSegmenter(() => search("รถรับส่ง", [shuttle]));

    expect(results).toHaveLength(1);
    expect(results[0]?.matchKind).toBe("trigram");
  });
});

describe("trigrams()", () => {
  it("keeps a run shorter than 3 characters as a single gram", () => {
    expect(trigrams("รถ")).toEqual(["รถ"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(trigrams("")).toEqual([]);
  });
});

describe("tokenise: English", () => {
  it("lowercases, splits on whitespace and punctuation, and lightly stems", () => {
    const { words } = tokenise("Search Forms and Buses!");
    expect(words).toEqual(["search", "form", "and", "bus"]);
  });

  it("splits a hyphenated code like TU-GET into separate lowercase tokens", () => {
    const { words } = tokenise("TU-GET");
    expect(words).toEqual(["tu", "get"]);
  });
});

describe("tokenise: mixed Thai and Latin in one string", () => {
  it("correctly separates an English code embedded in Thai text with no surrounding spaces", () => {
    const { words } = tokenise("สอบTU-GETวันนี้");
    expect(words).toContain("tu");
    expect(words).toContain("get");
    // The Thai runs either side still segment as Thai words, not swallowed
    // into the Latin run or vice versa.
    expect(words.some((w) => /[฀-๿]/.test(w))).toBe(true);
  });
});

describe("search: cross-language retrieval", () => {
  const shuttle = record({
    id: "shuttle-1",
    type: "shuttleRoute",
    weight: 100,
    category: "transport",
    title: { th: "รถรับส่งท่าพระจันทร์", en: "Tha Prachan shuttle" },
    summary: { th: "ตารางเวลารถรับส่ง", en: "Shuttle timetable" },
    haystack: "รถรับส่งท่าพระจันทร์ ตารางเวลารถรับส่ง Tha Prachan shuttle Shuttle timetable",
  });

  const form = record({
    id: "form-1",
    type: "form",
    weight: 100,
    title: { th: "แบบฟอร์มขอผ่อนผันค่าเทอม", en: "Tuition deferral form" },
    summary: { th: "ขอผ่อนผันการชำระค่าเทอม", en: "Request to defer tuition payment" },
    haystack:
      "แบบฟอร์มขอผ่อนผันค่าเทอม ขอผ่อนผันการชำระค่าเทอม Tuition deferral form Request to defer tuition payment",
  });

  it("finds the Thai shuttle record when the query is the English word 'shuttle'", () => {
    const results = search("shuttle", [shuttle, form]);
    expect(results.map((r) => r.record.id)).toContain("shuttle-1");
  });

  it("finds the same record the other way round: a Thai query finds it via the Thai title", () => {
    const results = search("รถรับส่ง", [shuttle, form]);
    expect(results.map((r) => r.record.id)).toContain("shuttle-1");
  });

  it("finds the Thai form record when the query is 'แบบฟอร์ม'", () => {
    const results = search("แบบฟอร์ม", [shuttle, form]);
    expect(results[0]?.record.id).toBe("form-1");
  });

  it("finds the same form record when the query is the English word 'form'", () => {
    const results = search("form", [shuttle, form]);
    expect(results.map((r) => r.record.id)).toContain("form-1");
  });
});

describe("search: ranking", () => {
  it("ranks a form above a news post for the same query and the same match tier", () => {
    const news = record({
      id: "news-1",
      type: "newsPost",
      weight: 20,
      title: { th: "ประกาศเรื่องทะเบียนนักศึกษา", en: "Student registration announcement" },
      haystack: "ประกาศเรื่องทะเบียนนักศึกษา Student registration announcement",
    });
    const form = record({
      id: "form-2",
      type: "form",
      weight: 100,
      title: { th: "ประกาศเรื่องทะเบียนนักศึกษา", en: "Student registration announcement" },
      haystack: "ประกาศเรื่องทะเบียนนักศึกษา Student registration announcement",
    });

    // Deliberately passed news-first, so a pass only from array order would
    // not accidentally satisfy the assertion below.
    const results = search("registration", [news, form]);

    expect(results[0]?.record.type).toBe("form");
    expect(results[0]?.record.id).toBe("form-2");
  });

  it("ranks a title match above a body-only match", () => {
    const titleHit = record({
      id: "title-hit",
      type: "guidePage",
      weight: 60,
      title: { th: "หอพักนักศึกษา", en: "Student dormitory guide" },
      haystack: "หอพักนักศึกษา Student dormitory guide",
    });
    const bodyHit = record({
      id: "body-hit",
      type: "guidePage",
      weight: 60,
      title: { th: "คู่มือทั่วไป", en: "General guide" },
      haystack: "คู่มือทั่วไป General guide, mentions the dormitory in passing near the end.",
    });

    const results = search("dormitory", [bodyHit, titleHit]);

    expect(results[0]?.record.id).toBe("title-hit");
    expect(results[0]?.matchField).toBe("title");
  });
});

describe("search: prefix matching", () => {
  it("matches a query that is a prefix of a longer stored word", () => {
    const welfare = record({
      id: "welfare-1",
      type: "welfarePage",
      weight: 60,
      title: { th: "สวัสดิการนักศึกษา", en: "Student welfare" },
      haystack: "สวัสดิการนักศึกษา Student welfare",
    });

    const results = search("wel", [welfare]);

    expect(results).toHaveLength(1);
    expect(results[0]?.matchKind).toBe("prefix");
  });

  it("prefers a whole-token match over a prefix match when both are available", () => {
    const exact = record({
      id: "exact",
      type: "form",
      weight: 50,
      title: { th: "ฟอร์ม", en: "Welfare" },
      haystack: "ฟอร์ม Welfare",
    });
    const prefixOnly = record({
      id: "prefix-only",
      type: "form",
      weight: 50,
      title: { th: "ฟอร์ม", en: "Welfareplus society notes" },
      haystack: "ฟอร์ม Welfareplus society notes",
    });

    const results = search("welfare", [prefixOnly, exact]);

    expect(results[0]?.record.id).toBe("exact");
    expect(results[0]?.matchKind).toBe("whole");
  });
});

describe("search: edge cases", () => {
  const anyRecord = record({
    id: "any",
    type: "form",
    weight: 50,
    title: { th: "แบบฟอร์ม", en: "A form" },
    haystack: "แบบฟอร์ม A form",
  });

  it("returns no results for an empty query", () => {
    expect(search("", [anyRecord])).toEqual([]);
  });

  it("returns no results for a whitespace-only query", () => {
    expect(search("   ", [anyRecord])).toEqual([]);
  });

  it("returns no results when nothing matches", () => {
    expect(search("xqzzynonexistent", [anyRecord])).toEqual([]);
  });

  it("respects the limit option", () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      record({
        id: `many-${i}`,
        type: "form",
        weight: 10,
        title: { th: "แบบฟอร์ม", en: "A form" },
        haystack: "แบบฟอร์ม A form",
      }),
    );

    expect(search("form", many, { limit: 2 })).toHaveLength(2);
  });
});

describe("search: mixed Thai and Latin query", () => {
  it("finds a record via a TU-GET style query embedded in Thai content", () => {
    const tuget = record({
      id: "tuget",
      type: "form",
      weight: 100,
      title: { th: "สมัครสอบ TU-GET", en: "TU-GET registration" },
      haystack: "สมัครสอบTU-GETวันนี้ TU-GET registration",
    });
    const unrelated = record({
      id: "unrelated",
      type: "newsPost",
      weight: 20,
      title: { th: "ข่าวทั่วไป", en: "General news" },
      haystack: "ข่าวทั่วไป General news",
    });

    const results = search("TU-GET", [unrelated, tuget]);

    expect(results.map((r) => r.record.id)).toContain("tuget");
    expect(results[0]?.record.id).toBe("tuget");
  });
});

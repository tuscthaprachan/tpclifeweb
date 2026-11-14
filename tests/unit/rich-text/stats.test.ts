import { describe, expect, it } from "vitest";
import { countWords, textStats } from "@/lib/rich-text/stats";

describe("text statistics", () => {
  it("counts English words, ignoring punctuation", () => {
    expect(countWords("Hello, world. It's 9 to 5!", "en")).toBe(6);
  });

  it("counts Thai words without spaces", () => {
    expect(countWords("สวัสดีครับ ยินดีต้อนรับ", "th")).toBeGreaterThanOrEqual(3);
    expect(countWords("นักศึกษาธรรมศาสตร์", "th")).toBeGreaterThanOrEqual(2);
  });

  it("is zero for blank text", () => {
    expect(textStats("   ", "en")).toEqual({ words: 0, characters: 0, minutes: 0 });
  });

  it("rounds reading time up to a whole minute", () => {
    expect(textStats("word ".repeat(10), "en").minutes).toBe(1);
    expect(textStats("word ".repeat(201), "en").minutes).toBe(2);
  });

  it("counts characters as code points", () => {
    expect(textStats("a😀ก", "en").characters).toBe(3);
  });
});

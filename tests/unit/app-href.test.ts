import { describe, expect, it } from "vitest";
import { localiseAppHref } from "@/components/ui/app-href";

describe("localiseAppHref", () => {
  it("adds the reader's language to a site path", () => {
    expect(localiseAppHref("/news/a", "en")).toBe("/en/news/a");
    expect(localiseAppHref("/", "th")).toBe("/th");
  });
  it("leaves a path that names a language and other links alone", () => {
    expect(localiseAppHref("/th/news/a", "en")).toBe("/th/news/a");
    expect(localiseAppHref("/en?x=1", "th")).toBe("/en?x=1");
    expect(localiseAppHref("https://example.com/news", "en")).toBe("https://example.com/news");
    expect(localiseAppHref("/api/theme", "en")).toBe("/api/theme");
    expect(localiseAppHref("/thai-food", "en")).toBe("/en/thai-food");
  });
});

import { describe, expect, it } from "vitest";
import { validateServicePagesForm } from "@/app/admin/content/service-pages/validate";
import { SERVICE_PAGE_KEYS, SERVICE_PAGES, listItems, mergeServiceText, type ServiceTextField } from "@/lib/content/service-pages";

/** The form as the console posts it untouched: every field prefilled with its default. */
function form(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  for (const page of SERVICE_PAGE_KEYS) {
    const fields: Record<string, ServiceTextField> = SERVICE_PAGES[page].fields;
    for (const [field, def] of Object.entries(fields)) {
      fd.set(`t.${page}.${field}.th`, def.fallback.th);
      fd.set(`t.${page}.${field}.en`, def.fallback.en);
    }
  }
  for (const [name, value] of Object.entries(overrides)) fd.set(name, value);
  return fd;
}

describe("validateServicePagesForm", () => {
  it("stores nothing when every field still matches its default", () => {
    const result = validateServicePagesForm({ locale: "en", formData: form() });
    expect(result).toEqual({ ok: true, data: { texts: {} } });
  });

  it("stores only the edited language, and treats a blank field as the default", () => {
    const result = validateServicePagesForm({
      locale: "en",
      formData: form({ "t.borrow.intro.en": "  Borrow a tent.  ", "t.complaints.intro.th": "", "t.complaints.intro.en": "" }),
    });
    expect(result).toEqual({ ok: true, data: { texts: { "borrow.intro": { en: "Borrow a tent." } } } });
  });

  it("tidies list fields to one trimmed item per line", () => {
    const result = validateServicePagesForm({ locale: "en", formData: form({ "t.lostReport.need.en": " A photo \n\n Where you lost it " }) });
    expect(result.ok && result.data.texts["lostReport.need"]).toEqual({ en: "A photo\nWhere you lost it" });
  });

  it("refuses an edit that drops a placeholder", () => {
    const result = validateServicePagesForm({ locale: "en", formData: form({ "t.borrow.rulesNote.en": "Borrow for up to {loan} days." }) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["t.borrow.rulesNote.en"]).toContain("{ahead}");
  });

  it("rejects text over the length limit", () => {
    const result = validateServicePagesForm({ locale: "en", formData: form({ "t.borrow.needHeading.en": "x".repeat(121) }) });
    expect(result.ok).toBe(false);
  });
});

describe("mergeServiceText", () => {
  it("uses the override per language and falls back to the default", () => {
    const t = mergeServiceText("borrow", { "borrow.intro": { en: "Borrow a tent." } });
    expect(t.intro).toEqual({ th: SERVICE_PAGES.borrow.fields.intro.fallback.th, en: "Borrow a tent." });
    expect(listItems(t.need.en)).toHaveLength(4);
  });
});

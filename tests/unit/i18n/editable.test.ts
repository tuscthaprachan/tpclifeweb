import { afterEach, describe, expect, it } from "vitest";
import { mergeSiteTextForm } from "@/app/admin/content/site-text/validate";
import { editableDictionaries, editableStrings, fillText, setTextOverrides, siteTextBootScript, textPlaceholders } from "@/lib/i18n/editable";
import { UI } from "@/lib/i18n/strings";

afterEach(() => setTextOverrides({}));

describe("editableStrings", () => {
  const T = editableStrings("test-dict", { hello: { th: "สวัสดี", en: "Hello" }, named: { th: "ชื่อ {name}", en: "Name {name}" } }, { th: "ทดสอบ", en: "Test" });

  it("reads the built-in text until an override arrives, per language", () => {
    expect(T.hello.en).toBe("Hello");
    setTextOverrides({ "test-dict.hello": { en: "Hi" } });
    expect(T.hello.en).toBe("Hi");
    expect(T.hello.th).toBe("สวัสดี");
    expect({ ...T.hello }).toEqual({ th: "สวัสดี", en: "Hi" });
    setTextOverrides({});
    expect(T.hello.en).toBe("Hello");
  });

  it("registers the dictionary with untouched defaults", () => {
    setTextOverrides({ "test-dict.hello": { en: "Hi" } });
    const dict = editableDictionaries().find((d) => d.namespace === "test-dict");
    expect(dict?.defaults.hello).toEqual({ th: "สวัสดี", en: "Hello" });
    expect(dict?.label.en).toBe("Test");
  });

  it("covers the shared UI dictionary", () => {
    const original = UI.home.en;
    setTextOverrides({ "ui.home": { en: "Start" } });
    expect(UI.home.en).toBe("Start");
    setTextOverrides({});
    expect(UI.home.en).toBe(original);
  });

  it("fills and lists placeholders", () => {
    expect(fillText(T.named.en, { name: "Ann" })).toBe("Name Ann");
    expect(fillText("{a} {b}", { a: 1 })).toBe("1 {b}");
    expect(textPlaceholders("{b} and {a} and {b}")).toEqual(["{a}", "{b}"]);
  });

  it("writes a boot script that cannot close its own tag", () => {
    expect(siteTextBootScript({ "ui.home": { en: "</script><b>" } })).not.toContain("</script>");
  });
});

describe("mergeSiteTextForm", () => {
  const defaults = new Map([
    ["ui.home", { th: "หน้าแรก", en: "Home" }],
    ["ui.count", { th: "{n} รายการ", en: "{n} items" }],
  ]);
  const form = (entries: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(entries)) fd.set(k, v);
    return fd;
  };

  it("stores edits, drops text that matches the default, and keeps strings not on screen", () => {
    const result = mergeSiteTextForm({
      locale: "en",
      existing: { "ui.other": { en: "Kept" }, "ui.count": { en: "{n} things" } },
      defaults: new Map([...defaults, ["ui.other", { th: "อื่น", en: "Other" }]]),
      formData: form({ "k.0": "ui.home", "v.0.th": "หน้าแรก", "v.0.en": " Start ", "k.1": "ui.count", "v.1.th": "", "v.1.en": "{n} items" }),
    });
    expect(result).toEqual({ ok: true, changed: 2, texts: { "ui.other": { en: "Kept" }, "ui.home": { en: "Start" } } });
  });

  it("refuses an edit that drops a placeholder", () => {
    const result = mergeSiteTextForm({ locale: "en", existing: {}, defaults, formData: form({ "k.0": "ui.count", "v.0.en": "Some items" }) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors["v.0.en"]).toContain("{n}");
  });

  it("ignores keys it does not know", () => {
    const result = mergeSiteTextForm({ locale: "en", existing: {}, defaults, formData: form({ "k.0": "ui.nope", "v.0.en": "x" }) });
    expect(result).toEqual({ ok: true, changed: 0, texts: {} });
  });
});

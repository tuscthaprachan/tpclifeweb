import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatBangkokDateTime, isCalendarDate, parseBangkokDateTime } from "@/lib/admin/content/datetime";
import { fieldKit, formDataToObject, parseForm } from "@/lib/admin/content/fields";
import { fieldId, isUuid, resolveIntent } from "@/lib/admin/content/form-state";
import { slugify } from "@/lib/admin/content/slug";

const form = (entries: [string, string][]) => {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
};
const doc = (text: string) => JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe("formDataToObject", () => {
  it("nests dotted names and turns numeric keys into arrays, closing gaps", () => {
    const out = formDataToObject(
      form([
        ["title.th", "ก"],
        ["title.en", "a"],
        ["tags.0.th", "x"],
        ["tags.2.th", "z"],
        ["gallery", "g1"],
        ["gallery", "g2"],
        ["$ACTION_ID_abc", "x"],
      ]),
    );
    expect(out).toEqual({ title: { th: "ก", en: "a" }, tags: [{ th: "x" }, { th: "z" }], gallery: ["g1", "g2"] });
  });
});

describe("bilingual completeness", () => {
  const schema = (publishing: boolean, locale: "th" | "en" = "en") => {
    const k = fieldKit(locale, publishing);
    return z.object({
      title: k.bilingual("Title", { required: true, max: 10 }),
      note: k.bilingual("Note"),
    });
  };
  const parse = (publishing: boolean, entries: Record<string, string>, locale: "th" | "en" = "en") =>
    parseForm(schema(publishing, locale), formDataToObject(form(Object.entries(entries))));

  it("lets a draft be incomplete but not empty", () => {
    expect(parse(false, { "title.th": "ก", "title.en": "", "note.th": "x", "note.en": "" }).ok).toBe(true);
    const empty = parse(false, { "title.th": "", "title.en": "" });
    expect(empty).toEqual({ ok: false, errors: { "title.th": "Enter the title" } });
  });

  it("requires both languages once published", () => {
    expect(parse(true, { "title.th": "ก", "title.en": "a" }).ok).toBe(true);
    expect(parse(true, { "title.th": "ก", "title.en": "" })).toEqual({ ok: false, errors: { "title.en": "Enter the title in English" } });
    expect(parse(true, { "title.th": "", "title.en": "" })).toMatchObject({ ok: false, errors: { "title.th": "Enter the title in Thai", "title.en": "Enter the title in English" } });
  });

  it("treats an optional pair as both-or-neither when published", () => {
    const base = { "title.th": "ก", "title.en": "a" };
    expect(parse(true, { ...base, "note.th": "", "note.en": "" }).ok).toBe(true);
    expect(parse(true, { ...base, "note.th": "x", "note.en": "" })).toMatchObject({ ok: false, errors: { "note.en": "Enter the note in English" } });
  });

  it("trims, limits length and speaks Thai when asked", () => {
    const ok = parse(true, { "title.th": "  ก  ", "title.en": " a " });
    expect(ok).toMatchObject({ ok: true, data: { title: { th: "ก", en: "a" } } });
    expect(parse(true, { "title.th": "x".repeat(11), "title.en": "a" })).toMatchObject({ ok: false, errors: { "title.th": expect.stringContaining("10") } });
    expect(parse(true, { "title.th": "ก", "title.en": "" }, "th")).toMatchObject({ ok: false, errors: { "title.en": "กรอกTitleภาษาอังกฤษ" } });
  });
});

describe("other field helpers", () => {
  const k = fieldKit("en", true);
  const one = <T extends z.ZodType>(schema: T, value: unknown) => parseForm(z.object({ v: schema }), { v: value });

  it("reads datetime-local as Bangkok time", () => {
    expect(one(k.dateTime("Date"), "2026-10-23T14:30")).toMatchObject({ ok: true, data: { v: new Date("2026-10-23T07:30:00Z") } });
    expect(one(k.dateTime("Date"), "")).toMatchObject({ ok: true, data: { v: null } });
    expect(one(k.dateTime("Date"), "2026-02-31T10:00").ok).toBe(false);
    expect(one(k.dateTime("Date", { required: true }), "").ok).toBe(false);
    expect(parseBangkokDateTime("2026-01-01T00:30")?.toISOString()).toBe("2025-12-31T17:30:00.000Z");
    expect(formatBangkokDateTime(new Date("2025-12-31T17:30:00Z"))).toBe("2026-01-01T00:30");
    expect(formatBangkokDateTime(null)).toBe("");
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2028-02-29")).toBe(true);
  });

  it("accepts http(s) urls only, or nothing", () => {
    expect(one(k.url("Link"), "https://example.com/a")).toMatchObject({ ok: true, data: { v: "https://example.com/a" } });
    expect(one(k.url("Link"), "")).toMatchObject({ ok: true, data: { v: null } });
    for (const bad of ["javascript:alert(1)", "example.com", "ftp://x.org", "mailto:a@b.co"]) expect(one(k.url("Link"), bad).ok).toBe(false);
    expect(one(k.href("Link"), "/news").ok).toBe(true);
    expect(one(k.href("Link"), "mailto:a@b.co").ok).toBe(true);
    expect(one(k.href("Link"), "//evil.test").ok).toBe(false);
  });

  it("checks enums", () => {
    const owner = k.enumOf("Owner", ["tusu", "tusc"] as const);
    expect(one(owner, "tusu")).toMatchObject({ ok: true, data: { v: "tusu" } });
    expect(one(owner, "")).toEqual({ ok: false, errors: { v: "Select the owner" } });
    expect(one(owner, "other").ok).toBe(false);
    expect(one(k.enumOf("Owner", ["tusu"] as const, { required: false }), "")).toMatchObject({ ok: true, data: { v: null } });
  });

  it("checks slugs", () => {
    for (const good of ["a", "freshers-week-2026", "x1"]) expect(one(k.slug("Slug"), good).ok).toBe(true);
    for (const bad of ["", "Upper", "two  words", "-lead", "trail-", "dou--ble", "ไทย", "a".repeat(81)]) expect(one(k.slug("Slug"), bad).ok).toBe(false);
    expect(slugify("Fresher's Week 2026!")).toBe("freshers-week-2026");
    expect(slugify("Café  menu / ไทย")).toBe("cafe-menu");
    expect(slugify("ไทยล้วน")).toBe("");
  });

  it("checks references and checkboxes", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    expect(one(k.reference("Place"), id)).toMatchObject({ ok: true, data: { v: id } });
    expect(one(k.reference("Place"), "")).toMatchObject({ ok: true, data: { v: null } });
    expect(one(k.reference("Place"), "nope").ok).toBe(false);
    expect(one(k.references("Images"), id)).toMatchObject({ ok: true, data: { v: [id] } });
    expect(one(k.references("Images"), [id, id])).toMatchObject({ ok: true, data: { v: [id] } });
    expect(one(k.references("Images"), undefined)).toMatchObject({ ok: true, data: { v: [] } });
    expect(one(k.references("Images"), ["x"]).ok).toBe(false);
    expect(one(k.checkbox(), "on")).toMatchObject({ data: { v: true } });
    expect(one(k.checkbox(), undefined)).toMatchObject({ data: { v: false } });
    expect(isUuid(id)).toBe(true);
    expect(isUuid("1")).toBe(false);
  });

  it("gates rich text through parseRichTextDoc", () => {
    expect(one(k.richText("Body"), doc("hi"))).toMatchObject({ ok: true });
    expect(one(k.richText("Body"), "")).toMatchObject({ ok: true, data: { v: { type: "doc", content: [] } } });
    expect(one(k.richText("Body", { required: true }), "")).toEqual({ ok: false, errors: { v: "Enter the body" } });
    expect(one(k.richText("Body"), "{not json")).toMatchObject({ ok: false, errors: { v: expect.stringContaining("cannot be saved") } });
    const script = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }] });
    expect(one(k.richText("Body"), script).ok).toBe(false);
    const unknown = JSON.stringify({ type: "doc", content: [{ type: "script" }] });
    expect(one(k.richText("Body"), unknown).ok).toBe(false);
  });

  it("applies the completeness rule to rich text pairs", () => {
    const pair = (publishing: boolean, th: string, en: string) =>
      parseForm(z.object({ body: fieldKit("en", publishing).bilingualRichText("Body", { required: true }) }), { body: { th, en } });
    expect(pair(false, doc("a"), "").ok).toBe(true);
    expect(pair(true, doc("a"), "")).toEqual({ ok: false, errors: { "body.en": "Enter the body in English" } });
    expect(pair(true, doc("a"), doc("b")).ok).toBe(true);
  });
});

describe("form state helpers", () => {
  it("builds ids that match the field path", () => {
    expect(fieldId("title.th")).toBe("f-title-th");
    expect(fieldId("tags.0.en")).toBe("f-tags-0-en");
  });

  it("works out what each button means", () => {
    const fd = (intent?: string) => form(intent ? [["intent", intent]] : []);
    expect(resolveIntent(fd("publish"), undefined)).toEqual({ intent: "publish", status: "published", publishing: true });
    expect(resolveIntent(fd("unpublish"), "published")).toEqual({ intent: "unpublish", status: "draft", publishing: false });
    expect(resolveIntent(fd("save"), undefined)).toEqual({ intent: "save", publishing: false });
    expect(resolveIntent(fd("save"), "draft")).toEqual({ intent: "save", publishing: false });
    expect(resolveIntent(fd(), "published")).toEqual({ intent: "save", status: "published", publishing: true });
    expect(resolveIntent(fd("bogus"), "draft").intent).toBe("save");
  });
});

import { describe, expect, it } from "vitest";
import { validateImageForm } from "@/app/admin/content/images/validate";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
};
const validate = (fields: Record<string, string>, locale: "th" | "en" = "en") => validateImageForm({ locale, formData: form(fields) });

describe("validateImageForm", () => {
  it("accepts a description and a credit in both languages", () => {
    expect(validate({ "alt.th": "นักศึกษาหน้าตึก", "alt.en": "Students outside the building", "caption.th": "ภาพโดย ก", "caption.en": "Photo: K" })).toEqual({
      ok: true,
      data: { altTh: "นักศึกษาหน้าตึก", altEn: "Students outside the building", isDecorative: false, captionTh: "ภาพโดย ก", captionEn: "Photo: K" },
    });
  });

  it("stores an empty credit as null", () => {
    const result = validate({ "alt.th": "ก", "alt.en": "a", "caption.th": " ", "caption.en": "" });
    expect(result).toMatchObject({ ok: true, data: { captionTh: null, captionEn: null } });
  });

  it("needs the description in both languages unless the picture is decorative", () => {
    expect(validate({ "alt.th": "ก", "alt.en": "" })).toMatchObject({ ok: false, errors: { "alt.en": "Enter the description of the picture in English" } });
    expect(validate({ "alt.th": "", "alt.en": "" }, "th")).toMatchObject({ ok: false, errors: { "alt.th": expect.stringContaining("กรอก") } });
  });

  it("clears the description of a decorative picture", () => {
    expect(validate({ isDecorative: "on", "alt.th": "ก", "alt.en": "a" })).toMatchObject({
      ok: true,
      data: { altTh: "", altEn: "", isDecorative: true },
    });
    expect(validate({ isDecorative: "on" }).ok).toBe(true);
  });

  it("wants a credit in both languages or neither", () => {
    expect(validate({ "alt.th": "ก", "alt.en": "a", "caption.th": "ภาพโดย ก", "caption.en": "" })).toMatchObject({
      ok: false,
      errors: { "caption.en": expect.stringContaining("English") },
    });
  });

  it("rejects over-long text", () => {
    expect(validate({ "alt.th": "ก".repeat(301), "alt.en": "a" })).toMatchObject({ ok: false, errors: { "alt.th": expect.stringContaining("300") } });
  });
});

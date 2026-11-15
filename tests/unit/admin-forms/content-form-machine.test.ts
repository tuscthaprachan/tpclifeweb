import { describe, expect, it } from "vitest";
import { contentFormReducer, hasEditsInFlight, initialContentForm, isContentFormDirty, isContentFormSaving, type ContentFormState } from "@/components/admin/content/form/content-form-machine";

const saving = (editedDuring = false): ContentFormState => ({ status: "saving", intent: "publish", editedDuring });

describe("contentFormReducer", () => {
  it("edit dirties a clean form", () => {
    expect(contentFormReducer(initialContentForm, { type: "edit" })).toEqual({ status: "dirty" });
  });

  it("submit starts a save from clean, dirty and error", () => {
    for (const from of [{ status: "clean" }, { status: "dirty" }, { status: "error", intent: "save" }] as ContentFormState[]) {
      expect(contentFormReducer(from, { type: "submit", intent: "save" })).toEqual({ status: "saving", intent: "save", editedDuring: false });
    }
  });

  it("a second submit while saving is ignored", () => {
    const s = saving();
    expect(contentFormReducer(s, { type: "submit", intent: "save" })).toBe(s);
  });

  it("typing during a save is remembered", () => {
    expect(contentFormReducer(saving(), { type: "edit" })).toEqual(saving(true));
    expect(hasEditsInFlight(saving(true))).toBe(true);
    expect(hasEditsInFlight(saving())).toBe(false);
  });

  it("success cleans the form, unless it was edited during the save", () => {
    expect(contentFormReducer(saving(), { type: "succeeded" })).toEqual({ status: "clean" });
    expect(contentFormReducer(saving(true), { type: "succeeded" })).toEqual({ status: "dirty" });
  });

  it("failure keeps the form unsaved, and typing in the error state stays there", () => {
    const error = contentFormReducer(saving(true), { type: "failed" });
    expect(error).toEqual({ status: "error", intent: "publish" });
    expect(contentFormReducer(error, { type: "edit" })).toBe(error);
    expect(isContentFormDirty(error)).toBe(true);
  });

  it("results outside a save change nothing", () => {
    const clean = initialContentForm;
    expect(contentFormReducer(clean, { type: "succeeded" })).toBe(clean);
    expect(contentFormReducer(clean, { type: "failed" })).toBe(clean);
  });

  it("derives dirty and saving", () => {
    expect(isContentFormDirty(initialContentForm)).toBe(false);
    expect(isContentFormDirty(saving())).toBe(true);
    expect(isContentFormSaving(saving())).toBe(true);
    expect(isContentFormSaving({ status: "dirty" })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { formValues, withValues } from "@/app/admin/cases/lost-found/form-values";

const form = (entries: Array<[string, string | Blob]>) => {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
};

describe("formValues", () => {
  it("echoes the typed text fields", () => {
    expect(formValues(form([["title.en", "Red keyring"], ["shelf", "A2"]]))).toEqual({ "title.en": "Red keyring", shelf: "A2" });
  });
  it("leaves out files, the hidden case ids and secret-looking fields", () => {
    const fd = form([["caseId", "c"], ["org", "1"], ["file", new File(["x"], "a.png")], ["password", "p"], ["apiToken", "t"], ["clientSecret", "s"], ["shelf", "A2"]]);
    expect(formValues(fd)).toEqual({ shelf: "A2" });
  });
  it("keeps a ticked checkbox as posted and omits an unticked one", () => {
    expect(formValues(form([["contact.consentContact", "on"]]))).toEqual({ "contact.consentContact": "on" });
    expect(formValues(form([]))).toEqual({});
  });
  it("honours an extra omit list and keeps the first of a repeated name", () => {
    expect(formValues(form([["a", "1"], ["a", "2"], ["b", "3"]]), ["b"])).toEqual({ a: "1" });
  });
});

describe("withValues", () => {
  const fd = form([["shelf", "A2"]]);
  it("adds the values to a validation error and to a thrown-error message", () => {
    expect(withValues({ errors: { shelf: "x" } }, fd)).toEqual({ errors: { shelf: "x" }, values: { shelf: "A2" } });
    expect(withValues({ error: "boom" }, fd)).toEqual({ error: "boom", values: { shelf: "A2" } });
  });
  it("leaves a saved or empty result alone so a save still clears the fields", () => {
    const saved = { saved: "lfcSavedStorage" };
    expect(withValues(saved, fd)).toBe(saved);
    const empty = {};
    expect(withValues(empty, fd)).toBe(empty);
    const none = { errors: {} };
    expect(withValues(none, fd)).toBe(none);
  });
  it("does not overwrite values the action already set", () => {
    const state = { error: "e", values: { shelf: "keep" } };
    expect(withValues(state, fd)).toBe(state);
  });
});

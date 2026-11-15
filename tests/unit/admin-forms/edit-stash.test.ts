// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { formEntries, restoreEntries, stashEdits, takeEdits } from "@/components/admin/content/form/edit-stash";

describe("edit stash", () => {
  it("returns edits only to the form they belong to, and empties the slot", () => {
    stashEdits("a:1", [["x", "1"]]);
    expect(takeEdits("a:2")).toBeNull();
    expect(takeEdits("a:1")).toBeNull();
    stashEdits("a:1", [["x", "1"]]);
    expect(takeEdits("a:1")).toEqual([["x", "1"]]);
  });

  it("puts typed values back and skips fields that are gone", () => {
    document.body.innerHTML = `<form><input name="title" value="old"><textarea name="body">old</textarea><input type="checkbox" name="on" value="y" checked><input type="hidden" name="h" value="keep"></form>`;
    const form = document.querySelector("form")!;
    const changed = restoreEntries(form, [["title", "new"], ["body", "later"], ["gone", "x"], ["h", "other"]]);
    expect(changed).toBe(true);
    expect(formEntries(form)).toEqual([["title", "new"], ["body", "later"], ["h", "keep"]]);
  });
});

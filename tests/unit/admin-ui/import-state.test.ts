import { describe, expect, it } from "vitest";
import { IMPORT_IDLE, importValues, importView } from "@/app/admin/content/open-data/budget/import/import-state";
import { redirectValues } from "@/app/admin/settings/redirects/form-values";

const form = (entries: Record<string, string | Blob>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
};
const VALUES = { owner: "o1", sourceDocument: "B-12" };
const DONE = { kind: "budget" as const, created: 1, updated: 2, unchanged: 3, total: 6 };

describe("importValues", () => {
  it("reads owner and source document and never the file", () => {
    expect(importValues(form({ owner: "o1", sourceDocument: "B-12", file: new File(["a"], "a.csv") }))).toEqual(VALUES);
    expect(importValues(form({}))).toEqual({ owner: "", sourceDocument: "" });
  });
});

describe("importView", () => {
  it("keeps the typed fields on an error (the source document is not wiped)", () => {
    expect(importView({ status: "error", message: "Choose a file" }, VALUES)).toEqual({ status: "error", message: "Choose a file", values: VALUES });
  });
  it("keeps the typed fields on a failure", () => {
    expect(importView({ status: "failure", failure: { ok: false, reason: "source" } }, VALUES)).toEqual({ status: "failure", failure: { ok: false, reason: "source" }, values: VALUES });
  });
  it("clears the fields on success", () => {
    expect(importView({ status: "done", done: DONE }, VALUES)).toEqual({ status: "done", done: DONE });
  });
  it("starts idle", () => {
    expect(IMPORT_IDLE).toEqual({ status: "idle" });
  });
});

describe("redirectValues", () => {
  it("echoes the three fields as typed", () => {
    expect(redirectValues(form({ from: "/old", to: "/new", status: "308" }))).toEqual({ from: "/old", to: "/new", status: "308" });
    expect(redirectValues(form({}))).toEqual({ from: "", to: "", status: "" });
  });
});

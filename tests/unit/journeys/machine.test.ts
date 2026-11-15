import { describe, expect, it } from "vitest";
import { consumeFlash, defineJourney, recordAnswers, recordFlash } from "@/lib/journeys/machine";
import { emptyValues as complaintValues, facultyChoices, complaintJourney, type ComplaintRouteContext } from "@/lib/complaints/public/validate";
import type { DraftValues as ComplaintValues } from "@/lib/complaints/public/steps";
import { borrowJourney, emptyValues as borrowValues, type ValidationContext } from "@/lib/borrowing/public/validate";
import { emptyValues as lostValues, lostFoundJourney } from "@/lib/lost-found/public/validate";
import type { DraftValues as LostValues } from "@/lib/lost-found/public/steps";

const NOW = new Date("2026-03-09T05:00:00Z");

describe("route", () => {
  const journey = defineJourney<{ a: string }, Record<string, string>, null>({
    steps: () => ["a", "check"],
    validate: (step, v): Record<string, string> => (step === "a" && !v.a ? { a: "missing" } : {}),
    problems: () => null,
  });
  const draft = (over: { values?: { a: string }; result?: object } = {}) => ({ locale: "en" as const, values: { a: "x" }, ...over });

  it("answers each situation once", () => {
    expect(journey.route({ available: false, data: null, requested: "a" })).toEqual({ kind: "unavailable" });
    expect(journey.route({ available: true, data: null, requested: "a" })).toEqual({ kind: "expired" });
    expect(journey.route({ available: true, data: draft(), requested: "confirmation", ctx: null })).toEqual({ kind: "start" });
    expect(journey.route({ available: true, data: draft({ result: {} }), requested: "confirmation", ctx: null })).toEqual({ kind: "confirmation" });
    expect(journey.route({ available: true, data: draft({ result: {} }), requested: "a", ctx: null })).toEqual({ kind: "redirect", step: "confirmation", errors: {} });
    expect(journey.route({ available: true, data: draft(), requested: "check", ctx: null })).toEqual({ kind: "show", step: "check" });
  });

  it("explains the problem only when check was asked for", () => {
    const blank = draft({ values: { a: "" } });
    expect(journey.route({ available: true, data: blank, requested: "check", ctx: null })).toEqual({ kind: "redirect", step: "a", errors: { a: "missing" } });
  });
});

describe("flash", () => {
  const flash = { step: "a", errors: { f: "x" } };
  it("is consumed on its own page and dropped elsewhere", () => {
    const data = { flash, n: 1 };
    expect(consumeFlash(data, "a")).toEqual({ flash, data: { flash: undefined, n: 1 } });
    expect(consumeFlash(data, "b")).toEqual({ flash: undefined, data: { flash: undefined, n: 1 } });
  });
  it("returns the same object when there is none, so nothing is written", () => {
    const data: { n: number; flash?: { step: string } } = { n: 1 };
    expect(consumeFlash(data, "a").data).toBe(data);
    expect(recordFlash(data, undefined)).toBe(data);
  });
  it("ignores edits once a result exists", () => {
    const sent = { locale: "en" as const, values: { a: "1" }, result: { ok: true } };
    expect(recordAnswers(sent, { locale: "th", merge: () => ({ a: "2" }) })).toBe(sent);
    expect(recordFlash(sent, { step: "a", errors: {} } as never)).toBe(sent);
  });
});

describe("complaint journey", () => {
  const faculties = facultyChoices([
    { slug: "law", programmes: [{ _id: "p-llb" }] },
    { slug: "economics", programmes: [] },
  ]);
  const ctx: ComplaintRouteContext = { categoryKeys: ["facilities", "harassment"], faculties };
  const good = (over: Partial<ComplaintValues> = {}): ComplaintValues => ({ ...complaintValues(), emergency: "no", level: "university", identity: "named", category: "facilities", description: "Something happened", name: "Somchai", email: "a@b.co", consent: "yes", ...over });
  const data = (values: ComplaintValues) => ({ locale: "en" as const, values });
  const at = (values: ComplaintValues, requested: string) => complaintJourney.route({ available: true, data: data(values), requested, ctx });

  it("sends every earlier unanswered question back, not only the triage ones", () => {
    expect(at(good({ category: "" }), "describe")).toMatchObject({ kind: "redirect", step: "category" });
    expect(at(good({ description: "" }), "evidence")).toMatchObject({ kind: "redirect", step: "describe" });
    expect(at(good({ consent: "" }), "check")).toMatchObject({ kind: "redirect", step: "contact" });
    expect(at(good({ identity: "" }), "category")).toMatchObject({ kind: "redirect", step: "identity" });
    expect(at(good({ category: "" }), "check")).toEqual({ kind: "redirect", step: "category", errors: { category: "cpErrCategory" } });
    expect(at(good({ category: "" }), "describe")).toEqual({ kind: "redirect", step: "category", errors: {} });
  });

  it("shows pages on the route and ends other routes where they end", () => {
    expect(at(complaintValues(), "emergency")).toEqual({ kind: "show", step: "emergency" });
    expect(at(good(), "check")).toEqual({ kind: "show", step: "check" });
    expect(at(good({ identity: "anonymous", name: "", email: "", consent: "" }), "contact")).toMatchObject({ kind: "redirect", step: "check" });
    expect(at(good({ emergency: "yes" }), "level")).toMatchObject({ kind: "redirect", step: "urgent" });
    expect(at(good({ level: "course", faculty: "law", lecturer: "yes" }), "identity")).toMatchObject({ kind: "redirect", step: "signpost" });
    expect(at(good({ level: "faculty", faculty: "economics" }), "programme")).toMatchObject({ kind: "redirect", step: "signpost" });
    expect(at(good({ level: "faculty", faculty: "law" }), "signpost")).toMatchObject({ kind: "redirect", step: "programme" });
  });

  it("leads each saved answer to the next page", () => {
    const after = (values: ComplaintValues, step: string, fromCheck = false) => complaintJourney.afterSave(values, step, { fromCheck, ctx });
    expect(after(good(), "emergency")).toMatchObject({ step: "level" });
    expect(after(good({ level: "course" }), "level")).toMatchObject({ step: "faculty" });
    expect(after(good({ level: "faculty", faculty: "law" }), "faculty")).toMatchObject({ step: "programme" });
    expect(after(good({ level: "faculty", faculty: "economics" }), "faculty")).toMatchObject({ step: "signpost" });
    expect(after(good({ emergency: "yes" }), "emergency")).toMatchObject({ step: "urgent" });
    expect(after(good(), "evidence")).toMatchObject({ step: "contact" });
    expect(after(good({ identity: "anonymous", name: "", email: "", consent: "" }), "evidence")).toMatchObject({ step: "check" });
    expect(after(good(), "contact")).toMatchObject({ step: "check" });
  });

  it("returns to check from check, unless another page now needs an answer", () => {
    const after = (values: ComplaintValues, step: string) => complaintJourney.afterSave(values, step, { fromCheck: true, ctx });
    expect(after(good(), "describe")).toEqual({ step: "check", errors: {}, fromCheck: false });
    expect(after(good({ identity: "named", name: "", consent: "" }), "identity")).toMatchObject({ step: "contact", fromCheck: true });
    expect(after(good({ level: "course" }), "level")).toMatchObject({ step: "faculty", fromCheck: false });
  });

  it("knows the page before", () => {
    expect(complaintJourney.previous(good(), "emergency", ctx)).toBeNull();
    expect(complaintJourney.previous(good(), "check", ctx)).toBe("contact");
    expect(complaintJourney.previous(good({ identity: "anonymous" }), "check", ctx)).toBe("evidence");
  });
});

describe("borrowing journey", () => {
  const ctx: ValidationContext = { now: NOW, inventory: [], holds: [], faculties: [] };
  const data = { locale: "en" as const, values: borrowValues() };

  it("holds every page behind the dates, and says nothing about pages never filled in", () => {
    expect(borrowJourney.route({ available: true, data, requested: "dates", ctx })).toEqual({ kind: "show", step: "dates" });
    expect(borrowJourney.route({ available: true, data, requested: "quantities", ctx })).toEqual({ kind: "redirect", step: "dates", errors: {} });
    expect(borrowJourney.route({ available: true, data, requested: "check", ctx })).toEqual({ kind: "redirect", step: "dates", errors: {} });
    expect(borrowJourney.route({ available: true, data, requested: "confirmation", ctx })).toEqual({ kind: "start" });
  });

  it("runs the pages in order", () => {
    expect(borrowJourney.steps(data.values, ctx)).toEqual(["dates", "items", "quantities", "event", "group", "student", "details", "contact", "terms", "check"]);
    expect(borrowJourney.afterSave(data.values, "dates", { fromCheck: false, ctx }).step).toBe("items");
    expect(borrowJourney.afterSave(data.values, "terms", { fromCheck: false, ctx }).step).toBe("check");
    expect(borrowJourney.previous(data.values, "dates", ctx)).toBeNull();
    expect(borrowJourney.previous(data.values, "check", ctx)).toBe("terms");
  });
});

describe("lost and found journeys", () => {
  const good = (over: Partial<LostValues> = {}): LostValues => ({ ...lostValues(), category: "keys", title: "Keys", description: "A bunch of keys", placeId: "", locationNote: "Library", day: "2", month: "3", year: "2026", detail: "A red tag", whereNow: "left_there", proof: "A scratch", name: "S", phone: "0812345678", consent: "yes", ...over });
  const at = (kind: "lost" | "found" | "claim", values: LostValues, requested: string) => lostFoundJourney.route({ available: true, data: { locale: "en" as const, values }, requested, ctx: { kind, now: NOW } });

  it("sends every earlier unanswered question back", () => {
    expect(at("lost", lostValues(), "category")).toEqual({ kind: "show", step: "category" });
    expect(at("lost", lostValues(), "contact")).toMatchObject({ kind: "redirect", step: "category" });
    expect(at("lost", good({ title: "" }), "where")).toMatchObject({ kind: "redirect", step: "describe" });
    expect(at("found", good({ whereNow: "" }), "contact")).toMatchObject({ kind: "redirect", step: "now" });
    expect(at("claim", good({ proof: "" }), "contact")).toMatchObject({ kind: "redirect", step: "proof" });
    expect(at("lost", good({ detail: "" }), "check")).toEqual({ kind: "redirect", step: "detail", errors: { detail: "lfpErrDetail" } });
  });

  it("shows pages of this journey only", () => {
    expect(at("lost", good(), "check")).toEqual({ kind: "show", step: "check" });
    expect(at("claim", good(), "category")).toMatchObject({ kind: "redirect", step: "check" });
  });

  it("leads each saved answer to the next page of its journey", () => {
    const after = (kind: "lost" | "found" | "claim", step: string, fromCheck = false) => lostFoundJourney.afterSave(good(), step, { fromCheck, ctx: { kind, now: NOW } });
    expect(after("lost", "when").step).toBe("detail");
    expect(after("found", "when").step).toBe("now");
    expect(after("claim", "proof").step).toBe("contact");
    expect(after("lost", "contact").step).toBe("check");
    expect(after("lost", "describe", true)).toEqual({ step: "check", errors: {}, fromCheck: false });
    expect(lostFoundJourney.previous(good(), "check", { kind: "claim", now: NOW })).toBe("contact");
  });
});

import { describe, expect, it } from "vitest";
import { effectivePreferred, emptyValues, facultyChoices, firstProblem, hasProgrammes, misroute, readStepValues, validateStep } from "@/lib/complaints/public/validate";
import { nextStep, previousStep, reachesCase, signpostLevel, stepsFor } from "@/lib/complaints/public/steps";
import type { DraftValues } from "@/lib/complaints/public/steps";

const KEYS = ["facilities", "harassment"];
const good = (over: Partial<DraftValues> = {}): DraftValues => ({ ...emptyValues(), emergency: "no", level: "university", identity: "named", category: "facilities", description: "Something happened", name: "Somchai", email: "a@b.co", consent: "yes", ...over });

const FACULTIES = facultyChoices([
  { slug: "law", programmes: [{ _id: "p-llb" }] },
  { slug: "economics", programmes: [] },
]);

describe("steps", () => {
  it("skips the contact page when anonymous", () => {
    expect(stepsFor({ emergency: "no", level: "university", identity: "anonymous" })).not.toContain("contact");
    expect(stepsFor({ emergency: "no", level: "university", identity: "named" })).toContain("contact");
    expect(nextStep({ emergency: "no", level: "university", identity: "anonymous" }, "evidence")).toBe("check");
    expect(nextStep({ emergency: "no", level: "university", identity: "named" }, "evidence")).toBe("contact");
    expect(previousStep({ emergency: "no", level: "university", identity: "anonymous" }, "check")).toBe("evidence");
  });

  it("asks about danger first and ends at emergency help on yes", () => {
    expect(nextStep({}, "emergency")).toBe("level");
    expect(stepsFor({ emergency: "yes", level: "university" })).toEqual(["emergency", "urgent"]);
    expect(nextStep({ emergency: "yes" }, "emergency")).toBe("urgent");
    expect(nextStep({ emergency: "yes" }, "urgent")).toBeNull();
    expect(previousStep({ emergency: "yes" }, "urgent")).toBe("emergency");
    expect(previousStep({}, "emergency")).toBeNull();
  });

  it("sends a university or unsure issue on to the complaint questions", () => {
    for (const level of ["university", "unsure"]) {
      expect(nextStep({ emergency: "no", level }, "level")).toBe("identity");
      expect(previousStep({ emergency: "no", level }, "identity")).toBe("level");
      expect(reachesCase({ emergency: "no", level })).toBe(true);
    }
  });

  it("routes a course issue through faculty and lecturer to a signpost", () => {
    const v = { emergency: "no", level: "course" };
    expect(stepsFor(v)).toEqual(["emergency", "level", "faculty", "lecturer", "signpost"]);
    expect(nextStep(v, "level")).toBe("faculty");
    expect(nextStep(v, "faculty")).toBe("lecturer");
    expect(nextStep(v, "lecturer")).toBe("signpost");
    expect(previousStep(v, "signpost")).toBe("lecturer");
    expect(reachesCase(v)).toBe(false);
  });

  it("routes a faculty issue through the programme page only when the faculty has programme associations", () => {
    const v = { emergency: "no", level: "faculty" };
    expect(stepsFor(v, true)).toEqual(["emergency", "level", "faculty", "programme", "signpost"]);
    expect(nextStep(v, "faculty", true)).toBe("programme");
    expect(nextStep(v, "programme", true)).toBe("signpost");
    expect(stepsFor(v, false)).toEqual(["emergency", "level", "faculty", "signpost"]);
    expect(nextStep(v, "faculty", false)).toBe("signpost");
    expect(previousStep(v, "signpost", false)).toBe("faculty");
    expect(hasProgrammes(FACULTIES, "law")).toBe(true);
    expect(hasProgrammes(FACULTIES, "economics")).toBe(false);
    expect(hasProgrammes(FACULTIES, "")).toBe(false);
  });

  it("names what to count at an ending", () => {
    expect(signpostLevel("urgent", { level: "" })).toBe("emergency");
    expect(signpostLevel("signpost", { level: "course" })).toBe("course");
    expect(signpostLevel("signpost", { level: "faculty" })).toBe("faculty");
    expect(signpostLevel("identity", { level: "university" })).toBeNull();
    expect(signpostLevel("lecturer", { level: "course" })).toBeNull();
  });
});

describe("validation", () => {
  it("accepts a complete named complaint and one with only the required answers", () => {
    expect(firstProblem(good(), KEYS)).toBeNull();
    expect(firstProblem(good({ identity: "anonymous", name: "", email: "", consent: "" }), KEYS)).toBeNull();
  });
  it("needs an identity, a known category and a description", () => {
    expect(validateStep("identity", good({ identity: "" }), KEYS)).toEqual({ identity: "cpErrIdentity" });
    expect(validateStep("identity", good({ identity: "robot" }), KEYS)).toEqual({ identity: "cpErrIdentity" });
    expect(validateStep("category", good({ category: "nope" }), KEYS)).toEqual({ category: "cpErrCategory" });
    expect(validateStep("describe", good({ description: "" }), KEYS)).toEqual({ description: "cpErrDescription" });
    expect(validateStep("describe", good({ description: "ก".repeat(3001) }), KEYS)).toEqual({ description: "cpErrDescriptionLong" });
    expect(validateStep("describe", good({ description: "ก".repeat(3000) }), KEYS)).toEqual({});
  });
  it("when, where and remedy are optional but bounded", () => {
    expect(validateStep("when", good({ when: "", where: "" }), KEYS)).toEqual({});
    expect(validateStep("when", good({ when: "x".repeat(201) }), KEYS)).toEqual({ when: "cpErrWhenLong" });
    expect(validateStep("remedy", good({ remedy: "x".repeat(1001) }), KEYS)).toEqual({ remedy: "cpErrRemedyLong" });
  });
  it("contact: named needs a name, a way to reach and consent; pseudonymous needs no name", () => {
    expect(validateStep("contact", good({ name: "" }), KEYS)).toEqual({ name: "cpErrName" });
    expect(validateStep("contact", good({ email: "", phone: "", lineId: "" }), KEYS)).toEqual({ email: "cpErrContactMethod" });
    expect(validateStep("contact", good({ consent: "" }), KEYS)).toEqual({ consent: "cpErrConsent" });
    expect(validateStep("contact", good({ email: "nope" }), KEYS)).toEqual({ email: "cpErrEmail" });
    expect(validateStep("contact", good({ phone: "12" }), KEYS)).toEqual({ phone: "cpErrPhone" });
    expect(validateStep("contact", good({ lineId: "a b" }), KEYS)).toEqual({ lineId: "cpErrLine" });
    expect(validateStep("contact", good({ phone: "0812345678" }), KEYS)).toEqual({ preferred: "cpErrPreferred" });
    expect(validateStep("contact", good({ identity: "pseudonymous", name: "" }), KEYS)).toEqual({});
    expect(effectivePreferred(good())).toBe("email");
  });
  it("firstProblem reports the earliest page with a problem", () => {
    expect(firstProblem(good({ category: "", description: "" }), KEYS)?.step).toBe("category");
    expect(firstProblem(good({ consent: "" }), KEYS)?.step).toBe("contact");
  });
  it("reads and normalises form values", () => {
    const f = new FormData();
    f.set("description", "a\u0000b\r\nc   d");
    f.set("consent", "yes");
    expect(readStepValues("describe", f)).toEqual({ description: "a b\nc d" });
    expect(readStepValues("contact", f).consent).toBe("yes");
  });
});

describe("triage validation", () => {
  it("asks for an answer to each question, in GOV.UK style", () => {
    expect(validateStep("emergency", good({ emergency: "" }), KEYS)).toEqual({ emergency: "cpErrEmergency" });
    expect(validateStep("emergency", good({ emergency: "maybe" }), KEYS)).toEqual({ emergency: "cpErrEmergency" });
    expect(validateStep("emergency", good({ emergency: "yes" }), KEYS)).toEqual({});
    expect(validateStep("level", good({ level: "" }), KEYS)).toEqual({ level: "cpErrLevel" });
    expect(validateStep("level", good({ level: "planet" }), KEYS)).toEqual({ level: "cpErrLevel" });
    for (const level of ["course", "faculty", "university", "unsure"]) expect(validateStep("level", good({ level }), KEYS)).toEqual({});
    expect(validateStep("lecturer", good({ lecturer: "" }), KEYS)).toEqual({ lecturer: "cpErrLecturer" });
    for (const lecturer of ["yes", "harassment", "other"]) expect(validateStep("lecturer", good({ lecturer }), KEYS)).toEqual({});
  });

  it("accepts only a faculty on offer, and a programme of that faculty or none", () => {
    expect(validateStep("faculty", good({ faculty: "law" }), KEYS, FACULTIES)).toEqual({});
    expect(validateStep("faculty", good({ faculty: "narnia" }), KEYS, FACULTIES)).toEqual({ faculty: "cpErrFaculty" });
    expect(validateStep("faculty", good({ faculty: "" }), KEYS, FACULTIES)).toEqual({ faculty: "cpErrFaculty" });
    expect(validateStep("programme", good({ faculty: "law", programme: "p-llb" }), KEYS, FACULTIES)).toEqual({});
    expect(validateStep("programme", good({ faculty: "law", programme: "none" }), KEYS, FACULTIES)).toEqual({});
    expect(validateStep("programme", good({ faculty: "law", programme: "p-other" }), KEYS, FACULTIES)).toEqual({ programme: "cpErrProgramme" });
    expect(validateStep("programme", good({ faculty: "economics", programme: "p-llb" }), KEYS, FACULTIES)).toEqual({ programme: "cpErrProgramme" });
    expect(validateStep("programme", good({ faculty: "law", programme: "" }), KEYS, FACULTIES)).toEqual({ programme: "cpErrProgramme" });
  });

  it("reads the triage answers from a form", () => {
    const f = new FormData();
    f.set("emergency", " yes ");
    f.set("level", "course");
    f.set("faculty", "law");
    f.set("programme", "none");
    f.set("lecturer", "other");
    expect(readStepValues("emergency", f)).toEqual({ emergency: "yes" });
    expect(readStepValues("level", f)).toEqual({ level: "course" });
    expect(readStepValues("faculty", f)).toEqual({ faculty: "law" });
    expect(readStepValues("programme", f)).toEqual({ programme: "none" });
    expect(readStepValues("lecturer", f)).toEqual({ lecturer: "other" });
  });

  it("only lets a complaint be sent from a university level issue with no danger", () => {
    expect(firstProblem(good({ emergency: "" }), KEYS)?.step).toBe("emergency");
    expect(firstProblem(good({ level: "" }), KEYS)?.step).toBe("level");
    expect(firstProblem(good({ level: "unsure" }), KEYS)).toBeNull();
    expect(firstProblem(good({ emergency: "yes" }), KEYS)).toEqual({ step: "urgent", errors: {} });
    expect(firstProblem(good({ level: "course" }), KEYS)).toEqual({ step: "signpost", errors: {} });
    expect(firstProblem(good({ level: "faculty" }), KEYS)).toEqual({ step: "signpost", errors: {} });
  });

  it("keeps a person on their own route", () => {
    const e = emptyValues();
    expect(misroute("emergency", e, KEYS, FACULTIES)).toBeNull();
    expect(misroute("identity", e, KEYS, FACULTIES)).toBe("emergency");
    expect(misroute("level", { ...e, emergency: "no" }, KEYS, FACULTIES)).toBeNull();
    expect(misroute("identity", { ...e, emergency: "no" }, KEYS, FACULTIES)).toBe("level");
    expect(misroute("identity", good(), KEYS, FACULTIES)).toBeNull();
    // Off the route: a complaint page for a course issue goes to the end of the route, once its questions are answered.
    expect(misroute("identity", good({ level: "course" }), KEYS, FACULTIES)).toBe("faculty");
    expect(misroute("identity", good({ level: "course", faculty: "law", lecturer: "yes" }), KEYS, FACULTIES)).toBe("signpost");
    expect(misroute("signpost", good({ level: "course", faculty: "law" }), KEYS, FACULTIES)).toBe("lecturer");
    expect(misroute("signpost", good({ level: "course", faculty: "law", lecturer: "other" }), KEYS, FACULTIES)).toBeNull();
    expect(misroute("programme", good({ level: "faculty", faculty: "economics" }), KEYS, FACULTIES)).toBe("signpost");
    expect(misroute("signpost", good({ level: "faculty", faculty: "law" }), KEYS, FACULTIES)).toBe("programme");
    expect(misroute("signpost", good({ level: "faculty", faculty: "economics" }), KEYS, FACULTIES)).toBeNull();
    expect(misroute("urgent", good({ emergency: "yes" }), KEYS, FACULTIES)).toBeNull();
    expect(misroute("level", good({ emergency: "yes" }), KEYS, FACULTIES)).toBe("urgent");
    expect(misroute("signpost", good(), KEYS, FACULTIES)).toBe("check");
  });
});

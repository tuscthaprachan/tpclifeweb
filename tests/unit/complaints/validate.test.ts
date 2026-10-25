import { describe, expect, it } from "vitest";
import { firstProblem, readStepValues, validateStep, emptyValues, effectivePreferred } from "@/lib/complaints/public/validate";
import { nextStep, previousStep, stepsFor } from "@/lib/complaints/public/steps";
import type { DraftValues } from "@/lib/complaints/public/steps";

const KEYS = ["facilities", "harassment"];
const good = (over: Partial<DraftValues> = {}): DraftValues => ({ ...emptyValues(), identity: "named", category: "facilities", description: "Something happened", name: "Somchai", email: "a@b.co", consent: "yes", ...over });

describe("steps", () => {
  it("skips the contact page when anonymous", () => {
    expect(stepsFor("anonymous")).not.toContain("contact");
    expect(stepsFor("named")).toContain("contact");
    expect(nextStep("anonymous", "evidence")).toBe("check");
    expect(nextStep("named", "evidence")).toBe("contact");
    expect(previousStep("anonymous", "check")).toBe("evidence");
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

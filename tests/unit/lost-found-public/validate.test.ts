import { describe, expect, it } from "vitest";
import { contactMethods, effectivePreferred, emptyValues, firstProblem, parseDate, readStepValues, validateStep } from "@/lib/lost-found/public/validate";
import { firstStep, isStep, journeyBasePath, nextStep, previousStep, stepPath, STEPS } from "@/lib/lost-found/public/steps";
import { parseTrackingInput, trackingLinkUrl } from "@/lib/lost-found/public/track";
import type { DraftValues } from "@/lib/lost-found/public/steps";

const NOW = new Date("2026-03-10T05:00:00Z");
const v = (over: Partial<DraftValues> = {}): DraftValues => ({ ...emptyValues(), ...over });
const PLACE = "11111111-2222-4333-8444-555555555555";

describe("question pages", () => {
  it("each journey ends with check then confirmation, and steps chain", () => {
    for (const kind of ["lost", "found", "claim"] as const) {
      const steps = STEPS[kind];
      expect(steps.slice(-2)).toEqual(["check", "confirmation"]);
      expect(nextStep(kind, firstStep(kind))).toBe(steps[1]);
      expect(previousStep(kind, firstStep(kind))).toBeNull();
      expect(nextStep(kind, "confirmation")).toBeNull();
    }
    expect(isStep("lost", "proof")).toBe(false);
    expect(isStep("claim", "proof")).toBe(true);
    expect(stepPath("claim", "proof", "lf-2026-0001")).toBe("/lost-and-found/lf-2026-0001/claim/proof");
    expect(journeyBasePath("found")).toBe("/lost-and-found/found");
  });
});

describe("validateStep", () => {
  it("category must be one of the known categories", () => {
    expect(validateStep("lost", "category", v({ category: "wallet" }))).toEqual({});
    expect(validateStep("lost", "category", v({ category: "spaceship" }))).toEqual({ category: "lfpErrCategory" });
    expect(validateStep("lost", "category", v())).toEqual({ category: "lfpErrCategory" });
  });

  it("describe needs a title and a description within limits, counting characters not code units", () => {
    expect(validateStep("lost", "describe", v())).toEqual({ title: "lfpErrTitle", description: "lfpErrDescription" });
    expect(validateStep("lost", "describe", v({ title: "ร่ม".repeat(27), description: "x" }))).toEqual({ title: "lfpErrTitleLong" });
    expect(validateStep("lost", "describe", v({ title: "ก".repeat(80), description: "ข".repeat(600) }))).toEqual({});
    expect(validateStep("lost", "describe", v({ title: "a", description: "b".repeat(601) }))).toEqual({ description: "lfpErrDescriptionLong" });
  });

  it("where needs a real place id or a description", () => {
    expect(validateStep("lost", "where", v())).toEqual({ placeId: "lfpErrWhere" });
    expect(validateStep("lost", "where", v({ placeId: PLACE }))).toEqual({});
    expect(validateStep("lost", "where", v({ locationNote: "Library steps" }))).toEqual({});
    expect(validateStep("lost", "where", v({ placeId: "'; drop table x; --" }))).toEqual({ placeId: "lfpErrPlace" });
    expect(validateStep("lost", "where", v({ placeId: PLACE, locationNote: "x".repeat(201) }))).toEqual({ locationNote: "lfpErrWhereLong" });
  });

  it("when accepts real past dates, Buddhist years, and rejects the rest", () => {
    expect(parseDate("1", "3", "2026", NOW)).toBe("2026-03-01");
    expect(parseDate("1", "3", "2569", NOW)).toBe("2026-03-01");
    expect(parseDate("10", "3", "2026", NOW)).toBe("2026-03-10");
    expect(parseDate("11", "3", "2026", NOW)).toBeNull();
    expect(parseDate("31", "4", "2026", NOW)).toBeNull();
    expect(parseDate("", "3", "2026", NOW)).toBeNull();
    expect(parseDate("1", "3", "26", NOW)).toBeNull();
    expect(parseDate("1", "3", "1999", NOW)).toBeNull();
    expect(validateStep("lost", "when", v({ day: "40", month: "1", year: "2026" }), NOW)).toEqual({ when: "errorInvalidDate" });
    expect(validateStep("lost", "when", v({ day: "2", month: "1", year: "2026" }), NOW)).toEqual({});
  });

  it("detail, proof and whereNow", () => {
    expect(validateStep("lost", "detail", v())).toEqual({ detail: "lfpErrDetail" });
    expect(validateStep("lost", "detail", v({ detail: "x".repeat(501) }))).toEqual({ detail: "lfpErrDetailLong" });
    expect(validateStep("claim", "proof", v())).toEqual({ proof: "lfpErrProof" });
    expect(validateStep("claim", "proof", v({ proof: "y".repeat(1001) }))).toEqual({ proof: "lfpErrProofLong" });
    expect(validateStep("found", "now", v({ whereNow: "elsewhere" }))).toEqual({ whereNow: "lfpErrWhereNow" });
    expect(validateStep("found", "now", v({ whereNow: "left_there" }))).toEqual({});
  });
});

describe("contact", () => {
  const good = { name: "Somchai", email: "somchai@example.com", consent: "yes" };

  it("a lost report needs a name, one way of contact and consent", () => {
    expect(validateStep("lost", "contact", v(good))).toEqual({});
    expect(validateStep("lost", "contact", v())).toMatchObject({ name: "lfpErrName", email: "lfpErrContactMethod", consent: "lfpErrConsent" });
    expect(validateStep("lost", "contact", v({ name: "S", consent: "yes" }))).toEqual({ email: "lfpErrContactMethod" });
    expect(validateStep("lost", "contact", v({ ...good, consent: "" }))).toEqual({ consent: "lfpErrConsent" });
  });

  it("checks the format of each way of contact", () => {
    expect(validateStep("lost", "contact", v({ ...good, email: "not an email" }))).toEqual({ email: "lfpErrEmail" });
    expect(validateStep("lost", "contact", v({ name: "S", consent: "yes", phone: "abc" }))).toEqual({ phone: "lfpErrPhone" });
    expect(validateStep("lost", "contact", v({ name: "S", consent: "yes", phone: "081-234 5678" }))).toEqual({});
    expect(validateStep("lost", "contact", v({ name: "S", consent: "yes", phone: "12" }))).toEqual({ phone: "lfpErrPhone" });
    expect(validateStep("lost", "contact", v({ name: "S", consent: "yes", lineId: "has space" }))).toEqual({ lineId: "lfpErrLine" });
    expect(validateStep("lost", "contact", v({ name: "S", consent: "yes", lineId: "somchai.t" }))).toEqual({});
  });

  it("asks which to use first only when several are given", () => {
    const two = v({ ...good, phone: "0812345678" });
    expect(validateStep("lost", "contact", two)).toEqual({ preferred: "lfpErrPreferred" });
    expect(validateStep("lost", "contact", { ...two, preferred: "phone" })).toEqual({});
    expect(validateStep("lost", "contact", { ...two, preferred: "line" })).toEqual({ preferred: "lfpErrPreferred" });
    expect(effectivePreferred(v(good))).toBe("email");
    expect(effectivePreferred({ ...two, preferred: "phone" })).toBe("phone");
    expect(contactMethods(two)).toEqual(["email", "phone"]);
  });

  it("a finder may give nothing, unless they asked to be contacted", () => {
    expect(validateStep("found", "contact", v({ whereNow: "will_hand_in" }))).toEqual({});
    expect(validateStep("found", "contact", v({ whereNow: "need_help" }))).toMatchObject({ name: "lfpErrName", consent: "lfpErrConsent" });
    // But if they give anything, the same rules apply.
    expect(validateStep("found", "contact", v({ whereNow: "will_hand_in", email: "a@b.co" }))).toMatchObject({ name: "lfpErrName", consent: "lfpErrConsent" });
  });
});

describe("firstProblem", () => {
  it("returns the first page with a problem, in journey order", () => {
    expect(firstProblem("lost", v(), NOW)?.step).toBe("category");
    const ok = v({
      category: "umbrella",
      title: "Blue umbrella",
      description: "Folding",
      locationNote: "Library",
      day: "1",
      month: "3",
      year: "2026",
      detail: "Initials on the handle",
      name: "S",
      email: "s@example.com",
      consent: "yes",
    });
    expect(firstProblem("lost", ok, NOW)).toBeNull();
    expect(firstProblem("lost", { ...ok, detail: "" }, NOW)?.step).toBe("detail");
    expect(firstProblem("claim", v({ proof: "scratch", name: "S", phone: "0812345678", consent: "yes" }), NOW)).toBeNull();
  });
});

describe("readStepValues", () => {
  it("trims, drops control characters and keeps only the step's own fields", () => {
    const form = new FormData();
    form.set("title", "  Blue \u0000 umbrella  ");
    form.set("description", "line one\r\nline two\u0007");
    form.set("category", "keys");
    expect(readStepValues("describe", form)).toEqual({ title: "Blue umbrella", description: "line one\nline two" });
    const contact = new FormData();
    contact.set("consent", "on");
    expect(readStepValues("contact", contact).consent).toBe("");
    contact.set("consent", "yes");
    expect(readStepValues("contact", contact).consent).toBe("yes");
    const when = new FormData();
    when.set("when-day", " 4 ");
    when.set("when-month", "5");
    when.set("when-year", "2026");
    expect(readStepValues("when", when)).toEqual({ day: "4", month: "5", year: "2026" });
  });
});

describe("tracking input", () => {
  const token = "a".repeat(43);
  it("accepts a bare code, a full link or a messy reference", () => {
    expect(parseTrackingInput("lf-2026-0001", token)).toEqual({ reference: "LF-2026-0001", token });
    expect(parseTrackingInput(" LF-2026-0001 ", `https://x.test/th/lost-and-found/track/link?ref=LF-2026-0001&t=${token}`)).toEqual({ reference: "LF-2026-0001", token });
    expect(parseTrackingInput("LF-2026-0001", `  ${token}  `)?.token).toBe(token);
  });
  it("refuses anything else", () => {
    expect(parseTrackingInput("nonsense", token)).toBeNull();
    expect(parseTrackingInput("LF-2026-0001", "short")).toBeNull();
    expect(parseTrackingInput("LF-2026-0001", "")).toBeNull();
    expect(parseTrackingInput("CP-2026-0001", token)).toBeNull();
  });
  it("builds a link that carries the token only in the query", () => {
    const url = trackingLinkUrl("th", "LF-2026-0001", token, "https://example.test");
    expect(url).toBe(`https://example.test/th/lost-and-found/track/link?ref=LF-2026-0001&t=${token}`);
  });
});

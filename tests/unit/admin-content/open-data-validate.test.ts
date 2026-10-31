import { describe, expect, it } from "vitest";
import { editableOwners, canEditOwner } from "@/lib/admin/open-data/scope";
import {
  academicYearOf,
  normaliseAmount,
  validateBudgetLineForm,
  validateDecisionForm,
  validateDocumentForm,
  validateFundForm,
  validateMeetingForm,
} from "@/lib/admin/open-data/validate";

const form = (values: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.append(k, v);
  return fd;
};
const BOTH = ["tusc", "tusu"] as const;

const DOCUMENT = {
  owner: "tusc",
  number: "07",
  slug: "07-council-rules",
  type: "regulation",
  "title.th": "ข้อบังคับ",
  "title.en": "Council rules",
  "issuer.th": "",
  "issuer.en": "",
  reference: "",
  dateText: "12 มิถุนายน 2568",
  dateIso: "2025-06-12",
  signatory: "",
  pages: "4",
  driveUrl: "",
  replacedBy: "",
  transcript: "# Rules\r\n\r\nLine one  \r\n",
};

describe("scope", () => {
  const orgs = [
    { id: 1, slug: "tusu" },
    { id: 2, slug: "tusc" },
    { id: 3, slug: "other" },
  ];
  it("gives administrators both bodies", () => {
    expect(editableOwners([{ role: "admin", organisationId: 1 }], orgs)).toEqual(["tusc", "tusu"]);
  });
  it("limits an editor to the bodies they hold the role for", () => {
    expect(editableOwners([{ role: "editor", organisationId: 2 }], orgs)).toEqual(["tusc"]);
    expect(editableOwners([{ role: "editor", organisationId: 1 }], orgs)).toEqual(["tusu"]);
    expect(editableOwners([{ role: "editor", organisationId: 3 }], orgs)).toEqual([]);
  });
  it("ignores other roles", () => {
    expect(editableOwners([{ role: "lf_officer", organisationId: 2 }], orgs)).toEqual([]);
  });
  it("checks a single owner", () => {
    expect(canEditOwner(["tusc"], "tusc")).toBe(true);
    expect(canEditOwner(["tusc"], "tusu")).toBe(false);
    expect(canEditOwner(["tusc"], "joint")).toBe(false);
  });
});

describe("amounts and years", () => {
  it("normalises amounts to two decimal places", () => {
    expect(normaliseAmount("9182")).toBe("9182.00");
    expect(normaliseAmount("1,171,383.8")).toBe("1171383.80");
    expect(normaliseAmount("-12.50")).toBe("-12.50");
    expect(normaliseAmount("007.5")).toBe("7.50");
  });
  it("refuses what is not an amount", () => {
    for (const bad of ["", "abc", "1.234", "[not stated]", "12.", "1e5"]) expect(normaliseAmount(bad)).toBeNull();
  });
  it("finds the academic year, which starts in May", () => {
    expect(academicYearOf("2025-06-12")).toBe(2568);
    expect(academicYearOf("2026-02-01")).toBe(2568);
    expect(academicYearOf("2025-04-30")).toBe(2567);
  });
});

describe("validateDocumentForm", () => {
  const validate = (values: Record<string, string>, intent = "save", extra: Partial<Parameters<typeof validateDocumentForm>[0]> = {}) =>
    validateDocumentForm({ locale: "en", formData: form({ ...DOCUMENT, intent, ...values }), owners: BOTH, ...extra });

  it("accepts a complete document and keeps the transcript exactly, with line endings normalised", () => {
    const result = validate({}, "publish");
    expect(result).toMatchObject({ ok: true, status: "published", data: { owner: "tusc", number: "07", pages: 4, dateIso: "2025-06-12", scan: false, driveUrl: null } });
    expect(result.ok && result.data.transcript).toBe("# Rules\n\nLine one  \n");
  });

  it("does not trim or change the transcript text", () => {
    const text = "  indented\n\n\n[not stated]\n  ";
    const result = validate({ transcript: text });
    expect(result.ok && result.data.transcript).toBe(text);
  });

  it("needs both titles to publish but not to save a draft", () => {
    expect(validate({ "title.en": "" }, "save").ok).toBe(true);
    expect(validate({ "title.en": "" }, "publish")).toMatchObject({ ok: false, errors: { "title.en": "Enter the title in English" } });
  });

  it("checks number, type, date, pages and links", () => {
    const result = validate({ number: "7", type: "memo", dateIso: "2025-13-40", pages: "-1", driveUrl: "not a link", slug: "Bad Slug" });
    expect(result.ok).toBe(false);
    expect(result.ok ? {} : Object.keys(result.errors).sort()).toEqual(["dateIso", "driveUrl", "number", "pages", "slug", "type"]);
  });

  it("takes the owner from the form for a new document and refuses a body the person cannot edit", () => {
    expect(validate({ owner: "tusu" }, "save", { owners: ["tusc"] })).toMatchObject({ ok: false, errors: { owner: "You cannot edit the open data of this body" } });
    expect(validate({ owner: "" })).toMatchObject({ ok: false, errors: { owner: expect.any(String) } });
  });

  it("keeps an existing document in its body and checks the editor may edit it", () => {
    expect(validate({ owner: "tusu" }, "save", { existingOwner: "tusc" })).toMatchObject({ ok: true, data: { owner: "tusc" } });
    expect(validate({}, "save", { existingOwner: "tusc", owners: ["tusu"] })).toMatchObject({ ok: false, errors: { owner: expect.any(String) } });
  });

  it("keeps a published document published when saved", () => {
    expect(validate({}, "save", { existingOwner: "tusc", existingStatus: "published" })).toMatchObject({ ok: true, status: "published", publishing: true });
  });
});

describe("validateMeetingForm", () => {
  const MEETING = { owner: "tusc", sessionType: "ordinary", session: "1", meeting: "3", titleTh: "ประชุมครั้งที่ 3", meetingDate: "2025-06-12", seats: "30", present: "27", onLeave: "2", absent: "1" };
  const validate = (values: Record<string, string> = {}, owners: readonly ("tusc" | "tusu")[] = BOTH) =>
    validateMeetingForm({ locale: "en", formData: form({ ...MEETING, ...values }), owners });

  it("derives the academic year from the date when it is left empty", () => {
    expect(validate()).toMatchObject({ ok: true, data: { academicYear: 2568, present: 27, minutesDocument: null } });
    expect(validate({ academicYear: "2567" })).toMatchObject({ ok: true, data: { academicYear: 2567 } });
  });

  it("requires the session, meeting and date", () => {
    const result = validate({ session: "", meeting: "0", meetingDate: "" });
    expect(result.ok).toBe(false);
    expect(result.ok ? {} : Object.keys(result.errors).sort()).toEqual(["meeting", "meetingDate", "session"]);
  });

  it("refuses a bad session type and an unknown document id", () => {
    expect(validate({ sessionType: "special" }).ok).toBe(false);
    expect(validate({ minutesDocument: "not-a-uuid" })).toMatchObject({ ok: false, errors: { minutesDocument: expect.any(String) } });
  });

  it("refuses a body the person cannot edit", () => {
    expect(validate({}, ["tusu"])).toMatchObject({ ok: false, errors: { owner: expect.any(String) } });
  });
});

describe("validateDecisionForm", () => {
  const DECISION = { ref: "D01", item: "3.1", topic: "Budget", type: "approval", "text.th": "อนุมัติ", "text.en": "Approved", votesFor: "20", votesAgainst: "[not stated]", votesAbstain: "", membersVoting: "27", partyBreakdown: "", outcome: "Passed", amount: "", minutesAnchor: "" };
  const validate = (values: Record<string, string> = {}) => validateDecisionForm({ locale: "en", formData: form({ ...DECISION, ...values }) });

  it("keeps vote totals exactly as printed, markers included, and blanks as null", () => {
    expect(validate()).toMatchObject({
      ok: true,
      data: { ref: "D01", votesFor: "20", votesAgainst: "[not stated]", votesAbstain: null, partyBreakdown: null, amount: null, textTh: "อนุมัติ", textEn: "Approved" },
    });
  });

  it("requires the reference, item, topic, type and outcome", () => {
    const result = validate({ ref: "", item: "", topic: "", type: "", outcome: "" });
    expect(result.ok).toBe(false);
    expect(result.ok ? {} : Object.keys(result.errors).sort()).toEqual(["item", "outcome", "ref", "topic", "type"]);
  });
});

describe("validateBudgetLineForm", () => {
  const LINE = { owner: "tusc", fiscalYear: "2569", view: "organisation", organisationType: "สภา", organisation: "สภาฯ", project: "[not applicable]", category: "[not applicable]", amount: "9,182", sourceDocument: "", sourcePage: "5" };
  const validate = (values: Record<string, string> = {}) => validateBudgetLineForm({ locale: "en", formData: form({ ...LINE, ...values }), owners: BOTH });

  it("accepts a line and stores the amount to two decimal places", () => {
    expect(validate()).toMatchObject({ ok: true, data: { fiscalYear: 2569, amount: "9182.00", sourcePage: 5, project: "[not applicable]", owner: "tusc" } });
  });

  it("checks year, view and amount", () => {
    const result = validate({ fiscalYear: "69", view: "total", amount: "lots" });
    expect(result.ok).toBe(false);
    expect(result.ok ? {} : Object.keys(result.errors).sort()).toEqual(["amount", "fiscalYear", "view"]);
  });
});

describe("validateFundForm", () => {
  const FUND = { owner: "tusc", number: "1", type: "ดอกผลกองทุน", code: "42001", name: "ดอกผลทุน", annotation: "[none]" };
  const validate = (values: Record<string, string> = {}) => validateFundForm({ locale: "en", formData: form({ ...FUND, ...values }), owners: BOTH });

  it("accepts a fund and keeps the printed annotation", () => {
    expect(validate()).toMatchObject({ ok: true, data: { number: 1, code: "42001", annotation: "[none]" } });
    expect(validate({ annotation: "" })).toMatchObject({ ok: true, data: { annotation: null } });
  });

  it("requires the number, type, code and name", () => {
    const result = validate({ number: "0", type: "", code: "", name: "" });
    expect(result.ok).toBe(false);
    expect(result.ok ? {} : Object.keys(result.errors).sort()).toEqual(["code", "name", "number", "type"]);
  });
});

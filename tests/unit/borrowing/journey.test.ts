/** The public borrowing journey: step routing, validation of every step, and finishing it. On PGlite with the real migrations. */
import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { borrowingJourneys, borrowingLines, borrowingRequests, caseContacts, cases, faculties, journeyMetrics } from "@/lib/db/schema";
import { finishJourney, JourneyTooFastError, MIN_JOURNEY_MS } from "@/lib/borrowing/public/journey";
import { BORROW_STEPS, isStep, nextStep, previousStep, quantityField, stepPath, type DraftValues } from "@/lib/borrowing/public/steps";
import { loadJourney, saveJourney, startJourney, sweepExpiredJourneys, JOURNEY_TTL_MS } from "@/lib/borrowing/public/store";
import { consumeSubmitAttempt, JourneyInvalidError, loadContext, SUBMIT_RATE_RULE } from "@/lib/borrowing/public/submit";
import { emptyValues, firstProblem, misroute, normalisePhone, parseDay, periodOf, validateStep, type FieldErrors, type ValidationContext } from "@/lib/borrowing/public/validate";
import { env, NOW, setupBorrowing, type Ctx } from "./helpers";

let t: Ctx;
let facultyId: string;
let football: string;
let radio: string;
beforeAll(async () => {
  t = await setupBorrowing();
  const [faculty] = await t.db.insert(faculties).values({ status: "published", slug: "law", nameTh: "คณะนิติศาสตร์", nameEn: "Faculty of Law" }).returning({ id: faculties.id });
  facultyId = faculty!.id;
  football = (await t.item("football")).id;
  radio = (await t.item("radio-red")).id;
});

const good = (over: Partial<DraftValues> = {}): DraftValues => ({
  ...emptyValues(),
  collectDay: "12",
  collectMonth: "3",
  collectYear: "2026",
  collectTime: "10:00",
  returnDay: "13",
  returnMonth: "3",
  returnYear: "2026",
  returnTime: "16:00",
  items: [football],
  quantities: { [football]: "2" },
  eventName: "Freshers football match",
  venue: "Main field",
  purpose: "A friendly match for first year students",
  borrower: "group",
  groupName: "Law Faculty Sports Club",
  student: "yes",
  name: "Somchai Tester",
  studentId: "6501234567",
  faculty: facultyId,
  phone: "081-234-5678",
  email: "somchai@example.com",
  terms: "yes",
  ...over,
});

const context = (v: DraftValues): Promise<ValidationContext> => loadContext(t.db, v, { now: NOW });
const keys = (errors: FieldErrors) => Object.fromEntries(Object.entries(errors).map(([field, e]) => [field, e.key]));
async function errorsFor(step: string, over: Partial<DraftValues> = {}) {
  const v = good(over);
  return keys(validateStep(step, v, await context(v)));
}

describe("step routing", () => {
  it("runs the eleven pages in order and knows only those", () => {
    expect(BORROW_STEPS).toEqual(["dates", "items", "quantities", "event", "group", "student", "details", "contact", "terms", "check", "confirmation"]);
    expect(nextStep("dates")).toBe("items");
    expect(nextStep("terms")).toBe("check");
    expect(nextStep("confirmation")).toBeNull();
    expect(previousStep("dates")).toBeNull();
    expect(previousStep("check")).toBe("terms");
    expect(isStep("quantities")).toBe(true);
    expect(isStep("evidence")).toBe(false);
    expect(stepPath("dates")).toBe("/borrow/dates");
  });

  it("sends a person back to the first earlier page that is unanswered, saying nothing about pages they never filled in", async () => {
    const empty = emptyValues();
    expect(misroute("quantities", empty, await context(empty))).toEqual({ step: "dates", errors: {} });
    expect(misroute("dates", empty, await context(empty))).toBeNull();
    const dated = good({ items: [], quantities: {} });
    expect(misroute("terms", dated, await context(dated))?.step).toBe("items");
    const whole = good();
    expect(misroute("check", whole, await context(whole))).toBeNull();
  });

  it("sends a person back with the reason when new dates leave an item or quantity that no longer fits", async () => {
    const radios = good({ items: [radio], quantities: { [radio]: "2" } });
    const stale = misroute("event", radios, await context(radios));
    expect(stale?.step).toBe("items");
    expect(keys(stale!.errors)).toEqual({ items: "brErrItemsGone" });
    const tooMany = good({ quantities: { [football]: "3" } });
    await t.request({ lines: [{ itemId: football, quantity: 2 }] });
    const short = misroute("event", tooMany, await context(tooMany));
    expect(short?.step).toBe("quantities");
    expect(keys(short!.errors)).toEqual({ [quantityField(football)]: "brErrQtyOverFree" });
  });
});

describe("dates", () => {
  it("accepts a real period the desk can serve, in either calendar year", async () => {
    expect(await errorsFor("dates")).toEqual({});
    expect(await errorsFor("dates", { collectYear: "2569", returnYear: "2569" })).toEqual({});
    expect(periodOf(good())?.collectAt.toISOString()).toBe("2026-03-12T03:00:00.000Z");
  });

  it("explains a missing, incomplete or impossible date in words that name the date", async () => {
    expect(await errorsFor("dates", { collectDay: "", collectMonth: "", collectYear: "" })).toMatchObject({ collect: "brErrCollectMissing" });
    expect(await errorsFor("dates", { collectMonth: "" })).toMatchObject({ collect: "brErrCollectIncomplete" });
    expect(await errorsFor("dates", { collectDay: "31", collectMonth: "2" })).toMatchObject({ collect: "brErrCollectInvalid" });
    expect(await errorsFor("dates", { returnDay: "x" })).toMatchObject({ return: "brErrReturnInvalid" });
    expect(await errorsFor("dates", { returnDay: "", returnMonth: "", returnYear: "" })).toMatchObject({ return: "brErrReturnMissing" });
    expect(parseDay({ day: "5", month: "3", year: "26" })).toEqual({ ok: false, reason: "invalid" });
  });

  it("requires a time from the desk's list", async () => {
    expect(await errorsFor("dates", { collectTime: "" })).toMatchObject({ collectTime: "brErrCollectTime" });
    expect(await errorsFor("dates", { collectTime: "08:00" })).toMatchObject({ collectTime: "brErrCollectTime" });
    expect(await errorsFor("dates", { returnTime: "10:15" })).toMatchObject({ returnTime: "brErrReturnTime" });
  });

  it("applies notice, desk days, how far ahead, return order and the longest loan, each to the field it concerns", async () => {
    const notice = validateStep("dates", good({ collectDay: "11" }), await context(good()));
    expect(notice.collect).toEqual({ key: "brErrCollectNotice", vars: { date: "2026-03-12", n: 3 } });
    expect(await errorsFor("dates", { collectDay: "7" })).toMatchObject({ collect: "brErrCollectPast" });
    expect(await errorsFor("dates", { collectDay: "14" })).toMatchObject({ collect: "brErrCollectDeskDay" });
    expect(await errorsFor("dates", { collectDay: "1", collectMonth: "9" })).toMatchObject({ collect: "brErrCollectTooFar" });
    expect(await errorsFor("dates", { returnDay: "12", returnTime: "09:00" })).toMatchObject({ return: "brErrReturnBefore" });
    expect(await errorsFor("dates", { returnDay: "15" })).toMatchObject({ return: "brErrReturnDeskDay" });
    expect(await errorsFor("dates", { returnDay: "30" })).toMatchObject({ return: "brErrLoanTooLong" });
    expect(await errorsFor("dates", { returnDay: "21" })).toMatchObject({ return: "brErrReturnDeskDay" });
  });
});

describe("items and quantities", () => {
  it("needs at least one item that exists, has notice for the dates, and has some free", async () => {
    expect(await errorsFor("items")).toEqual({});
    expect(await errorsFor("items", { items: [] })).toEqual({ items: "brErrItemsNone" });
    expect(await errorsFor("items", { items: ["00000000-0000-0000-0000-000000000000"] })).toEqual({ items: "brErrItemsGone" });
    // Radios need seven working days; 12 March gives three.
    expect(await errorsFor("items", { items: [radio] })).toEqual({ items: "brErrItemsGone" });
    expect(await errorsFor("items", { items: [radio], collectDay: "18", returnDay: "19" })).toEqual({});
  });

  it("maps every quantity problem to its own message on the item's field", async () => {
    const field = quantityField(football);
    expect(await errorsFor("quantities")).toEqual({});
    expect(await errorsFor("quantities", { quantities: {} })).toEqual({ [field]: "brErrQtyMissing" });
    for (const bad of ["0", "-1", "1.5", "two"]) expect(await errorsFor("quantities", { quantities: { [football]: bad } })).toEqual({ [field]: "brErrQtyWhole" });
    expect(await errorsFor("quantities", { quantities: { [football]: "5" } })).toEqual({ [field]: "brErrQtyOverFree" });
    const red = quantityField(radio);
    const base = { items: [radio], collectDay: "18", returnDay: "19" };
    expect(await errorsFor("quantities", { ...base, quantities: { [radio]: "13" } })).toEqual({});
    expect(await errorsFor("quantities", { ...base, quantities: { [radio]: "14" } })).toEqual({ [red]: "brErrQtyOverFree" });
    const black = (await t.item("radio-black")).id;
    expect(await errorsFor("quantities", { ...base, items: [radio, black], quantities: { [radio]: "8", [black]: "6" } })).toEqual({ [red]: "brErrQtyOverCategory" });
  });

  it("reports the item name and the number free so the sentence can say them", async () => {
    const v = good({ quantities: { [football]: "9" }, collectDay: "23", returnDay: "24" });
    expect(validateStep("quantities", v, await context(v))[quantityField(football)]).toEqual({ key: "brErrQtyOverFree", vars: { item: { th: "ลูกฟุตบอล", en: "Football" }, max: 4 } });
  });
});

describe("the other questions", () => {
  it("event: all three answers, within length", async () => {
    expect(await errorsFor("event")).toEqual({});
    expect(await errorsFor("event", { eventName: "", venue: "", purpose: "" })).toEqual({ eventName: "brErrEvent", venue: "brErrVenue", purpose: "brErrPurpose" });
    expect(await errorsFor("event", { eventName: "x".repeat(201), venue: "x".repeat(201), purpose: "x".repeat(501) })).toEqual({ eventName: "brErrEventLong", venue: "brErrVenueLong", purpose: "brErrPurposeLong" });
  });

  it("group: a choice, and a name for a group", async () => {
    expect(await errorsFor("group")).toEqual({});
    expect(await errorsFor("group", { borrower: "personal", groupName: "" })).toEqual({});
    expect(await errorsFor("group", { borrower: "" })).toEqual({ borrower: "brErrBorrower" });
    expect(await errorsFor("group", { groupName: "" })).toEqual({ groupName: "brErrGroupName" });
    expect(await errorsFor("group", { groupName: "x".repeat(201) })).toEqual({ groupName: "brErrGroupNameLong" });
  });

  it("student: yes or no", async () => {
    expect(await errorsFor("student", { student: "no" })).toEqual({});
    expect(await errorsFor("student", { student: "" })).toEqual({ student: "brErrStudent" });
  });

  it("details: a student gives ten digits and a faculty, anyone else an organisation", async () => {
    expect(await errorsFor("details")).toEqual({});
    expect(await errorsFor("details", { name: "" })).toEqual({ name: "brErrName" });
    expect(await errorsFor("details", { studentId: "650123456" })).toEqual({ studentId: "brErrStudentId" });
    expect(await errorsFor("details", { studentId: "65012345678" })).toEqual({ studentId: "brErrStudentId" });
    expect(await errorsFor("details", { studentId: "65012345ab" })).toEqual({ studentId: "brErrStudentId" });
    expect(await errorsFor("details", { faculty: "" })).toEqual({ faculty: "brErrFaculty" });
    expect(await errorsFor("details", { faculty: "00000000-0000-0000-0000-000000000000" })).toEqual({ faculty: "brErrFaculty" });
    expect(await errorsFor("details", { student: "no", studentId: "", faculty: "", affiliation: "Chulalongkorn University" })).toEqual({});
    expect(await errorsFor("details", { student: "no", affiliation: "" })).toEqual({ affiliation: "brErrAffiliation" });
  });

  it("contact: a Thai mobile number written with spaces or dashes, and an optional email that must be one", async () => {
    expect(await errorsFor("contact", { phone: "0812345678", email: "" })).toEqual({});
    expect(await errorsFor("contact", { phone: "081 234 5678" })).toEqual({});
    expect(await errorsFor("contact", { phone: "" })).toEqual({ phone: "brErrPhoneMissing" });
    for (const bad of ["812345678", "02-123-4567", "081234567", "+66812345678", "081 234 567x"]) expect(await errorsFor("contact", { phone: bad })).toEqual({ phone: "brErrPhone" });
    expect(await errorsFor("contact", { email: "not an email" })).toEqual({ email: "brErrEmail" });
    expect(normalisePhone("081-234 5678")).toBe("0812345678");
  });

  it("terms: the box must be ticked", async () => {
    expect(await errorsFor("terms")).toEqual({});
    expect(await errorsFor("terms", { terms: "" })).toEqual({ terms: "brErrTerms" });
  });

  it("firstProblem names the first page with a problem, in journey order", async () => {
    const v = good({ phone: "", terms: "", venue: "" });
    const problem = firstProblem(v, await context(v));
    expect(problem?.step).toBe("event");
    expect(firstProblem(good(), await context(good()))).toBeNull();
  });
});

describe("the draft", () => {
  it("is encrypted on the server, found by its cookie token, and swept when it expires", async () => {
    const { token, id } = await startJourney(t.db, { locale: "en" }, { now: NOW, env });
    const loaded = await loadJourney(t.db, token, { now: NOW, env });
    expect(loaded?.id).toBe(id);
    await saveJourney(t.db, id, { ...loaded!.data, values: good({ name: "Visible Name" }) }, { now: NOW, env });
    const [row] = await t.db.select().from(borrowingJourneys).where(eq(borrowingJourneys.id, id));
    expect(row!.dataEnc).not.toContain("Visible Name");
    expect(row!.tokenHash).not.toBe(token);
    expect((await loadJourney(t.db, token, { now: NOW, env }))?.data.values.name).toBe("Visible Name");
    expect(await loadJourney(t.db, token, { now: new Date(NOW.getTime() + JOURNEY_TTL_MS + 1), env })).toBeNull();
    expect(await loadJourney(t.db, "nope", { now: NOW, env })).toBeNull();
    expect(await sweepExpiredJourneys(t.db, new Date(NOW.getTime() + JOURNEY_TTL_MS + 1))).toBeGreaterThan(0);
    expect(await loadJourney(t.db, token, { now: NOW, env })).toBeNull();
  });

  it("counts a start as a borrow journey", async () => {
    const { id } = await startJourney(t.db, { locale: "th" }, { now: NOW, env });
    const [metric] = await t.db.select().from(journeyMetrics).where(eq(journeyMetrics.id, id));
    expect(metric).toMatchObject({ kind: "borrow", finishedAt: null });
  });
});

describe("finishing a journey", () => {
  const ctx = { locale: "en" as const, ip: "203.0.113.9", userAgent: "vitest", requestId: "r1" };
  const later = new Date(NOW.getTime() + MIN_JOURNEY_MS + 1000);

  async function started(values: DraftValues) {
    const { token, id } = await startJourney(t.db, { locale: "en" }, { now: NOW, env });
    const loaded = await loadJourney(t.db, token, { now: NOW, env });
    await saveJourney(t.db, id, { ...loaded!.data, values }, { now: NOW, env });
    return id;
  }

  it("creates the case with its lines and contact, keeps only the result, and gives the same result to a second press", async () => {
    const id = await started(good({ quantities: { [football]: "1" } }));
    const result = await finishJourney(t.db, id, ctx, { now: later, env });
    expect(result.reference).toMatch(/^BR-2026-\d{4}$/);
    expect(result.token).toHaveLength(43);
    expect(result).toMatchObject({ email: "somchai@example.com", emailed: false, cards: 1, collectAt: "2026-03-12T03:00:00.000Z" });

    const [made] = await t.db.select().from(cases).where(eq(cases.reference, result.reference));
    expect(made).toMatchObject({ service: "borrowing", status: "requested" });
    const [request] = await t.db.select().from(borrowingRequests).where(eq(borrowingRequests.caseId, made!.id));
    expect(request).toMatchObject({ borrowerKind: "group", groupName: "Law Faculty Sports Club", eventName: "Freshers football match", facultyId });
    expect(request!.studentIdEnc).not.toContain("6501234567");
    expect(request!.affiliationEnc).toBeNull();
    expect((await t.db.select().from(borrowingLines).where(eq(borrowingLines.caseId, made!.id))).map((l) => [l.itemId, l.quantity])).toEqual([[football, 1]]);
    const contacts = await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, made!.id));
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ role: "borrower", preferredContact: "email", consentContact: true });

    const [row] = await t.db.select().from(borrowingJourneys).where(eq(borrowingJourneys.id, id));
    expect(row!.dataEnc).not.toContain("Freshers");
    const [metric] = await t.db.select().from(journeyMetrics).where(eq(journeyMetrics.id, id));
    expect(metric!.finishedAt).not.toBeNull();

    const again = await finishJourney(t.db, id, ctx, { now: later, env });
    expect(again).toEqual(result);
    expect(await t.db.select().from(cases).where(eq(cases.reference, result.reference))).toHaveLength(1);
  });

  it("prefers the phone when no email was given, and stores an affiliation for someone who is not a student", async () => {
    const id = await started(good({ email: "", student: "no", studentId: "", faculty: "", affiliation: "Chulalongkorn University", borrower: "personal", groupName: "", quantities: { [football]: "1" }, collectDay: "13", returnDay: "16" }));
    const result = await finishJourney(t.db, id, ctx, { now: later, env });
    expect(result.email).toBeNull();
    const [made] = await t.db.select().from(cases).where(eq(cases.reference, result.reference));
    const [request] = await t.db.select().from(borrowingRequests).where(eq(borrowingRequests.caseId, made!.id));
    expect(request).toMatchObject({ borrowerKind: "personal", groupName: null, studentIdEnc: null, facultyId: null });
    expect(request!.affiliationEnc).not.toBeNull();
    const [contact] = await t.db.select().from(caseContacts).where(eq(caseContacts.caseId, made!.id));
    expect(contact!.preferredContact).toBe("phone");
  });

  it("refuses a journey submitted faster than a person could fill it in, and writes nothing", async () => {
    const id = await started(good());
    await expect(finishJourney(t.db, id, ctx, { now: new Date(NOW.getTime() + 500), env })).rejects.toBeInstanceOf(JourneyTooFastError);
  });

  it("sends the person to the first page that is wrong, with its errors, and writes nothing", async () => {
    const id = await started(good({ terms: "", collectDay: "23", returnDay: "24" }));
    const before = (await t.db.select().from(cases)).length;
    const failure = await finishJourney(t.db, id, ctx, { now: later, env }).catch((e) => e);
    expect(failure).toBeInstanceOf(JourneyInvalidError);
    expect(failure.step).toBe("terms");
    expect(keys(failure.errors)).toEqual({ terms: "brErrTerms" });
    expect((await t.db.select().from(cases)).length).toBe(before);
  });

  it("routes back to the quantities page when the stock went while the person was checking", async () => {
    const free = (await t.item("table-tennis-ball")).id;
    const id = await started(good({ items: [free], quantities: { [free]: "15" }, collectDay: "16", returnDay: "17" }));
    await t.request({ collectAt: periodOf(good({ collectDay: "16", returnDay: "17" }))!.collectAt, returnDueAt: periodOf(good({ collectDay: "16", returnDay: "17" }))!.returnAt, lines: [{ itemId: free, quantity: 10 }] });
    const failure = await finishJourney(t.db, id, ctx, { now: later, env }).catch((e) => e);
    expect(failure).toBeInstanceOf(JourneyInvalidError);
    expect(failure.step).toBe("quantities");
    expect(failure.errors[quantityField(free)]).toEqual({ key: "brErrQtyOverFree", vars: { item: { th: "ลูกปิงปอง", en: "Table tennis ball" }, max: 10 } });
    expect(await t.db.select().from(borrowingLines).where(eq(borrowingLines.itemId, free))).toHaveLength(1);
  });

  it("limits submissions to ten an hour per address", async () => {
    const results = [];
    for (let i = 0; i < SUBMIT_RATE_RULE.max + 1; i++) results.push((await consumeSubmitAttempt(t.db, "198.51.100.7", NOW.getTime())).allowed);
    expect(results.filter(Boolean)).toHaveLength(SUBMIT_RATE_RULE.max);
    expect(results.at(-1)).toBe(false);
    expect((await consumeSubmitAttempt(t.db, "198.51.100.8", NOW.getTime())).allowed).toBe(true);
  });
});

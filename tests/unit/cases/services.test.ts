import { describe, expect, it } from "vitest";
import {
  accessibleServices,
  allowedTransitions,
  canAccessService,
  canTransition,
  canUseCaseInbox,
  isTerminalStatus,
  publicStatusLabel,
  resolveActingOrganisation,
  SERVICES,
} from "@/lib/cases";

describe("state machines", () => {
  it("every transition target exists and every status has a transitions entry", () => {
    for (const def of Object.values(SERVICES)) {
      for (const kind of Object.values(def.kinds)) {
        const m = kind.machine;
        expect(m.statuses[m.initial]).toBeDefined();
        for (const status of Object.keys(m.statuses)) expect(m.transitions[status]).toBeDefined();
        for (const targets of Object.values(m.transitions)) for (const t of targets) expect(m.statuses[t]).toBeDefined();
        for (const t of m.publicActorTo) expect(m.statuses[t]).toBeDefined();
      }
    }
  });

  it("every status has Thai and English labels", () => {
    for (const def of Object.values(SERVICES)) {
      for (const kind of Object.values(def.kinds)) {
        for (const s of Object.values(kind.machine.statuses)) {
          expect(s.label.th && s.label.en).toBeTruthy();
          if (s.publicLabel) expect(s.publicLabel.th && s.publicLabel.en).toBeTruthy();
        }
      }
    }
  });

  it("lost report: allows the happy path and blocks shortcuts", () => {
    expect(canTransition("lost_found", "lost", "submitted", "searching")).toBe(true);
    expect(canTransition("lost_found", "lost", "searching", "match_found")).toBe(true);
    expect(canTransition("lost_found", "lost", "match_found", "ready_to_collect")).toBe(true);
    expect(canTransition("lost_found", "lost", "ready_to_collect", "returned")).toBe(true);
    expect(canTransition("lost_found", "lost", "submitted", "returned")).toBe(false);
    expect(canTransition("lost_found", "lost", "searching", "ready_to_collect")).toBe(false);
    expect(canTransition("lost_found", "lost", "returned", "searching")).toBe(false);
    expect(allowedTransitions("lost_found", "lost", "withdrawn")).toEqual([]);
  });

  it("found item: logged to returned, no disposal, kinds do not mix", () => {
    expect(canTransition("lost_found", "found", "logged", "listed")).toBe(true);
    expect(canTransition("lost_found", "found", "listed", "claim_pending")).toBe(true);
    expect(canTransition("lost_found", "found", "claim_pending", "ready_to_collect")).toBe(true);
    expect(canTransition("lost_found", "found", "ready_to_collect", "returned")).toBe(true);
    expect(canTransition("lost_found", "found", "logged", "searching")).toBe(false);
    expect(Object.keys(SERVICES.lost_found.kinds.found!.machine.statuses)).not.toContain("disposed");
  });

  it("the person with the tracking link may only withdraw", () => {
    expect(allowedTransitions("lost_found", "lost", "searching", "public")).toEqual(["withdrawn"]);
    expect(allowedTransitions("lost_found", "lost", "returned", "public")).toEqual([]);
    expect(allowedTransitions("lost_found", "found", "listed", "public")).toEqual([]);
  });

  it("terminal statuses and public labels", () => {
    expect(isTerminalStatus("lost_found", "lost", "returned")).toBe(true);
    expect(isTerminalStatus("lost_found", "lost", "searching")).toBe(false);
    expect(publicStatusLabel("lost_found", "found", "logged").en).toBe("In progress");
    expect(publicStatusLabel("lost_found", "found", "listed").en).toBe("Listed as found");
  });

  it("unknown kinds and statuses have no transitions", () => {
    expect(allowedTransitions("lost_found", "nope", "x")).toEqual([]);
  });
});

describe("role access", () => {
  const officer = [{ role: "officer" as const }];
  it("maps roles to services", () => {
    expect(accessibleServices(officer)).toEqual(["lost_found", "complaint", "borrowing"]);
    expect(accessibleServices([{ role: "admin" }])).toEqual(["lost_found", "complaint", "borrowing"]);
    expect(accessibleServices([{ role: "editor" }])).toEqual([]);
  });
  it("inbox visibility", () => {
    expect(canUseCaseInbox(officer)).toBe(true);
    expect(canUseCaseInbox([{ role: "editor" }])).toBe(false);
    expect(canAccessService([{ role: "editor" }], "complaint")).toBe(false);
    expect(canAccessService(officer, "complaint")).toBe(true);
  });
  it("acting organisation comes from membership", () => {
    expect(resolveActingOrganisation([1, 2], 2)).toBe(2);
    expect(resolveActingOrganisation([1, 2], 3)).toBe(1);
    expect(resolveActingOrganisation([2])).toBe(2);
    expect(resolveActingOrganisation([])).toBeNull();
  });
});

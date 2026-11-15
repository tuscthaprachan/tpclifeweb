/** The complaint clock: the one rule for missed targets and for what to escalate. */
import { describe, expect, it } from "vitest";
import { complaintClock, toEscalationReason, type ClockRow } from "@/lib/complaints/overdue";
import { escalationDedupeKey } from "@/lib/complaints/escalation";

const ACK = new Date("2026-03-11T09:00:00Z");
const RESOLVE = new Date("2026-03-23T09:00:00Z");
const row = (over: Partial<ClockRow> = {}): ClockRow => ({ acknowledgedAt: null, acknowledgeDueAt: ACK, resolveDueAt: RESOLVE, closedAt: null, escalatedReason: null, ...over });
const ms = (d: Date, delta: number) => new Date(d.getTime() + delta);

describe("complaintClock", () => {
  it("a target is missed strictly after its date, not at it", () => {
    expect(complaintClock(row(), ms(ACK, -1)).acknowledgeMissed).toBe(false);
    expect(complaintClock(row(), ACK).acknowledgeMissed).toBe(false);
    expect(complaintClock(row(), ms(ACK, 1)).acknowledgeMissed).toBe(true);
    expect(complaintClock(row(), RESOLVE).resolveMissed).toBe(false);
    expect(complaintClock(row(), ms(RESOLVE, 1)).resolveMissed).toBe(true);
  });

  it("an acknowledged complaint cannot miss the acknowledge target", () => {
    const clock = complaintClock(row({ acknowledgedAt: ms(ACK, -1000) }), ms(ACK, 1));
    expect(clock).toMatchObject({ acknowledgeMissed: false, overdue: false, escalation: null, dueAt: RESOLVE });
  });

  it("the due date is the acknowledge date until acknowledged", () => {
    expect(complaintClock(row(), ACK).dueAt).toBe(ACK);
  });

  it("a closed complaint is never overdue or escalated", () => {
    expect(complaintClock(row({ closedAt: ACK }), ms(RESOLVE, 1))).toMatchObject({ acknowledgeMissed: false, resolveMissed: false, overdue: false, escalation: null });
  });

  it("escalates once per reason, resolve last and final", () => {
    expect(complaintClock(row(), ms(ACK, 1)).escalation).toBe("acknowledge");
    expect(complaintClock(row({ escalatedReason: "acknowledge" }), ms(ACK, 1)).escalation).toBeNull();
    expect(complaintClock(row({ escalatedReason: "acknowledge" }), ms(RESOLVE, 1)).escalation).toBe("resolve");
    expect(complaintClock(row(), ms(RESOLVE, 1)).escalation).toBe("resolve");
    expect(complaintClock(row({ escalatedReason: "resolve" }), ms(RESOLVE, 1)).escalation).toBeNull();
  });
});

describe("escalation reason", () => {
  it("narrows stored text to the union", () => {
    expect(toEscalationReason("acknowledge")).toBe("acknowledge");
    expect(toEscalationReason("resolve")).toBe("resolve");
    expect(toEscalationReason("other")).toBeNull();
    expect(toEscalationReason(null)).toBeNull();
  });

  it("the notification key changes with the reopen round, and keeps the old form for round zero", () => {
    expect(escalationDedupeKey("c1", "resolve", 0)).toBe("escalated:c1:resolve");
    expect(escalationDedupeKey("c1", "resolve", 1)).toBe("escalated:c1:resolve:r1");
    expect(escalationDedupeKey("c1", "resolve", 1)).not.toBe(escalationDedupeKey("c1", "resolve", 2));
  });
});

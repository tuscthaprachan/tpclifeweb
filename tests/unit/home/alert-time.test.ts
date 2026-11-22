import { describe, expect, it } from "vitest";
import { alertTimePhrase } from "@/components/domain/serviceAlertTime";

const at = (iso: string) => new Date(`${iso}+07:00`);
const now = at("2026-11-22T12:00:00");

describe("alertTimePhrase", () => {
  it("says until a time today", () => {
    expect(alertTimePhrase(at("2026-11-21T17:56:00"), at("2026-11-22T20:30:00"), "en", now)).toBe("Until 20:30 today");
    expect(alertTimePhrase(at("2026-11-21T17:56:00"), at("2026-11-22T20:30:00"), "th", now)).toBe("ถึง 20:30 วันนี้");
  });

  it("says until a time tomorrow", () => {
    expect(alertTimePhrase(at("2026-11-21T17:56:00"), at("2026-11-23T20:30:00"), "en", now)).toBe("Until 20:30 tomorrow");
    expect(alertTimePhrase(at("2026-11-21T17:56:00"), at("2026-11-23T20:30:00"), "th", now)).toBe("ถึง 20:30 พรุ่งนี้");
  });

  it("names the weekday and date for later days", () => {
    expect(alertTimePhrase(at("2026-11-21T17:56:00"), at("2026-11-24T20:30:00"), "en", now)).toBe("Until Tuesday 24 November, 20:30");
    expect(alertTimePhrase(at("2026-11-21T17:56:00"), at("2026-11-24T20:30:00"), "th", now)).toBe("ถึง วันอังคารที่ 24 พฤศจิกายน เวลา 20:30");
  });

  it("uses Bangkok time near midnight UTC", () => {
    expect(alertTimePhrase(at("2026-11-21T00:00:00"), at("2026-11-23T01:30:00"), "en", at("2026-11-22T23:30:00"))).toBe("Until 01:30 tomorrow");
  });

  it("says from when for an alert that has not started", () => {
    expect(alertTimePhrase(at("2026-11-22T18:00:00"), at("2026-11-22T20:30:00"), "en", now)).toBe("From 18:00 today until 20:30");
    expect(alertTimePhrase(at("2026-11-22T18:00:00"), at("2026-11-22T20:30:00"), "th", now)).toBe("ตั้งแต่ 18:00 วันนี้ ถึง 20:30");
    expect(alertTimePhrase(at("2026-11-23T06:00:00"), at("2026-11-23T20:30:00"), "en", now)).toBe("From 06:00 tomorrow until 20:30");
  });

  it("handles open ended and finished alerts", () => {
    expect(alertTimePhrase(at("2026-11-21T08:00:00"), null, "en", now)).toBe("Until further notice");
    expect(alertTimePhrase(at("2026-11-23T06:00:00"), null, "en", now)).toBe("From 06:00 tomorrow");
    expect(alertTimePhrase(at("2026-11-20T08:00:00"), at("2026-11-22T09:00:00"), "en", now)).toBe("Ended (09:00 today)");
  });
});

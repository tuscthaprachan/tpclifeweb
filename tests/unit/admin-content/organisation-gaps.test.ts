import { describe, expect, it } from "vitest";
import { organisationGaps } from "@/app/admin/content/organisations/gaps";

const COMPLETE = {
  contacts: [{ channel: "email" as const, value: "club@example.ac.th" }],
  locationEn: "Room 2",
  descriptionTh: "คำอธิบาย",
};

describe("organisationGaps", () => {
  it("reports nothing for a complete entry", () => {
    expect(organisationGaps(COMPLETE)).toEqual([]);
  });

  it("flags an Instagram-only entry", () => {
    expect(organisationGaps({ ...COMPLETE, contacts: [{ channel: "instagram", value: "club" }] })).toEqual(["contacts"]);
  });

  it("flags an entry with no contacts at all", () => {
    expect(organisationGaps({ ...COMPLETE, contacts: [] })).toEqual(["contacts"]);
  });

  it("ignores blank non-Instagram contacts", () => {
    expect(organisationGaps({ ...COMPLETE, contacts: [{ channel: "line", value: "  " }] })).toEqual(["contacts"]);
  });

  it("flags a missing location and description, treating whitespace as empty", () => {
    expect(organisationGaps({ ...COMPLETE, locationEn: " ", descriptionTh: null })).toEqual(["location", "description"]);
  });
});

import { describe, expect, it } from "vitest";
import { getPlaceHoursStatus, isLibrary, summariseLibraries } from "@/components/domain/home/openingHours";
import type { CampusPlace, OpeningHours } from "@/lib/content/types";

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

function place(openingHours: OpeningHours[], slug = "library"): CampusPlace {
  return {
    _id: "p",
    _type: "place",
    _createdAt: "",
    _updatedAt: "",
    name: { th: "หอสมุด", en: "Library" },
    slug: { current: slug },
    category: "welfare",
    openingHours,
  } as CampusPlace;
}

const pridi = place([
  { _key: "a", daysOfWeek: EVERY_DAY, opens: "08:30", closes: "21:30" },
  { _key: "b", daysOfWeek: EVERY_DAY, opens: "08:30", closes: "06:00", validFrom: "2026-11-16", validUntil: "2026-11-22" },
  { _key: "c", daysOfWeek: EVERY_DAY, opens: "08:30", closes: "23:00", validFrom: "2026-11-23", validUntil: "2026-11-30" },
]);

const at = (iso: string) => new Date(`${iso}+07:00`);

describe("getPlaceHoursStatus", () => {
  it("uses the weekly hours outside a dated range", () => {
    expect(getPlaceHoursStatus(pridi, at("2026-11-15T22:00:00"))).toMatchObject({ kind: "closed" });
    expect(getPlaceHoursStatus(pridi, at("2026-12-01T21:00:00"))).toMatchObject({ kind: "open", closes: "21:30" });
  });

  it("uses the dated hours inside the range, past midnight", () => {
    expect(getPlaceHoursStatus(pridi, at("2026-11-16T22:00:00"))).toMatchObject({ kind: "open", closes: "06:00", closesNextDay: true });
    expect(getPlaceHoursStatus(pridi, at("2026-11-17T03:00:00"))).toMatchObject({ kind: "open", closes: "06:00", closesNextDay: false });
    expect(getPlaceHoursStatus(pridi, at("2026-11-17T07:00:00"))).toMatchObject({ kind: "closed", opensNext: "08:30" });
  });

  it("carries the last late night into the next range", () => {
    expect(getPlaceHoursStatus(pridi, at("2026-11-23T05:00:00"))).toMatchObject({ kind: "open", closes: "06:00" });
    expect(getPlaceHoursStatus(pridi, at("2026-11-23T22:30:00"))).toMatchObject({ kind: "open", closes: "23:00" });
    expect(getPlaceHoursStatus(pridi, at("2026-11-24T01:00:00"))).toMatchObject({ kind: "closed" });
  });

  it("treats a date covered only by other days' dated rows as closed", () => {
    const puey = place([
      { _key: "a", daysOfWeek: [1, 2, 3, 4, 5, 6], opens: "08:00", closes: "16:00" },
      { _key: "b", daysOfWeek: [1, 2, 3, 4, 5], opens: "08:00", closes: "18:00", validFrom: "2026-11-18", validUntil: "2026-12-04" },
      { _key: "c", daysOfWeek: [6], opens: "08:00", closes: "16:00", validFrom: "2026-11-18", validUntil: "2026-12-04" },
    ]);
    expect(getPlaceHoursStatus(puey, at("2026-11-17T17:00:00"))).toMatchObject({ kind: "closed" });
    expect(getPlaceHoursStatus(puey, at("2026-11-18T17:00:00"))).toMatchObject({ kind: "open", closes: "18:00" });
    expect(getPlaceHoursStatus(puey, at("2026-11-22T10:00:00"))).toMatchObject({ kind: "closed" });
  });
});

describe("summariseLibraries", () => {
  const law = place([{ _key: "a", daysOfWeek: [1, 2, 3, 4, 5], opens: "08:30", closes: "21:30" }], "sanya-dharmasakti-library");
  const econ = place([{ _key: "a", daysOfWeek: [1, 2, 3, 4, 5, 6], opens: "08:00", closes: "16:00" }], "puey-ungphakorn-library-tha-prachan");

  it("recognises libraries by slug", () => {
    expect([law, econ, place([], "tu-virtual-clinic")].map(isLibrary)).toEqual([true, true, false]);
  });

  it("counts open libraries and names the one open latest", () => {
    const summary = summariseLibraries([pridi, law, econ], at("2026-11-16T17:00:00"));
    expect(summary).toMatchObject({ total: 3, open: 2, latest: { place: pridi, closes: "06:00", closesNextDay: true } });
    expect(summary.nextOpening).toBeUndefined();
  });

  it("names the first to open when all are closed", () => {
    const summary = summariseLibraries([law, econ], at("2026-11-17T07:00:00"));
    expect(summary).toMatchObject({ open: 0, nextOpening: { place: econ, opens: "08:00" } });
  });
});

import { describe, expect, it } from "vitest";
import { groupOrganisations } from "@/components/domain/directory/groupOrganisations";
import type { Organisation } from "@/lib/content/types";

function org(slug: string, th: string, en: string, extra: Partial<Organisation> = {}): Organisation {
  return {
    _id: slug,
    _type: "organisation",
    _createdAt: "2026-01-01T00:00:00.000Z",
    _updatedAt: "2026-01-01T00:00:00.000Z",
    name: { th, en },
    slug: { current: slug },
    type: "club",
    contacts: [],
    isActive: true,
    ...extra,
  };
}

const faculty = (th: string, en: string) => ({ th, en });

describe("groupOrganisations", () => {
  it("sorts clubs by the name in the active locale", () => {
    const clubs = [org("a", "ข", "Alpha"), org("b", "ก", "Beta"), org("c", "ค", "Chess")];
    expect(groupOrganisations(clubs, "en").clubs.map((o) => o.slug.current)).toEqual(["a", "b", "c"]);
    expect(groupOrganisations(clubs, "th").clubs.map((o) => o.slug.current)).toEqual(["b", "a", "c"]);
  });

  it("sorts faculty groups by the faculty name in the active locale", () => {
    const base = { type: "facultyCommittee" } as const;
    const orgs = [
      org("x", "ก", "X", { ...base, faculty: faculty("วิศวกรรมศาสตร์", "Engineering") }),
      org("y", "ข", "Y", { ...base, faculty: faculty("ครุศาสตร์", "Education") }),
      org("z", "ค", "Z", { ...base, faculty: faculty("ศิลปศาสตร์", "Arts") }),
    ];
    expect(groupOrganisations(orgs, "en").facultyGroups.map((g) => g.facultyKey)).toEqual([
      "Arts",
      "Education",
      "Engineering",
    ]);
    expect(groupOrganisations(orgs, "th").facultyGroups.map((g) => g.facultyKey)).toEqual([
      "Education",
      "Engineering",
      "Arts",
    ]);
  });

  it("puts the faculty-wide council first, then the rest by name", () => {
    const f = faculty("วิทยาศาสตร์", "Science");
    const base = { type: "facultyCommittee", faculty: f } as const;
    const orgs = [
      org("m", "ม", "Maths programme", { ...base, scope: "programme", programmeName: { th: "คณิต", en: "Maths" } }),
      org("c", "ซ", "Science council", { ...base, scope: "faculty" }),
      org("b", "บ", "Biology programme", { ...base, scope: "programme" }),
    ];
    const group = groupOrganisations(orgs, "en").facultyGroups[0]!;
    expect(group.organisations.map((o) => o.slug.current)).toEqual(["c", "b", "m"]);
  });

  it("keeps student bodies apart from university divisions", () => {
    const orgs = [org("u", "ก", "Registrar", { type: "universityDivision" }), org("s", "ข", "Student union", { type: "studentBody" })];
    const grouped = groupOrganisations(orgs, "en");
    expect(grouped.studentBodies.map((o) => o.slug.current)).toEqual(["s"]);
    expect(grouped.divisions.map((o) => o.slug.current)).toEqual(["u"]);
  });
});

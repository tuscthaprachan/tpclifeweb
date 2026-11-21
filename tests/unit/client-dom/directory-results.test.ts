// @vitest-environment jsdom
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { DirectoryResults } from "@/components/domain/directory/DirectoryResults";
import type { Faculty } from "@/lib/content/faculties";
import type { Organisation } from "@/lib/content/types";
import { render } from "../support/dom";

const law = { th: "คณะนิติศาสตร์", en: "Faculty of Law" };
const arts = { th: "คณะศิลปศาสตร์", en: "Faculty of Liberal Arts" };

function faculty(id: string, name: { th: string; en: string }, office: Faculty["office"] = {}): Faculty {
  const hasOffice = Object.values(office).some((v) => v !== undefined);
  return { _id: id, slug: id, name, office, hasOffice, councils: [], programmes: [] };
}

function org(slug: string, en: string, extra: Partial<Organisation>): Organisation {
  return {
    _id: slug,
    _type: "organisation",
    _createdAt: "2026-01-01T00:00:00.000Z",
    _updatedAt: "2026-01-01T00:00:00.000Z",
    name: { th: en, en },
    slug: { current: slug },
    type: "club",
    contacts: [{ _key: "k", channel: "instagram", value: slug }],
    isActive: true,
    ...extra,
  };
}

const faculties = [faculty("f-law", law, { email: "law@example.ac.th" }), faculty("f-arts", arts)];
const organisations = [
  org("law-council", "Law student council", { type: "facultyCommittee", faculty: law, facultyId: "f-law", scope: "faculty" }),
  org("registrar", "Registrar", { type: "universityDivision" }),
  org("union", "Student union", { type: "studentBody" }),
];

const section = (host: HTMLElement, heading: string) =>
  [...host.querySelectorAll("section")].find((s) => s.querySelector("h2")?.textContent === heading)!;

describe("DirectoryResults", () => {
  it("shows the faculty office and the student committees as separate, labelled sections", async () => {
    const view = await render(createElement(DirectoryResults, { locale: "en", organisations, faculties, query: {} }));
    const lawSection = section(view.host, "Faculty of Law");
    const subheadings = [...lawSection.querySelectorAll("h3")].map((h) => h.textContent);
    expect(subheadings).toEqual(["Faculty office", "Student committees"]);
    expect(lawSection.textContent).toContain("University staff");
    expect(lawSection.textContent).toContain("Run by students");
    expect(lawSection.querySelector('a[href="mailto:law@example.ac.th"]')).not.toBeNull();
  });

  it("lists a faculty with no committee, and says it has none", async () => {
    const view = await render(createElement(DirectoryResults, { locale: "en", organisations, faculties, query: {} }));
    expect(section(view.host, "Faculty of Liberal Arts").textContent).toContain("We do not list a student committee for this faculty yet.");
  });

  it("separates university offices from student bodies", async () => {
    const view = await render(createElement(DirectoryResults, { locale: "en", organisations, faculties, query: {} }));
    expect(section(view.host, "University offices").textContent).toContain("Registrar");
    expect(section(view.host, "University offices").textContent).toContain("University staff");
    expect(section(view.host, "Student bodies").textContent).toContain("Student union");
    expect(section(view.host, "Student bodies").textContent).not.toContain("Registrar");
  });

  it("hides faculty offices when filtering to committees", async () => {
    const view = await render(createElement(DirectoryResults, { locale: "en", organisations, faculties, query: { type: "facultyCommittee" } }));
    expect([...view.host.querySelectorAll("h3")].map((h) => h.textContent)).toEqual(["Student committees"]);
  });
});

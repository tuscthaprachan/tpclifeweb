import { and, eq, isNull } from "drizzle-orm";
import { ORGANISATIONS } from "../../../data/harvested-inventory";
import { directoryOrganisations } from "../schema/content/directory";
import { faculties } from "../schema/content/faculties";
import { published, type Bi, type SeedDb } from "./util";

/**
 * The faculties and colleges of the issue reporting service, and the link from
 * each faculty committee in the directory to its faculty.
 *
 * FACULTIES. Taken from the faculty text on the harvested organisations
 * (data/harvested-inventory.ts), names verbatim, so the Faculty of Social
 * Administration keeps the Thai spelling the source prints. Every office field
 * is seeded blank: editors fill in what is confirmed at
 * /admin/content/faculties, and the service shows only what is filled in. A
 * re-run refreshes the names but never touches the office fields or the order.
 *
 * SCOPE. A committee is the faculty-wide council (`faculty`) or the
 * association of one programme (`programme`). The harvested records do not say,
 * so it is inferred from the committee's formal Thai name in the handbook
 * (lib/db/seed/data/handbook.ts, ENRICHMENTS), which states what it is for:
 *
 *   - "คณะกรรมการนักศึกษา <คณะ or วิทยาลัย>" names a whole faculty or college:
 *     faculty scope. These are Liberal Arts, Social Administration, the
 *     College of Innovation, the College of Interdisciplinary Studies and
 *     Pridi Banomyong International College. Where a faculty has only one
 *     committee and nothing marks it as a programme, it is faculty scope.
 *   - A name that carries a programme ("สาขา...", "โครงการ...", "หลักสูตร...",
 *     or the international or combined degree variant) is a programme
 *     association: BAS, BCTU, BTi, RES, SEAS and Korean Studies (Liberal Arts),
 *     IBMP and BBA (Commerce and Accountancy), BE (Economics), BIR (Political
 *     Science), LL.B. (Law) and BJM (Journalism and Mass Communication).
 *     Their programme names are the ones the handbook prints.
 *
 * A faculty with only programme associations has no faculty-wide body; the
 * service then offers its programme associations and the faculty office.
 * Clubs and groups belong to no faculty and are not linked. The link and the
 * scope are filled in only while an organisation has no faculty yet, so a
 * re-seed never undoes an editor's change.
 */

interface FacultySeed {
  slug: string;
  name: Bi;
}

/** Slug by the English name printed on the source. */
const FACULTY_SLUGS: Record<string, string> = {
  "Faculty of Liberal Arts": "liberal-arts",
  "Faculty of Commerce and Accountancy": "commerce-and-accountancy",
  "Faculty of Economics": "economics",
  "Faculty of Political Science": "political-science",
  "Faculty of Law": "law",
  "Faculty of Social Administration": "social-administration",
  "Faculty of Journalism and Mass Communication": "journalism-and-mass-communication",
  "College of Innovation": "college-of-innovation",
  "College of Interdisciplinary Studies": "college-of-interdisciplinary-studies",
  "Pridi Banomyong International College": "pridi-banomyong-international-college",
};

export function buildFaculties(): FacultySeed[] {
  const seen = new Map<string, FacultySeed>();
  for (const org of ORGANISATIONS) {
    if (!("faculty" in org) || seen.has(org.faculty.en)) continue;
    const slug = FACULTY_SLUGS[org.faculty.en];
    if (!slug) throw new Error(`No faculty slug for ${org.faculty.en}`);
    seen.set(org.faculty.en, { slug, name: { th: org.faculty.th, en: org.faculty.en } });
  }
  return [...seen.values()];
}

export interface FacultyLink {
  faculty: string;
  scope: "faculty" | "programme";
  programme?: Bi;
}

const FACULTY = (faculty: string): FacultyLink => ({ faculty, scope: "faculty" });
const PROGRAMME = (faculty: string, programme: Bi): FacultyLink => ({ faculty, scope: "programme", programme });

/** By the committee's Instagram handle, which is its stable identity in the harvested data. */
export const FACULTY_LINKS: Record<string, FacultyLink> = {
  basictpc: FACULTY("liberal-arts"),
  basthammasat: PROGRAMME("liberal-arts", { th: "สาขาอังกฤษ - อเมริกันศึกษา หลักสูตรนานาชาติ", en: "British and American Studies (international programme)" }),
  "bctu.committee": PROGRAMME("liberal-arts", { th: "สาขาการสื่อสารเชิงธุรกิจ หลักสูตรนานาชาติ", en: "Business Communication (international programme)" }),
  btithammasat: PROGRAMME("liberal-arts", { th: "สาขาการแปลและล่ามในยุคดิจิทัล", en: "Translation and Interpreting in the Digital Age" }),
  "res.tu.official": PROGRAMME("liberal-arts", { th: "สาขารัสเซียและยูเรเซียศึกษา", en: "Russian and Eurasian Studies" }),
  seasthammasat: PROGRAMME("liberal-arts", { th: "โครงการเอเชียตะวันออกเฉียงใต้ศึกษา", en: "Southeast Asian Studies" }),
  "kstu.official": PROGRAMME("liberal-arts", { th: "สาขาเกาหลีศึกษา", en: "Korean Studies" }),
  "ibmp.studentpage": PROGRAMME("commerce-and-accountancy", { th: "หลักสูตรตรีควบโท", en: "IBMP (combined bachelor's and master's programme)" }),
  "bba.thammasat": PROGRAMME("commerce-and-accountancy", { th: "BBA หลักสูตรนานาชาติ", en: "BBA (international programme)" }),
  "scobe.thammasat": PROGRAMME("economics", { th: "BE หลักสูตรนานาชาติ", en: "BE (international programme)" }),
  student_birsa: PROGRAMME("political-science", { th: "สาขาการเมืองการระหว่างประเทศ", en: "Politics and International Relations (BIR)" }),
  llbthammasat_sc: PROGRAMME("law", { th: "นิติศาสตรบัณฑิต สาขาวิชากฎหมายธุรกิจ (หลักสูตรนานาชาติ)", en: "LL.B. Business Law (international programme)" }),
  spdstudentc: FACULTY("social-administration"),
  "bjm.tpc": PROGRAMME("journalism-and-mass-communication", { th: "สาขาวารสารศาสตร์และสื่อสารมวลชน หลักสูตรนานาชาติ", en: "Journalism and Mass Communication (international programme, BJM)" }),
  citu_sc: FACULTY("college-of-innovation"),
  thaprachanppe: FACULTY("college-of-interdisciplinary-studies"),
  "pbic.sctu": FACULTY("pridi-banomyong-international-college"),
};

/** Upserts the faculties, in the order the sources list them. Refreshes names only. */
export async function seedFaculties(db: SeedDb): Promise<void> {
  for (const [index, faculty] of buildFaculties().entries()) {
    await db
      .insert(faculties)
      .values({ ...published(), slug: faculty.slug, nameTh: faculty.name.th, nameEn: faculty.name.en, sortOrder: (index + 1) * 10 })
      .onConflictDoUpdate({ target: faculties.slug, set: { nameTh: faculty.name.th, nameEn: faculty.name.en } });
  }
}

/** Links one directory organisation to its faculty, unless it already has one. */
export async function linkOrganisationToFaculty(db: SeedDb, organisationSlug: string, link: FacultyLink): Promise<void> {
  const [faculty] = await db.select({ id: faculties.id }).from(faculties).where(eq(faculties.slug, link.faculty));
  if (!faculty) throw new Error(`Faculty ${link.faculty} is not seeded`);
  await db
    .update(directoryOrganisations)
    .set({ facultyId: faculty.id, scope: link.scope, programmeNameTh: link.programme?.th ?? null, programmeNameEn: link.programme?.en ?? null })
    .where(and(eq(directoryOrganisations.slug, organisationSlug), isNull(directoryOrganisations.facultyId)));
}

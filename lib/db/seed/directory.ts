import { ORGANISATIONS } from "../../../data/harvested-inventory";
import { directoryOrganisations, type OrganisationContactJson } from "../schema/content/directory";
import { ENRICHMENTS, NEW_ORGANISATION_DOCS } from "./data/handbook";
import { excludedSet, published, slugify, type Bi, type SeedDb } from "./util";

/**
 * The student directory: the 23 organisations harvested from the link trees
 * (data/harvested-inventory.ts), the handbook's additional ones, and the
 * handbook's Thai names and descriptions applied over the harvested entries
 * that only had an English display name (the old "enrichment" patches).
 *
 * Instagram handles are stored bare (no @, no URL), as
 * components/domain/directory/contactHref.ts expects.
 */

interface OrgRecord {
  slug: string;
  type: (typeof ORGANISATIONS)[number]["type"] | "club" | "independentGroup";
  name: Bi;
  faculty?: Bi;
  description?: Bi;
  contacts: OrganisationContactJson[];
}

/** The id the handbook data gives an organisation, which the handbook enrichments refer to. */
const handbookOrgId = (handle: string) => `organisation-${handle.replace(/\./g, "-")}`;

export function buildDirectory(): OrgRecord[] {
  const enrichments = new Map(ENRICHMENTS.map((e) => [e.id, e]));
  const records: OrgRecord[] = ORGANISATIONS.map((org) => {
    const base: OrgRecord = {
      slug: slugify(org.name),
      type: org.type,
      name: { th: "nameTh" in org && org.nameTh ? org.nameTh : org.name, en: org.name },
      faculty: "faculty" in org ? { th: org.faculty.th, en: org.faculty.en } : undefined,
      contacts: [{ channel: "instagram", value: org.handle }],
    };
    const enrichment = enrichments.get(handbookOrgId(org.handle));
    // Only fill in names that were never captured in Thai (th still equals en).
    if (enrichment && base.name.th.trim() === base.name.en.trim()) {
      base.name = enrichment.name;
      if (enrichment.description) base.description = enrichment.description;
    }
    return base;
  });

  for (const doc of NEW_ORGANISATION_DOCS) {
    const name = doc.name as Bi;
    const faculty = doc.faculty as Bi | undefined;
    const description = doc.description as Bi | undefined;
    records.push({
      slug: (doc.slug as { current: string }).current,
      type: doc.type as OrgRecord["type"],
      name: { th: name.th, en: name.en },
      faculty: faculty && { th: faculty.th, en: faculty.en },
      description: description && { th: description.th, en: description.en },
      contacts: (doc.contacts as Array<{ channel: OrganisationContactJson["channel"]; value: string }>).map((c) => ({
        channel: c.channel,
        value: c.value,
      })),
    });
  }
  return records;
}

export async function seedDirectory(db: SeedDb): Promise<void> {
  for (const org of buildDirectory()) {
    await db
      .insert(directoryOrganisations)
      .values({
        ...published(),
        slug: org.slug,
        nameTh: org.name.th,
        nameEn: org.name.en,
        type: org.type,
        facultyTh: org.faculty?.th ?? null,
        facultyEn: org.faculty?.en ?? null,
        descriptionTh: org.description?.th ?? null,
        descriptionEn: org.description?.en ?? null,
        contacts: org.contacts,
        isActive: true,
      })
      // organisation_id is set by hand (TUSU/TUSC entries); a re-seed must not clear it.
      .onConflictDoUpdate({ target: directoryOrganisations.slug, set: excludedSet(directoryOrganisations, ["organisationId"]) });
  }
}

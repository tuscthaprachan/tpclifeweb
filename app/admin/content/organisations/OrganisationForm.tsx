import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FormSection } from "@/components/admin/content/FormSection";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { DocumentCanvas } from "@/components/admin/content/DocumentCanvas";
import { ReferencePicker } from "@/components/admin/content/ReferencePicker";
import { BilingualTextarea, BilingualTextField, CheckboxField, EnumSelect, SlugField } from "@/components/admin/content/fields";
import { NotificationBanner, Stack } from "@/components/ui";
import { loadChoices, userNames } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { directoryOrganisations } from "@/lib/db/schema";
import { DIRECTORY_ORGANISATION_SCOPES, DIRECTORY_ORGANISATION_TYPES } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { ContactsField } from "./ContactsField";
import { organisationGaps, type OrganisationGap } from "./gaps";
import { deleteOrganisation, saveOrganisation } from "./actions";

const SCOPE_KEY: Record<(typeof DIRECTORY_ORGANISATION_SCOPES)[number], AdminKey> = {
  faculty: "dirScopeFaculty",
  programme: "dirScopeProgramme",
};

const TYPE_KEY: Record<(typeof DIRECTORY_ORGANISATION_TYPES)[number], AdminKey> = {
  facultyCommittee: "dirTypeFacultyCommittee",
  club: "dirTypeClub",
  independentGroup: "dirTypeIndependentGroup",
  universityDivision: "dirTypeUniversityDivision",
  studentBody: "dirTypeStudentBody",
};

const GAP_KEY: Record<OrganisationGap, AdminKey> = {
  contacts: "dirGapContacts",
  location: "dirGapLocation",
  description: "dirGapDescription",
};

/** The directory organisation form, for the "new" page (no `id`) and the edit page. */
export async function OrganisationForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("organisations")!;
  const [org] = id ? await db.select().from(directoryOrganisations).where(eq(directoryOrganisations.id, id)) : [];
  if (id && !org) notFound();
  const [names, facultyChoices] = await Promise.all([
    org ? userNames(db, [org.updatedBy]) : new Map<string, string>(),
    loadChoices(db, getContentType("faculties")!),
  ]);

  const record: ContentRecordInfo | undefined = org
    ? {
        id: org.id,
        status: org.status,
        updatedAt: org.updatedAt.toISOString(),
        updatedByName: org.updatedBy ? names.get(org.updatedBy) : null,
        viewHref: localePath(locale, "/directory"),
      }
    : undefined;
  const L = (key: AdminKey) => a(key, locale);
  const gaps = org ? organisationGaps(org) : [];

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveOrganisation.bind(null, org?.id ?? null)}
      deleteAction={org ? deleteOrganisation.bind(null, org.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      {gaps.length > 0 ? (
        <NotificationBanner variant="info" title={L("dirGapsTitle")}>
          <p className="m-0">{L("dirGapsIntro")}</p>
          <ul className="mt-[var(--space-2)] mb-0 list-disc pl-[var(--space-5)]">
            {gaps.map((gap) => (
              <li key={gap}>{L(GAP_KEY[gap])}</li>
            ))}
          </ul>
        </NotificationBanner>
      ) : null}
      <DocumentCanvas locale={locale}>
        <BilingualTextField appearance="title" name="name" label={L("dirFieldName")} maxLength={150} defaultValue={{ th: org?.nameTh, en: org?.nameEn }} />
        <BilingualTextarea appearance="lead" name="description" label={L("dirFieldDescription")} maxLength={1500} rows={4} defaultValue={{ th: org?.descriptionTh, en: org?.descriptionEn }} />
        <BilingualTextField appearance="text" name="location" label={L("dirFieldLocation")} hint={L("dirHintLocation")} maxLength={200} defaultValue={{ th: org?.locationTh, en: org?.locationEn }} />
      </DocumentCanvas>
      <FormSection icon="organisations" id="org-about" legend={L("dirGroupAbout")}>
        <Stack space={4}>
          <SlugField label={L("fieldSlug")} suggestFrom="name.en" defaultValue={org?.slug} />
          <EnumSelect
            name="type"
            label={L("dirFieldType")}
            defaultValue={org?.type ?? ""}
            options={[{ value: "", label: L("choiceSelect") }, ...DIRECTORY_ORGANISATION_TYPES.map((value) => ({ value, label: L(TYPE_KEY[value]) }))]}
          />
          <BilingualTextField name="faculty" label={L("dirFieldFaculty")} hint={L("dirHintFaculty")} maxLength={150} defaultValue={{ th: org?.facultyTh, en: org?.facultyEn }} />
          <ReferencePicker name="facultyId" label={L("dirFieldFacultyLink")} hint={L("dirHintFacultyLink")} options={facultyChoices} defaultValue={org?.facultyId} />
          <EnumSelect
            name="scope"
            label={L("dirFieldScope")}
            hint={L("dirHintScope")}
            defaultValue={org?.scope ?? ""}
            options={[{ value: "", label: L("choiceSelect") }, ...DIRECTORY_ORGANISATION_SCOPES.map((value) => ({ value, label: L(SCOPE_KEY[value]) }))]}
          />
          <BilingualTextField name="programme" label={L("dirFieldProgramme")} hint={L("dirHintProgramme")} maxLength={150} defaultValue={{ th: org?.programmeNameTh, en: org?.programmeNameEn }} />
          <CheckboxField name="isActive" label={L("dirFieldActive")} hint={L("dirHintActive")} defaultChecked={org?.isActive ?? true} />
        </Stack>
      </FormSection>
      <ContactsField defaultValue={org?.contacts ?? []} />
    </ContentForm>
  );
}

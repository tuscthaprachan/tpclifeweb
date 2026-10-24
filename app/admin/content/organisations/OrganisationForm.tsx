import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, CheckboxField, EnumSelect, SlugField } from "@/components/admin/content/fields";
import { Fieldset, Stack } from "@/components/ui";
import { userNames } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { directoryOrganisations } from "@/lib/db/schema";
import { DIRECTORY_ORGANISATION_TYPES } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { ContactsField } from "./ContactsField";
import { deleteOrganisation, saveOrganisation } from "./actions";

const TYPE_KEY: Record<(typeof DIRECTORY_ORGANISATION_TYPES)[number], AdminKey> = {
  facultyCommittee: "dirTypeFacultyCommittee",
  club: "dirTypeClub",
  independentGroup: "dirTypeIndependentGroup",
  universityDivision: "dirTypeUniversityDivision",
  studentBody: "dirTypeStudentBody",
};

/** The directory organisation form, for the "new" page (no `id`) and the edit page. */
export async function OrganisationForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("organisations")!;
  const [org] = id ? await db.select().from(directoryOrganisations).where(eq(directoryOrganisations.id, id)) : [];
  if (id && !org) notFound();
  const names = org ? await userNames(db, [org.updatedBy]) : new Map<string, string>();

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
      <Fieldset id="org-about" legend={L("dirGroupAbout")}>
        <Stack space={4}>
          <BilingualTextField name="name" label={L("dirFieldName")} maxLength={150} defaultValue={{ th: org?.nameTh, en: org?.nameEn }} />
          <SlugField label={L("fieldSlug")} suggestFrom="name.en" defaultValue={org?.slug} />
          <EnumSelect
            name="type"
            label={L("dirFieldType")}
            defaultValue={org?.type ?? ""}
            options={[{ value: "", label: L("choiceSelect") }, ...DIRECTORY_ORGANISATION_TYPES.map((value) => ({ value, label: L(TYPE_KEY[value]) }))]}
          />
          <BilingualTextField name="faculty" label={L("dirFieldFaculty")} hint={L("dirHintFaculty")} maxLength={150} defaultValue={{ th: org?.facultyTh, en: org?.facultyEn }} />
          <BilingualTextarea name="description" label={L("dirFieldDescription")} maxLength={1500} rows={4} defaultValue={{ th: org?.descriptionTh, en: org?.descriptionEn }} />
          <BilingualTextField name="location" label={L("dirFieldLocation")} hint={L("dirHintLocation")} maxLength={200} defaultValue={{ th: org?.locationTh, en: org?.locationEn }} />
          <CheckboxField name="isActive" label={L("dirFieldActive")} hint={L("dirHintActive")} defaultChecked={org?.isActive ?? true} />
        </Stack>
      </Fieldset>
      <ContactsField defaultValue={org?.contacts ?? []} />
    </ContentForm>
  );
}

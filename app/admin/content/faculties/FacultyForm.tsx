import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, SlugField, TextField } from "@/components/admin/content/fields";
import { Fieldset, NotificationBanner, Stack } from "@/components/ui";
import { userNames } from "@/lib/admin/content/list";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { faculties } from "@/lib/db/schema";
import { a, type AdminKey } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { deleteFaculty, saveFaculty } from "./actions";
import { facultyUsage } from "./usage";

/** The faculty form, for the "new" page (no `id`) and the edit page. `error` is "inUse" after a refused delete. */
export async function FacultyForm({ locale, id, saved, error }: { locale: Locale; id?: string; saved?: string; error?: string }) {
  const db = getDb();
  const def = getContentType("faculties")!;
  const [faculty] = id ? await db.select().from(faculties).where(eq(faculties.id, id)) : [];
  if (id && !faculty) notFound();
  const names = faculty ? await userNames(db, [faculty.updatedBy]) : new Map<string, string>();
  const usage = faculty && error === "inUse" ? await facultyUsage(db, faculty.id) : null;

  const record: ContentRecordInfo | undefined = faculty
    ? {
        id: faculty.id,
        status: faculty.status,
        updatedAt: faculty.updatedAt.toISOString(),
        updatedByName: faculty.updatedBy ? names.get(faculty.updatedBy) : null,
      }
    : undefined;
  const L = (key: AdminKey) => a(key, locale);
  const uses = usage
    ? [
        usage.organisations > 0 ? a("facUseOrganisations", locale, { n: usage.organisations }) : null,
        usage.redirects > 0 ? a("facUseRedirects", locale, { n: usage.redirects }) : null,
      ]
        .filter(Boolean)
        .join(locale === "th" ? " " : ", ")
    : "";

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveFaculty.bind(null, faculty?.id ?? null)}
      deleteAction={faculty ? deleteFaculty.bind(null, faculty.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      {usage && usage.total > 0 ? (
        <NotificationBanner variant="warning" title={L("facInUseTitle")}>
          {a("facInUseBody", locale, { uses })}
        </NotificationBanner>
      ) : null}
      <Fieldset id="faculty-about" legend={L("facGroupAbout")}>
        <Stack space={4}>
          <BilingualTextField name="name" label={L("dirFieldName")} maxLength={150} defaultValue={{ th: faculty?.nameTh, en: faculty?.nameEn }} />
          <SlugField label={L("fieldSlug")} suggestFrom="name.en" defaultValue={faculty?.slug} />
          <TextField
            name="sortOrder"
            type="number"
            inputMode="numeric"
            label={L("facFieldSortOrder")}
            hint={L("facHintSortOrder")}
            defaultValue={faculty?.sortOrder.toString() ?? "0"}
            className="max-w-[12rem]"
          />
        </Stack>
      </Fieldset>
      <Fieldset id="faculty-office" legend={L("facGroupOffice")}>
        <Stack space={4}>
          <p className="m-0 text-ink-600">{L("facHintOffice")}</p>
          <BilingualTextField
            name="location"
            label={L("facFieldOfficeLocation")}
            hint={L("facHintOfficeLocation")}
            maxLength={300}
            defaultValue={{ th: faculty?.officeLocationTh, en: faculty?.officeLocationEn }}
          />
          <TextField name="phone" label={L("facFieldOfficePhone")} maxLength={60} inputMode="text" defaultValue={faculty?.officePhone ?? ""} />
          <TextField name="email" label={L("facFieldOfficeEmail")} maxLength={254} defaultValue={faculty?.officeEmail ?? ""} />
          <TextField name="website" label={L("facFieldOfficeWebsite")} inputMode="url" defaultValue={faculty?.officeWebsite ?? ""} />
          <BilingualTextarea
            name="note"
            label={L("facFieldOfficeNote")}
            hint={L("facHintOfficeNote")}
            maxLength={500}
            rows={3}
            defaultValue={{ th: faculty?.officeNoteTh, en: faculty?.officeNoteEn }}
          />
        </Stack>
      </Fieldset>
    </ContentForm>
  );
}

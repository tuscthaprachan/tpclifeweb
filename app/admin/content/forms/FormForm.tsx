import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, CheckboxField, DateField, EnumSelect, SlugField, TextField } from "@/components/admin/content/fields";
import { BilingualRichTextField } from "@/components/admin/content/RichTextEditor";
import { Fieldset, NotificationBanner } from "@/components/ui";
import { categoryOptions, ownerOptions } from "@/lib/admin/content/options";
import { userNames } from "@/lib/admin/content/list";
import { loadRichTextRefs } from "@/lib/admin/content/refs";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { forms } from "@/lib/db/schema";
import { FORM_DESTINATIONS, SIGN_IN_TYPES } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { Group } from "../_pages/Group";
import { ObjectListField } from "../_pages/ObjectListField";
import { deleteFormRecord, saveFormRecord } from "./actions";
import { findFormUsages, type FormUsageKind } from "./usage";
import { CONTACT_CHANNELS } from "./validate";

const USE_LABEL: Record<FormUsageKind, AdminKey> = {
  news: "formsUseNews",
  event: "formsUseEvent",
  policy: "formsUsePolicy",
  guide: "formsUseGuide",
  welfare: "formsUseWelfare",
  faq: "formsUseFaq",
  form: "formsUseForm",
};

/**
 * The form record's form, for the "new" page (no `id`) and the edit page.
 * `notice` is "inuse" after a refused delete, which lists where the form is
 * still used.
 */
export async function FormForm({ locale, id, saved, notice }: { locale: Locale; id?: string; saved?: string; notice?: string }) {
  const db = getDb();
  const def = getContentType("forms")!;
  const refs = await loadRichTextRefs(db);

  const [form] = id ? await db.select().from(forms).where(eq(forms.id, id)) : [];
  if (id && !form) notFound();
  const [names, usages] = form
    ? await Promise.all([userNames(db, [form.updatedBy]), notice === "inuse" ? findFormUsages(db, form.id) : []])
    : [new Map<string, string>(), []];

  const record: ContentRecordInfo | undefined = form
    ? {
        id: form.id,
        status: form.status,
        updatedAt: form.updatedAt.toISOString(),
        updatedByName: form.updatedBy ? names.get(form.updatedBy) : null,
        viewHref: localePath(locale, `${def.viewPath}/${form.slug}`),
      }
    : undefined;
  const L = (key: AdminKey) => a(key, locale);
  const pair = (th?: string | null, en?: string | null) => ({ th, en });

  return (
    <>
      {usages.length > 0 ? (
        <NotificationBanner variant="warning" title={L("formsInUseTitle")}>
          <p>{L("formsInUseBody")}</p>
          <ul>
            {usages.map((use) => (
              <li key={`${use.kind}:${use.id}`}>
                <Link href={contentPath({ segment: use.segment }, use.id)}>
                  {L(USE_LABEL[use.kind])}: {pick(use.title, locale) || use.title.th || use.title.en || L("untitled")}
                </Link>
              </li>
            ))}
          </ul>
        </NotificationBanner>
      ) : null}
      <ContentForm
        key={record?.updatedAt}
        locale={locale}
        action={saveFormRecord.bind(null, form?.id ?? null)}
        deleteAction={form ? deleteFormRecord.bind(null, form.id) : undefined}
        record={record}
        listHref={contentPath(def)}
        saved={saved}
      >
        <Group icon="forms" id="group-basics" legend={L("formsGroupBasics")}>
          <BilingualTextField name="title" label={L("fieldTitle")} maxLength={200} defaultValue={pair(form?.titleTh, form?.titleEn)} />
          <SlugField label={L("fieldSlug")} defaultValue={form?.slug} />
          <BilingualTextField name="purpose" label={L("formsFieldPurpose")} hint={L("formsHintPurpose")} maxLength={300} defaultValue={pair(form?.purposeTh, form?.purposeEn)} />
          <BilingualRichTextField name="description" label={L("formsFieldDescription")} refs={refs} defaultValue={{ th: form?.descriptionTh, en: form?.descriptionEn }} />
          <EnumSelect
            name="category"
            label={L("fieldCategory")}
            hint={L("pagesHintCategory")}
            defaultValue={form?.category ?? ""}
            options={[{ value: "", label: L("choiceSelect") }, ...categoryOptions(locale)]}
          />
          <EnumSelect
            name="owner"
            label={L("fieldOwner")}
            defaultValue={form?.owner ?? ""}
            options={[{ value: "", label: L("choiceSelect") }, ...ownerOptions(locale)]}
          />
          <BilingualTextarea name="audience" label={L("formsFieldAudience")} hint={L("formsHintAudience")} rows={2} maxLength={500} defaultValue={pair(form?.audienceTh, form?.audienceEn)} />
        </Group>

        <Group icon="check" id="group-before" legend={L("formsGroupBefore")}>
          <ObjectListField
            name="prerequisites"
            label={L("formsFieldPrerequisites")}
            hint={L("formsHintPrerequisites")}
            itemLabel={L("formsFieldPrerequisite")}
            max={30}
            fields={[
              { key: "label", type: "bilingual", label: L("formsFieldPrerequisiteLabel") },
              { key: "detail", type: "bilingual", label: L("formsFieldPrerequisiteDetail"), multiline: true },
            ]}
            defaultValue={(form?.prerequisites ?? []).map((p) => ({ label: p.label, detail: p.detail }))}
          />
        </Group>

        <Group icon="viewLive" id="group-destination" legend={L("formsGroupDestination")}>
          <EnumSelect
            name="destinationType"
            label={L("formsFieldDestinationType")}
            defaultValue={form?.destinationType ?? ""}
            options={[
              { value: "", label: L("choiceSelect") },
              ...FORM_DESTINATIONS.map((value) => ({ value, label: L(`formsDestination_${value}` as AdminKey) })),
            ]}
          />
          <TextField name="destinationUrl" label={L("formsFieldDestinationUrl")} hint={L("formsHintDestinationUrl")} defaultValue={form?.destinationUrl} maxLength={2048} className="max-w-[40rem]" />
        </Group>

        <Group icon="security" id="group-signin" legend={L("formsGroupSignIn")} hint={L("formsHintSignIn")}>
          <CheckboxField name="requiresSignIn" label={L("formsFieldRequiresSignIn")} hint={L("formsHintRequiresSignIn")} defaultChecked={form?.requiresSignIn ?? false} />
          <EnumSelect
            name="signInType"
            label={L("formsFieldSignInType")}
            defaultValue={form?.signInType ?? ""}
            options={[
              { value: "", label: L("choiceNone") },
              ...SIGN_IN_TYPES.map((value) => ({ value, label: L(`formsSignIn_${value}` as AdminKey) })),
            ]}
          />
          <BilingualTextarea name="signInNote" label={L("formsFieldSignInNote")} rows={2} maxLength={500} defaultValue={pair(form?.signInNoteTh, form?.signInNoteEn)} />
        </Group>

        <Group icon="overdue" id="group-timing" legend={L("formsGroupTiming")}>
          <TextField name="estimatedMinutes" type="number" inputMode="numeric" label={L("formsFieldMinutes")} hint={L("formsHintMinutes")} defaultValue={form?.estimatedMinutes?.toString()} className="max-w-[12rem]" />
          <BilingualTextField name="turnaround" label={L("formsFieldTurnaround")} hint={L("formsHintTurnaround")} maxLength={300} defaultValue={pair(form?.turnaroundTh, form?.turnaroundEn)} />
          <DateField name="deadline" label={L("formsFieldDeadline")} defaultValue={form?.deadline} />
          <Fieldset id="group-contact" legend={L("formsFieldContact")} hint={L("formsHintContact")}>
            <div className="flex flex-col gap-[var(--space-5)]">
            <BilingualTextField name="contact.label" label={L("formsFieldContactLabel")} maxLength={200} defaultValue={pair(form?.contact?.label.th, form?.contact?.label.en)} />
            <EnumSelect
              name="contact.channel"
              label={L("blockContactChannel")}
              defaultValue={form?.contact?.channel ?? ""}
              options={[{ value: "", label: L("choiceSelect") }, ...CONTACT_CHANNELS.map((value) => ({ value, label: L(`channel_${value}` as AdminKey) }))]}
            />
            <TextField name="contact.value" label={L("formsFieldContactValue")} hint={L("blockContactValueHint")} defaultValue={form?.contact?.value} maxLength={300} className="max-w-[32rem]" />
            <BilingualTextField name="contact.hours" label={L("blockContactHours")} maxLength={200} defaultValue={pair(form?.contact?.hours?.th, form?.contact?.hours?.en)} />
          </div>
          </Fieldset>
        </Group>

        <Group icon="info" id="group-visibility" legend={L("formsGroupVisibility")}>
          <CheckboxField name="isActive" label={L("formsFieldIsActive")} hint={L("formsHintIsActive")} defaultChecked={form?.isActive ?? true} />
          <CheckboxField name="isPriority" label={L("formsFieldIsPriority")} hint={L("formsHintIsPriority")} defaultChecked={form?.isPriority ?? false} />
          <DateField name="lastVerified" label={L("formsFieldLastVerified")} hint={L("formsHintLastVerified")} defaultValue={form?.lastVerified} />
        </Group>
      </ContentForm>
    </>
  );
}

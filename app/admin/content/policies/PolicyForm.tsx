import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FormSection } from "@/components/admin/content/FormSection";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, DateField, EnumSelect, SlugField, TextField } from "@/components/admin/content/fields";
import { ReferencePicker } from "@/components/admin/content/ReferencePicker";
import { BilingualRichTextField } from "@/components/admin/content/RichTextEditor";
import { Stack } from "@/components/ui";
import { formatBangkokDateTime } from "@/lib/admin/content/datetime";
import { loadChoices, userNames } from "@/lib/admin/content/list";
import { ownerOptions } from "@/lib/admin/content/options";
import { loadRichTextRefs } from "@/lib/admin/content/refs";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { policies, policyUpdates } from "@/lib/db/schema";
import { POLICY_STATUSES } from "@/lib/db/schema/content/enums";
import { a, type AdminKey } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { UI } from "@/lib/i18n/strings";
import { deletePolicy, savePolicy } from "./actions";
import { EvidenceLinksField, PolicyUpdatesField } from "./PolicyRepeaters";

const STATUS_LABEL = {
  notStarted: UI.statusNotStarted,
  inProgress: UI.statusInProgress,
  delivered: UI.statusDelivered,
  blocked: UI.statusBlocked,
  dropped: UI.statusDropped,
} as const;

/** The policy form with its progress updates and evidence links, for the "new" page (no `id`) and the edit page. */
export async function PolicyForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("policies")!;
  const refs = await loadRichTextRefs(db);

  const [policy] = id ? await db.select().from(policies).where(eq(policies.id, id)) : [];
  if (id && !policy) notFound();
  const [updates, names, others] = await Promise.all([
    policy ? db.select().from(policyUpdates).where(eq(policyUpdates.policyId, policy.id)).orderBy(asc(policyUpdates.position)) : [],
    userNames(db, [policy?.updatedBy]),
    loadChoices(db, def),
  ]);

  const record: ContentRecordInfo | undefined = policy
    ? {
        id: policy.id,
        status: policy.status,
        updatedAt: policy.updatedAt.toISOString(),
        updatedByName: policy.updatedBy ? names.get(policy.updatedBy) : null,
        viewHref: localePath(locale, `/policy/${policy.slug}`),
      }
    : undefined;
  const L = (key: AdminKey) => a(key, locale);
  const statusOptions = POLICY_STATUSES.map((value) => ({ value, label: STATUS_LABEL[value][locale] }));
  const today = formatBangkokDateTime(new Date()).slice(0, 10);

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={savePolicy.bind(null, policy?.id ?? null)}
      deleteAction={policy ? deletePolicy.bind(null, policy.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      <FormSection icon="edit" legend={L("policiesGroupAbout")} id="g-about">
        <Stack space={4}>
          <BilingualTextField name="title" label={L("fieldTitle")} maxLength={200} defaultValue={{ th: policy?.titleTh, en: policy?.titleEn }} />
          <SlugField label={L("fieldSlug")} defaultValue={policy?.slug} />
          <BilingualTextarea name="summary" label={L("fieldSummary")} hint={L("hintSummary")} maxLength={500} rows={3} defaultValue={{ th: policy?.summaryTh, en: policy?.summaryEn }} />
          <BilingualRichTextField name="detail" label={L("policiesFieldDetail")} refs={refs} defaultValue={{ th: policy?.detailTh, en: policy?.detailEn }} />
          <EnumSelect name="owner" label={L("fieldOwner")} defaultValue={policy?.owner ?? ""} options={[{ value: "", label: L("choiceSelect") }, ...ownerOptions(locale)]} />
          <BilingualTextField name="area" label={L("policiesFieldArea")} hint={L("policiesHintArea")} maxLength={100} defaultValue={{ th: policy?.policyAreaTh, en: policy?.policyAreaEn }} />
        </Stack>
      </FormSection>

      <FormSection icon="performance" legend={L("policiesGroupProgress")} id="g-progress">
        <Stack space={4}>
          <EnumSelect name="policyStatus" label={L("policiesFieldStatus")} defaultValue={policy?.policyStatus ?? "notStarted"} options={statusOptions} />
          <TextField
            name="progress"
            label={L("policiesFieldProgress")}
            hint={L("policiesHintProgress")}
            type="number"
            inputMode="numeric"
            defaultValue={policy?.progressPercent?.toString()}
            className="max-w-[12rem]"
          />
          <DateField name="startedAt" label={L("policiesFieldStarted")} defaultValue={policy?.startedAt} />
          <DateField name="targetDate" label={L("policiesFieldTarget")} defaultValue={policy?.targetDate} />
          <DateField name="completedAt" label={L("policiesFieldCompleted")} defaultValue={policy?.completedAt} />
        </Stack>
      </FormSection>

      <FormSection icon="policies" legend={L("policiesGroupUpdates")} id="g-updates">
        <PolicyUpdatesField
          statusOptions={statusOptions}
          defaultValue={updates.map((u) => ({
            date: u.date,
            note: { th: u.noteTh, en: u.noteEn },
            status: u.policyStatus,
            author: { th: u.authorTh ?? "", en: u.authorEn ?? "" },
            evidenceUrl: u.evidenceUrl ?? "",
          }))}
          newRow={{ date: today, note: { th: "", en: "" }, status: policy?.policyStatus ?? "notStarted", author: { th: "", en: "" }, evidenceUrl: "" }}
        />
      </FormSection>

      <FormSection icon="forms" legend={L("policiesGroupLinks")} id="g-links">
        <Stack space={4}>
          <ReferencePicker
            name="oversightOf"
            label={L("policiesFieldOversight")}
            hint={L("policiesHintOversight")}
            options={others.filter((o) => o.value !== policy?.id)}
            defaultValue={policy?.oversightOfId}
          />
          <EvidenceLinksField
            defaultValue={(policy?.evidenceLinks ?? []).map((link) => ({
              label: { th: link.label.th, en: link.label.en },
              url: link.url,
              description: { th: link.description?.th ?? "", en: link.description?.en ?? "" },
              requiresSignIn: link.requiresSignIn ?? false,
            }))}
          />
        </Stack>
      </FormSection>
    </ContentForm>
  );
}

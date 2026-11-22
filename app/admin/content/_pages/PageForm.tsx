import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, DateField, EnumSelect, SlugField, TextareaField, TextField } from "@/components/admin/content/fields";
import { BilingualRichTextField } from "@/components/admin/content/RichTextEditor";
import { ReferencePicker, type ReferenceChoice } from "@/components/admin/content/ReferencePicker";
import { categoryOptions } from "@/lib/admin/content/options";
import { userNames } from "@/lib/admin/content/list";
import { loadRichTextRefs } from "@/lib/admin/content/refs";
import { contentPath, getContentType, viewPathOf } from "@/lib/admin/content/types";
import { SECTIONS } from "@/lib/content/sections";
import { getDb } from "@/lib/db";
import { contentPageForms, contentPageRelated, contentPages } from "@/lib/db/schema";
import { CONTENT_SECTIONS } from "@/lib/db/schema/content/enums";
import { a } from "@/lib/i18n/admin";
import { localePath, pick, type Locale } from "@/lib/i18n/config";
import { deleteTopicPage, saveTopicPage } from "../topics/actions";
import { Group } from "./Group";
import { ObjectListField } from "./ObjectListField";

/** Every other topic page, labelled with its section, for the related-pages picker. */
async function relatedPageChoices(excludeId?: string): Promise<ReferenceChoice[]> {
  const rows = await getDb()
    .select({ id: contentPages.id, section: contentPages.section, titleTh: contentPages.titleTh, titleEn: contentPages.titleEn })
    .from(contentPages)
    .orderBy(asc(contentPages.section), asc(contentPages.sortOrder), asc(contentPages.titleEn))
    .limit(1000);
  return rows
    .filter((r) => r.id !== excludeId)
    .map((r) => ({
      value: r.id,
      label: {
        th: a("pagesRelatedLabel", "th", { section: pick(SECTIONS[r.section].label, "th"), title: r.titleTh || r.titleEn }),
        en: a("pagesRelatedLabel", "en", { section: pick(SECTIONS[r.section].label, "en"), title: r.titleEn || r.titleTh }),
      },
    }));
}

/** The topic page form, for the "new" page (no `id`) and the edit page. */
export async function PageForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("topics")!;
  const refs = await loadRichTextRefs(db);

  const [page] = id ? await db.select().from(contentPages).where(eq(contentPages.id, id)) : [];
  if (id && !page) notFound();
  const [formLinks, relatedLinks, names, relatedChoices] = await Promise.all([
    page ? db.select().from(contentPageForms).where(eq(contentPageForms.pageId, page.id)).orderBy(asc(contentPageForms.position)) : [],
    page ? db.select().from(contentPageRelated).where(eq(contentPageRelated.pageId, page.id)).orderBy(asc(contentPageRelated.position)) : [],
    page ? userNames(db, [page.updatedBy]) : new Map<string, string>(),
    relatedPageChoices(page?.id),
  ]);

  const record: ContentRecordInfo | undefined = page
    ? {
        id: page.id,
        status: page.status,
        updatedAt: page.updatedAt.toISOString(),
        publishAt: page.publishAt?.toISOString() ?? null,
        unpublishAt: page.unpublishAt?.toISOString() ?? null,
        updatedByName: page.updatedBy ? names.get(page.updatedBy) : null,
        viewHref: localePath(locale, viewPathOf(def, page)!),
      }
    : undefined;
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const actions = { save: saveTopicPage, remove: deleteTopicPage };

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={actions.save.bind(null, page?.id ?? null)}
      deleteAction={page ? actions.remove.bind(null, page.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
      details={
        <>
          <EnumSelect
            name="category"
            label={L("fieldCategory")}
            hint={L("pagesHintCategory")}
            defaultValue={page?.category ?? ""}
            options={[{ value: "", label: L("choiceSelect") }, ...categoryOptions(locale)]}
          />
          <TextField name="sortOrder" type="number" inputMode="numeric" label={L("pagesFieldSortOrder")} hint={L("pagesHintSortOrder")} defaultValue={page?.sortOrder?.toString()} className="max-w-[12rem]" />
          <DateField name="lastReviewed" label={L("pagesFieldLastReviewed")} hint={L("pagesHintLastReviewed")} defaultValue={page?.lastReviewed} />
        </>
      }
    >
      <Group icon="topics" id="group-where" legend={L("pagesGroupWhere")}>
        <EnumSelect
          name="section"
          label={L("pagesFieldSection")}
          hint={L("pagesHintSection")}
          defaultValue={page?.section ?? ""}
          options={[{ value: "", label: L("choiceSelect") }, ...CONTENT_SECTIONS.map((value) => ({ value, label: pick(SECTIONS[value].label, locale) }))]}
        />
        <TextareaField name="userNeed" label={L("pagesFieldUserNeed")} hint={L("pagesHintUserNeed")} defaultValue={page?.userNeed} rows={4} />
      </Group>

      <Group icon="edit" id="group-text" legend={L("pagesGroupText")}>
        <BilingualTextField name="title" label={L("fieldTitle")} maxLength={200} defaultValue={{ th: page?.titleTh, en: page?.titleEn }} />
        <SlugField label={L("fieldSlug")} defaultValue={page?.slug} />
        <BilingualTextarea name="summary" label={L("fieldSummary")} hint={L("hintSummary")} maxLength={500} rows={3} defaultValue={{ th: page?.summaryTh, en: page?.summaryEn }} />
        <BilingualRichTextField name="body" label={L("fieldBody")} refs={refs} defaultValue={{ th: page?.bodyTh, en: page?.bodyEn }} />
      </Group>

      <Group icon="forms" id="group-related" legend={L("pagesGroupRelated")}>
        <ReferencePicker name="forms" label={L("pagesFieldRelatedForms")} hint={L("pagesHintRelatedForms")} multiple options={refs.forms} defaultValue={formLinks.map((l) => l.formId)} />
        <ReferencePicker name="related" label={L("pagesFieldRelatedPages")} hint={L("pagesHintRelatedPages")} multiple options={relatedChoices} defaultValue={relatedLinks.map((l) => l.relatedPageId)} />
        <ObjectListField
          name="links"
          label={L("pagesFieldLinks")}
          hint={L("pagesHintLinks")}
          itemLabel={L("pagesFieldLink")}
          fields={[
            { key: "label", type: "bilingual", label: L("pagesFieldLinkLabel") },
            { key: "url", type: "url", label: L("pagesFieldLinkUrl"), maxLength: 2048 },
            { key: "description", type: "bilingual", label: L("pagesFieldLinkDescription") },
            { key: "requiresSignIn", type: "checkbox", label: L("blockLinkSignInLabel") },
          ]}
          defaultValue={(page?.relatedLinks ?? []).map((l) => ({ label: l.label, url: l.url, description: l.description, requiresSignIn: l.requiresSignIn === true }))}
        />
      </Group>
    </ContentForm>
  );
}

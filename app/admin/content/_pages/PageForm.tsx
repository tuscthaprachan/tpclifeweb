import { asc, and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualTextarea, BilingualTextField, DateField, EnumSelect, SlugField, TextField } from "@/components/admin/content/fields";
import { BilingualRichTextField } from "@/components/admin/content/RichTextEditor";
import { ReferencePicker, type ReferenceChoice } from "@/components/admin/content/ReferencePicker";
import { categoryOptions } from "@/lib/admin/content/options";
import { listContentRows, userNames } from "@/lib/admin/content/list";
import { loadRichTextRefs } from "@/lib/admin/content/refs";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { contentPageForms, contentPageRelated, contentPages } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { deleteGuidePage, saveGuidePage } from "../guides/actions";
import { deleteWelfarePage, saveWelfarePage } from "../welfare/actions";
import { Group } from "./Group";
import { ObjectListField } from "./ObjectListField";
import type { ContentPageKind } from "./validate";

const SEGMENT = { guide: "guides", welfare: "welfare" } as const;
const ACTIONS = {
  guide: { save: saveGuidePage, remove: deleteGuidePage },
  welfare: { save: saveWelfarePage, remove: deleteWelfarePage },
} as const;

/** Every other guide and welfare page, labelled with its kind, for the related-pages picker. */
async function relatedPageChoices(excludeId?: string): Promise<ReferenceChoice[]> {
  const db = getDb();
  const kinds: [ContentPageKind, "pagesKindGuide" | "pagesKindWelfare"][] = [
    ["guide", "pagesKindGuide"],
    ["welfare", "pagesKindWelfare"],
  ];
  const lists = await Promise.all(
    kinds.map(async ([kind, key]) => {
      const { rows } = await listContentRows(db, getContentType(SEGMENT[kind])!, { limit: 1000 });
      return rows
        .filter((r) => r.id !== excludeId)
        .map((r) => ({
          value: r.id,
          label: {
            th: a("pagesKindLabel", "th", { kind: a(key, "th"), title: r.title.th || r.title.en }),
            en: a("pagesKindLabel", "en", { kind: a(key, "en"), title: r.title.en || r.title.th }),
          },
        }));
    }),
  );
  return lists.flat();
}

/**
 * The guide and welfare page form, for the "new" page (no `id`) and the edit
 * page. The two kinds have the same fields; `kind` picks the list, the public
 * route and the Server Actions.
 */
export async function PageForm({ kind, locale, id, saved }: { kind: ContentPageKind; locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType(SEGMENT[kind])!;
  const refs = await loadRichTextRefs(db);

  const [page] = id ? await db.select().from(contentPages).where(and(eq(contentPages.id, id), eq(contentPages.kind, kind))) : [];
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
        updatedByName: page.updatedBy ? names.get(page.updatedBy) : null,
        viewHref: localePath(locale, `${def.viewPath}/${page.slug}`),
      }
    : undefined;
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);
  const actions = ACTIONS[kind];

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={actions.save.bind(null, page?.id ?? null)}
      deleteAction={page ? actions.remove.bind(null, page.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      <Group icon="edit" id="group-text" legend={L("pagesGroupText")}>
        <BilingualTextField name="title" label={L("fieldTitle")} maxLength={200} defaultValue={{ th: page?.titleTh, en: page?.titleEn }} />
        <SlugField label={L("fieldSlug")} defaultValue={page?.slug} />
        <BilingualTextarea name="summary" label={L("fieldSummary")} hint={L("hintSummary")} maxLength={500} rows={3} defaultValue={{ th: page?.summaryTh, en: page?.summaryEn }} />
        <BilingualRichTextField name="body" label={L("fieldBody")} refs={refs} defaultValue={{ th: page?.bodyTh, en: page?.bodyEn }} />
      </Group>

      <Group icon="guides" id="group-placement" legend={L("pagesGroupPlacement")}>
        <EnumSelect
          name="category"
          label={L("fieldCategory")}
          hint={L("pagesHintCategory")}
          defaultValue={page?.category ?? ""}
          options={[{ value: "", label: L("choiceSelect") }, ...categoryOptions(locale)]}
        />
        <TextField name="sortOrder" type="number" inputMode="numeric" label={L("pagesFieldSortOrder")} hint={L("pagesHintSortOrder")} defaultValue={page?.sortOrder?.toString()} className="max-w-[12rem]" />
        <DateField name="lastReviewed" label={L("pagesFieldLastReviewed")} hint={L("pagesHintLastReviewed")} defaultValue={page?.lastReviewed} />
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

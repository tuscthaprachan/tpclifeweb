import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FormSection } from "@/components/admin/content/FormSection";
import { ContentForm, type ContentRecordInfo } from "@/components/admin/content/ContentForm";
import { BilingualListField, BilingualTextarea, BilingualTextField, DateTimeField, EnumSelect, SlugField } from "@/components/admin/content/fields";
import { ImagePicker } from "@/components/admin/content/ImagePicker";
import { BilingualRichTextField } from "@/components/admin/content/RichTextEditor";
import { formatBangkokDateTime } from "@/lib/admin/content/datetime";
import { categoryOptions, ownerOptions } from "@/lib/admin/content/options";
import { userNames } from "@/lib/admin/content/list";
import { loadRichTextRefs } from "@/lib/admin/content/refs";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { newsPostImages, newsPosts, newsPostTags } from "@/lib/db/schema";
import { a } from "@/lib/i18n/admin";
import { localePath, type Locale } from "@/lib/i18n/config";
import { deleteNewsPost, saveNewsPost } from "./actions";

/**
 * The news post form, for the "new" page (no `id`) and the edit page. Loads
 * what the pickers need and hands the stored values to the fields as
 * `defaultValue`. This is the template for every other content type.
 */
export async function NewsForm({ locale, id, saved }: { locale: Locale; id?: string; saved?: string }) {
  const db = getDb();
  const def = getContentType("news")!;
  const refs = await loadRichTextRefs(db);

  const [post] = id ? await db.select().from(newsPosts).where(eq(newsPosts.id, id)) : [];
  if (id && !post) notFound();
  const [gallery, tags, names] = post
    ? await Promise.all([
        db.select().from(newsPostImages).where(eq(newsPostImages.newsPostId, post.id)).orderBy(asc(newsPostImages.position)),
        db.select().from(newsPostTags).where(eq(newsPostTags.newsPostId, post.id)).orderBy(asc(newsPostTags.position)),
        userNames(db, [post.updatedBy]),
      ])
    : [[], [], new Map<string, string>()];

  const record: ContentRecordInfo | undefined = post
    ? {
        id: post.id,
        status: post.status,
        updatedAt: post.updatedAt.toISOString(),
        updatedByName: post.updatedBy ? names.get(post.updatedBy) : null,
        viewHref: localePath(locale, `/news/${post.slug}`),
      }
    : undefined;
  const L = (key: Parameters<typeof a>[0]) => a(key, locale);

  return (
    <ContentForm
      key={record?.updatedAt}
      locale={locale}
      action={saveNewsPost.bind(null, post?.id ?? null)}
      deleteAction={post ? deleteNewsPost.bind(null, post.id) : undefined}
      record={record}
      listHref={contentPath(def)}
      saved={saved}
    >
      <FormSection id="news-title" icon="edit" legend={L("cfSecTitleSummary")}>
        <BilingualTextField name="title" label={L("fieldTitle")} maxLength={200} defaultValue={{ th: post?.titleTh, en: post?.titleEn }} />
        <SlugField label={L("fieldSlug")} defaultValue={post?.slug} />
        <BilingualTextarea name="summary" label={L("fieldSummary")} hint={L("hintSummary")} maxLength={500} rows={3} defaultValue={{ th: post?.summaryTh, en: post?.summaryEn }} />
      </FormSection>
      <FormSection id="news-body" icon="guides" legend={L("cfSecBody")}>
        <BilingualRichTextField name="body" label={L("fieldBody")} refs={refs} defaultValue={{ th: post?.bodyTh, en: post?.bodyEn }} />
      </FormSection>
      <FormSection id="news-images" icon="images" legend={L("cfSecImages")}>
        <ImagePicker
          name="cover"
          label={L("fieldCoverImage")}
          images={refs.images}
          storageConfigured={refs.storageConfigured}
          defaultValue={post?.coverImageId ? [post.coverImageId] : []}
        />
        <ImagePicker
          name="gallery"
          label={L("fieldGallery")}
          hint={L("hintGallery")}
          multiple
          images={refs.images}
          storageConfigured={refs.storageConfigured}
          defaultValue={gallery.map((g) => g.imageId)}
        />
      </FormSection>
      <FormSection id="news-publishing" icon="publish" legend={L("cfSecPublishing")}>
        <EnumSelect
          name="owner"
          label={L("fieldOwner")}
          defaultValue={post?.owner ?? ""}
          options={[{ value: "", label: L("choiceSelect") }, ...ownerOptions(locale)]}
        />
        <EnumSelect
          name="category"
          label={L("fieldCategory")}
          defaultValue={post?.category ?? ""}
          options={[{ value: "", label: L("choiceNone") }, ...categoryOptions(locale)]}
        />
        <DateTimeField name="publishedAt" label={L("fieldPublishedAt")} hint={L("hintPublishedAt")} defaultValue={formatBangkokDateTime(post?.publishedAt)} />
        <BilingualListField name="tags" label={L("fieldTags")} itemLabel={L("fieldTag")} defaultValue={tags.map((t) => ({ th: t.labelTh, en: t.labelEn }))} />
      </FormSection>
    </ContentForm>
  );
}

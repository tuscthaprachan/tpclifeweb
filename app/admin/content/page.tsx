import { contentPlacement } from "@/app/admin/content/_list/placement";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsoleIcon } from "@/components/admin/icons";
import { ConsolePage, PageHeader } from "@/components/admin/ui";
import { Heading } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { countContentTypes } from "@/lib/admin/content/list";
import { CONTENT_TYPES, contentPath, type ContentTypeDef } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import type { ConsoleGroupId } from "@/lib/admin/nav";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { a, type AdminKey } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("contentHubTitle", locale) };
}

const GROUP_ORDER: ConsoleGroupId[] = ["announcements", "information", "directory", "canteen", "lostFound", "media", "settings"];

export default async function ContentHubPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const counts = await countContentTypes(getDb(), CONTENT_TYPES);

  const sections = GROUP_ORDER.map((id) => {
    const defs = CONTENT_TYPES.filter((def) => def.available && contentPlacement(def).group === id);
    const first = defs[0] ? contentPlacement(defs[0]) : undefined;
    return { id, defs, labelKey: first?.groupLabelKey as AdminKey, icon: first?.groupIcon };
  }).filter((s) => s.defs.length > 0);

  const meta = "inline-flex items-center gap-[var(--space-1)] text-sm text-ink-600";

  const card = (def: ContentTypeDef) => {
    const place = contentPlacement(def);
    const count = counts.get(def.key);
    const href = contentPath(def);
    const single = def.kind === "singleton";
    const label = a(def.labelKey, locale);
    return (
      <li key={def.key} className="console-card flex flex-col gap-[var(--space-2)] p-[var(--space-3)]">
        <div className="flex items-start gap-[var(--space-2)]">
          <ConsoleIcon name={place.icon} size={22} className="mt-[2px] text-ink-600" />
          <div className="min-w-0 flex-1">
            <Heading level={3} visualLevel={5} className="m-0 font-semibold">
              <a href={href}>{label}</a>
            </Heading>
            <p className="m-0 text-sm text-ink-600">{a(def.descriptionKey, locale)}</p>
          </div>
          {!single ? (
            <a
              href={`${href}/new`}
              className="inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center justify-center rounded-control border border-line-strong bg-surface text-ink-900 hover:bg-surface-alt"
            >
              <ConsoleIcon name="add" />
              <span className="visually-hidden">{a("listAdd", locale, { item: a(def.oneKey, locale) })}</span>
            </a>
          ) : null}
        </div>
        <p className="m-0 flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
          {single ? (
            <>
              <span className={meta}>
                <ConsoleIcon name="info" size={14} />
                {a("ccHubSingle", locale)}
              </span>
              <a href={href} className="inline-flex items-center gap-[var(--space-1)] text-sm">
                <ConsoleIcon name="edit" size={14} />
                {a("ccHubEditPage", locale)}
              </a>
            </>
          ) : count && !def.columns.status ? (
            <span className={meta}>
              <ConsoleIcon name="images" size={14} />
              {a("csCount", locale, { count: count.total })}
            </span>
          ) : count ? (
            <>
              <span className={meta}>
                <ConsoleIcon name="publish" size={14} />
                {a("ccHubPublished", locale, { n: count.published })}
              </span>
              <span className={meta}>
                <ConsoleIcon name="draft" size={14} />
                {a("ccHubDrafts", locale, { n: count.total - count.published })}
              </span>
            </>
          ) : null}
        </p>
      </li>
    );
  };

  return (
    <ConsolePage width="wide">
      <PageHeader title={a("contentHubTitle", locale)} icon="groupAnnouncements" description={a("contentHubIntro", locale)} />
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`hub-${section.id}`} className="flex flex-col gap-[var(--space-3)]">
          <Heading level={2} visualLevel={4} id={`hub-${section.id}`} className="m-0 flex items-center gap-[var(--space-2)] font-semibold">
            {section.icon ? <ConsoleIcon name={section.icon} className="text-ink-600" /> : null}
            {a(section.labelKey, locale)}
          </Heading>
          <ul className="m-0 grid list-none gap-[var(--space-3)] p-0 sm:grid-cols-2 xl:grid-cols-3">{section.defs.map(card)}</ul>
        </section>
      ))}
    </ConsolePage>
  );
}

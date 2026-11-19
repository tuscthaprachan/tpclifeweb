import Link from "next/link";
import { contentPlacement } from "@/app/admin/content/_list/placement";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { ConsoleIcon } from "@/components/admin/icons";
import { ConsolePage, PageHeader } from "@/components/admin/ui";
import { Heading } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { rowTitle } from "@/components/admin/content/ContentList";
import { StatusBadge } from "@/components/admin/content/StatusBadge";
import { Timestamp } from "@/components/ui";
import { countContentTypes, recentEditsBy } from "@/lib/admin/content/list";
import { CONTENT_TYPES, contentPath, type ContentTypeDef } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { isListedContentType, POST_TYPE_KEYS, type ContentSectionId } from "@/lib/admin/nav";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { A, a, type AdminKey } from "@/lib/i18n/admin";
import { HubFilter } from "./HubFilter";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("contentHubTitle", locale) };
}

const GROUP_ORDER: ContentSectionId[] = ["information", "directory", "canteen", "media", "settings"];

const WEBSITE_TYPES = CONTENT_TYPES.filter((def) => isListedContentType(def) && !POST_TYPE_KEYS.includes(def.key));

export default async function ContentHubPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  const staff = await requireEditor();
  const db = getDb();
  const [counts, mine] = await Promise.all([countContentTypes(db, CONTENT_TYPES.filter(isListedContentType)), recentEditsBy(db, CONTENT_TYPES.filter(isListedContentType), staff.user.id)]);
  let drafts = 0;
  for (const def of CONTENT_TYPES.filter(isListedContentType)) {
    const c = counts.get(def.key);
    if (c && def.columns.status) drafts += c.total - c.published;
  }

  const sections = GROUP_ORDER.map((id) => {
    const defs = WEBSITE_TYPES.filter((def) => contentPlacement(def).group === id);
    const first = defs[0] ? contentPlacement(defs[0]) : undefined;
    return { id, defs, labelKey: first?.groupLabelKey as AdminKey, icon: first?.groupIcon ?? undefined };
  }).filter((s) => s.defs.length > 0);

  const meta = "inline-flex items-center gap-[var(--space-1)] text-sm text-ink-600";

  const card = (def: ContentTypeDef) => {
    const place = contentPlacement(def);
    const count = counts.get(def.key);
    const href = contentPath(def);
    const single = def.kind === "singleton";
    const label = a(def.labelKey, locale);
    const searchText = [A[def.labelKey].th, A[def.labelKey].en, A[def.descriptionKey].th, A[def.descriptionKey].en].join(" ").toLowerCase();
    return (
      <li key={def.key} data-hub-card data-hub-text={searchText} className="console-card flex flex-col gap-[var(--space-2)] p-[var(--space-3)]">
        <div className="flex items-start gap-[var(--space-2)]">
          <ConsoleIcon name={place.icon} size={22} className="mt-[2px] text-ink-600" />
          <div className="min-w-0 flex-1">
            <Heading level={3} visualLevel={5} className="m-0 font-semibold">
              <Link href={href}>{label}</Link>
            </Heading>
            <p className="m-0 text-sm text-ink-600">{a(def.descriptionKey, locale)}</p>
          </div>
          {!single ? (
            <Link
              href={`${href}/new`}
              className="inline-flex min-h-[var(--target-min)] min-w-[var(--target-min)] items-center justify-center rounded-control border border-line-strong bg-surface text-ink-900 hover:bg-surface-alt"
            >
              <ConsoleIcon name="add" />
              <span className="visually-hidden">{a("listAdd", locale, { item: a(def.oneKey, locale) })}</span>
            </Link>
          ) : null}
        </div>
        <p className="m-0 flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
          {single ? (
            <>
              <span className={meta}>
                <ConsoleIcon name="info" size={14} />
                {a("ccHubSingle", locale)}
              </span>
              <Link href={href} className="inline-flex min-h-[var(--target-min)] items-center gap-[var(--space-1)] text-sm">
                <ConsoleIcon name="edit" size={14} />
                {a("ccHubEditPage", locale)}
              </Link>
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
                {a("ccHubPublished", locale, { n: count.live })}
              </span>
              {count.scheduled > 0 ? (
                <span className={meta}>
                  <ConsoleIcon name="publish" size={14} />
                  {a("ccHubScheduled", locale, { n: count.scheduled })}
                </span>
              ) : null}
              {count.expired > 0 ? (
                <span className={meta}>
                  <ConsoleIcon name="publish" size={14} />
                  {a("ccHubExpired", locale, { n: count.expired })}
                </span>
              ) : null}
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

  const redirectsText = [A.rdLink.th, A.rdLink.en, A.shRedirectsDesc.th, A.shRedirectsDesc.en].join(" ").toLowerCase();
  const redirectsCard = (
    <li key="redirects" data-hub-card data-hub-text={redirectsText} className="console-card flex items-start gap-[var(--space-2)] p-[var(--space-3)]">
      <ConsoleIcon name="redirects" size={22} className="mt-[2px] text-ink-600" />
      <div className="min-w-0 flex-1">
        <Heading level={3} visualLevel={5} className="m-0 font-semibold">
          <Link href="/admin/settings/redirects">{a("rdLink", locale)}</Link>
        </Heading>
        <p className="m-0 text-sm text-ink-600">{a("shRedirectsDesc", locale)}</p>
      </div>
    </li>
  );

  return (
    <ConsolePage width="wide">
      <PageHeader title={a("contentHubTitle", locale)} icon="guides" description={a("contentHubIntro", locale)} />
      <HubFilter targetId="hub-sections" labels={{ label: a("shHubFindLabel", locale), hint: a("shHubFindHint", locale), count: a("shHubFindCount", locale), none: a("shHubFindNone", locale) }} />
      <section aria-labelledby="hub-summary" className="flex flex-col gap-[var(--space-3)]">
        <Heading level={2} visualLevel={4} id="hub-summary" className="m-0 flex items-center gap-[var(--space-2)] font-semibold">
          <ConsoleIcon name="draft" className="text-ink-600" />
          {a("clHubDraftsTotal", locale)}
        </Heading>
        <p className="m-0 flex flex-wrap items-baseline gap-x-[var(--space-3)]">
          <span className="text-3xl font-bold tabular-nums">{drafts}</span>
          <span className="text-ink-600">{a("clHubDraftsHint", locale)}</span>
        </p>
        <Heading level={3} visualLevel={5} className="m-0 flex items-center gap-[var(--space-2)] font-semibold">
          <ConsoleIcon name="edit" className="text-ink-600" />
          {a("clHubMine", locale)}
        </Heading>
        {mine.length === 0 ? (
          <p className="m-0 text-ink-600">{a("clHubMineEmpty", locale)}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {mine.map(({ def, row }) => {
              const place = contentPlacement(def);
              return (
                <li key={`${def.key}-${row.id}`} className="flex flex-wrap items-center gap-x-[var(--space-3)] gap-y-[var(--space-1)] border-b border-line py-[var(--space-2)]">
                  <ConsoleIcon name={place.icon} size={16} className="text-ink-600" />
                  <Link href={contentPath(def, row.id)} className="min-w-0 font-medium [overflow-wrap:anywhere]">
                    {rowTitle(row.title, locale)}
                  </Link>
                  <span className="text-sm text-ink-600">{a(def.labelKey, locale)}</span>
                  {row.status ? <StatusBadge status={row.status} locale={locale} /> : null}
                  <span className="text-sm text-ink-600">
                    <Timestamp value={row.updatedAt} locale={locale} format="relative" />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <div id="hub-sections" className="flex flex-col gap-[var(--space-6)]">
        {sections.map((section) => (
          <section key={section.id} data-hub-section aria-labelledby={`hub-${section.id}`} className="flex flex-col gap-[var(--space-3)]">
            <Heading level={2} visualLevel={4} id={`hub-${section.id}`} className="m-0 flex items-center gap-[var(--space-2)] font-semibold">
              {section.icon ? <ConsoleIcon name={section.icon} className="text-ink-600" /> : null}
              {a(section.labelKey, locale)}
            </Heading>
            <ul className="m-0 grid list-none gap-[var(--space-3)] p-0 sm:grid-cols-2 xl:grid-cols-3">
              {section.defs.map(card)}
              {section.id === "settings" ? redirectsCard : null}
            </ul>
          </section>
        ))}
      </div>
    </ConsolePage>
  );
}

import { AdminPage } from "@/components/admin/AdminPage";
import { NotConfigured } from "@/components/admin/NotConfigured";
import { Heading } from "@/components/ui";
import { requireEditor } from "@/lib/admin/content/access";
import { countContentTypes } from "@/lib/admin/content/list";
import { CONTENT_TYPES, contentPath } from "@/lib/admin/content/types";
import { getAdminLocale } from "@/lib/admin/locale";
import { isAuthConfigured } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getAdminLocale();
  return { title: a("contentHubTitle", locale) };
}

export default async function ContentHubPage() {
  const locale = await getAdminLocale();
  if (!isAuthConfigured()) return <NotConfigured locale={locale} />;
  await requireEditor();
  const counts = await countContentTypes(getDb(), CONTENT_TYPES);

  return (
    <AdminPage width="content">
      <div>
        <Heading level={1}>{a("contentHubTitle", locale)}</Heading>
        <p className="mt-[var(--space-2)] text-ink-600">{a("contentHubIntro", locale)}</p>
      </div>
      <ul className="m-0 grid list-none gap-[var(--space-4)] p-0 sm:grid-cols-2 lg:grid-cols-3">
        {CONTENT_TYPES.map((def) => {
          const count = counts.get(def.key);
          const href = contentPath(def);
          return (
            <li key={def.key} className="flex flex-col gap-[var(--space-2)] rounded-panel border border-line bg-surface p-[var(--space-4)]">
              <Heading level={2} className="m-0 text-lg font-semibold">
                {def.available ? <a href={href}>{a(def.labelKey, locale)}</a> : a(def.labelKey, locale)}
              </Heading>
              <p className="m-0 flex-1 text-sm text-ink-600">{a(def.descriptionKey, locale)}</p>
              <p className="m-0 text-sm text-ink-900">
                {!def.available
                  ? a("hubComingSoon", locale)
                  : def.kind === "singleton"
                    ? a("hubSingleton", locale)
                    : count
                      ? a("hubCounts", locale, { total: count.total, published: count.published, drafts: count.total - count.published })
                      : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </AdminPage>
  );
}

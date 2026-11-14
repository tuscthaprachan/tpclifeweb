import Link from "next/link";
import type { ImageUse, ImageUseRole } from "@/lib/admin/media/usage";
import { contentPath, getContentType } from "@/lib/admin/content/types";
import { a } from "@/lib/i18n/admin";
import { pick, type Locale } from "@/lib/i18n/config";

const ROLE_KEY = {
  cover: "mediaRoleCover",
  gallery: "mediaRoleGallery",
  photo: "mediaRolePhoto",
  text: "mediaRoleText",
  settings: "mlRoleSettings",
} as const satisfies Record<ImageUseRole, string>;

/** Link to edit the item that uses a picture; a singleton (site settings) has no id in its path. */
export function usageHref(use: ImageUse): string | null {
  const type = getContentType(use.segment);
  if (!type?.available) return null;
  return type.kind === "singleton" ? contentPath(type) : contentPath(type, use.id);
}

/** Where a picture is used, each with a link to edit that item. */
export function UsageList({ uses, locale }: { uses: ImageUse[]; locale: Locale }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-[var(--space-2)] p-0">
      {uses.map((use, index) => {
        const type = getContentType(use.segment);
        const typeName = type ? a(type.labelKey, locale) : use.segment;
        const title = pick(use.title, locale) || use.title.th || use.title.en || a("mlUsageUntitled", locale);
        const href = usageHref(use);
        return (
          <li key={`${use.segment}-${use.id}-${use.role}-${index}`}>
            {href ? <Link href={href}>{title}</Link> : title}
            <span className="text-ink-600">
              {" "}
              ({typeName}, {a(ROLE_KEY[use.role], locale)})
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Short "News, Events" text for a refusal reason. */
export function usedInSummary(uses: ImageUse[], locale: Locale): string {
  const names = [...new Set(uses.map((u) => getContentType(u.segment)).map((t, i) => (t ? a(t.labelKey, locale) : uses[i]!.segment)))];
  return names.join(", ");
}

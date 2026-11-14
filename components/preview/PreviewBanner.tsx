import { eq } from "drizzle-orm";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, NotificationBanner, Stack } from "@/components/ui";
import { lifecycleType } from "@/lib/admin/content/lifecycle";
import { scheduleState } from "@/lib/admin/content/schedule";
import { contentPath } from "@/lib/admin/content/types";
import { getDb } from "@/lib/db";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

const STATE_KEY = { draft: "statusDraft", scheduled: "clcStatusScheduled", live: "statusPublished", expired: "clcStatusExpired" } as const;

/**
 * Shown at the top of a public detail page while an editor previews it: says
 * it is a preview, names the item's status, and offers the way back. Rendered
 * only when `isPreview()` is true.
 */
export async function PreviewBanner({ locale, segment, id }: { locale: Locale; segment: string; id: string }) {
  const found = lifecycleType(segment);
  if (!found) return null;
  const table = found.def.table as unknown as { id: Parameters<typeof eq>[0]; status: Parameters<typeof eq>[0] };
  const [row] = (await getDb()
    .select()
    .from(found.def.table)
    .where(eq(table.id, id))
    .limit(1)) as { status: string; publishAt?: Date | null; unpublishAt?: Date | null }[];
  const state = row ? scheduleState(row) : "draft";
  const back = contentPath(found.def, id);

  return (
    <NotificationBanner variant="info" title={a("clcPreviewBanner", locale)} focusOnMount={false} className="my-[var(--space-4)]">
      <Stack space={3}>
        <p className="m-0">{a("clcPreviewBannerBody", locale)}</p>
        <p className="m-0 font-medium">{a("clcPreviewStatus", locale, { status: a(STATE_KEY[state], locale) })}</p>
        <div className="flex flex-wrap gap-[var(--space-3)]">
          <Button href={back} variant="secondary" icon={<ConsoleIcon name="edit" />}>
            {a("clcPreviewEdit", locale)}
          </Button>
          <form method="post" action="/api/preview/exit">
            <input type="hidden" name="returnTo" value={back} />
            <Button type="submit" variant="quiet" icon={<ConsoleIcon name="close" />}>
              {a("clcPreviewExit", locale)}
            </Button>
          </form>
        </div>
      </Stack>
    </NotificationBanner>
  );
}

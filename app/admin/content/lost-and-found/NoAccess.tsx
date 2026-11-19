import { ConsolePage, EmptyPanel, PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";

/** What an editor without the desk officer role sees: lost and found now lives on the case page. */
export function LostFoundNoAccess({ locale }: { locale: Locale }) {
  return (
    <ConsolePage width="wide">
      <PageHeader title={a("lfrNoAccessTitle", locale)} icon="lostFound" />
      <EmptyPanel
        icon="lostFound"
        title={a("lfrNoAccessTitle", locale)}
        action={
          <Button href="/admin/content" variant="secondary">
            {a("contentHubTitle", locale)}
          </Button>
        }
      >
        {a("lfrNoAccessBody", locale)}
      </EmptyPanel>
    </ConsolePage>
  );
}

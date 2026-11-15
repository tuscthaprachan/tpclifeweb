"use client";

import { useFormStatus } from "react-dom";
import { Button, Stack } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { PortalDialog } from "../PortalDialog";

function Buttons({ locale, held, onClose }: { locale: Locale; held: boolean; onClose: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-[var(--space-3)]">
      <Button type="submit" variant="destructive" loading={pending} loadingLabel={a("cfDeleting", locale)} disabled={held}>
        {a("formDeleteConfirm", locale)}
      </Button>
      <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
        {a("formDeleteCancel", locale)}
      </Button>
    </div>
  );
}

/**
 * The confirmation before Delete. The confirm button is held while a save is
 * running and while the delete itself runs, so it cannot be sent twice or
 * race a save. When there are unsaved changes the dialog says they go too.
 */
export function DeleteDialog({
  locale,
  open,
  onClose,
  action,
  dirty,
  saving,
}: {
  locale: Locale;
  open: boolean;
  onClose: () => void;
  action: (formData: FormData) => Promise<void>;
  dirty: boolean;
  saving: boolean;
}) {
  return (
    <PortalDialog open={open} onClose={onClose} title={a("formDeleteTitle", locale)} headingLevel={2} locale={locale}>
      <form action={action}>
        <Stack space={4}>
          <p className="m-0">{a("formDeleteBody", locale)}</p>
          {dirty ? <p className="m-0 font-medium">{a("cfDeleteUnsaved", locale)}</p> : null}
          <Buttons locale={locale} held={saving} onClose={onClose} />
        </Stack>
      </form>
    </PortalDialog>
  );
}

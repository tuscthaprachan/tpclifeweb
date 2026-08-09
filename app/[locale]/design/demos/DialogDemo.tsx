"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { HeadingLevel } from "@/lib/a11y";
import type { Locale } from "@/lib/i18n/config";

/**
 * Dialog needs its open state to live outside the component itself (a
 * trigger button toggles it), so unlike Tabs or Accordion it cannot be
 * dropped straight into a Server Component. This tiny wrapper is the "use
 * client" boundary instead of the whole design page.
 */
export function DialogDemo({ headingLevel, locale }: { headingLevel: HeadingLevel; locale: Locale }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Confirm" headingLevel={headingLevel} locale={locale}>
        <p className="m-0 text-ink-900">Escape, the close button, or the reader&apos;s own back gesture all close this. Nothing here ever blocks Escape.</p>
      </Dialog>
    </div>
  );
}

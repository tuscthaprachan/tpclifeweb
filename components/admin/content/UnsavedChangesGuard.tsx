"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConsoleIcon } from "@/components/admin/icons";
import { Button, Stack } from "@/components/ui";
import { a } from "@/lib/i18n/admin";
import type { Locale } from "@/lib/i18n/config";
import { PortalDialog } from "./PortalDialog";

/**
 * While `dirty`, warns before the page is left: the browser's own prompt for
 * reloads, closing the tab and external links, and an accessible dialog
 * (Stay / Leave without saving) for any in-app link, including the sidebar,
 * breadcrumbs and Next `Link`s. Render it anywhere inside a client form.
 */
export function UnsavedChangesGuard({ dirty, locale }: { dirty: boolean; locale: Locale }) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const leaving = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.closest("dialog")) return;
      if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setTarget(`${url.pathname}${url.search}${url.hash}`);
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function leave() {
    const next = target;
    setTarget(null);
    if (!next) return;
    leaving.current = true;
    router.push(next);
  }

  return (
    <PortalDialog open={target !== null} onClose={() => setTarget(null)} title={a("cfLeaveTitle", locale)} headingLevel={2} locale={locale}>
      <Stack space={4}>
        <p className="m-0">{a("cfLeaveBody", locale)}</p>
        <div className="flex flex-wrap gap-[var(--space-3)]">
          <Button type="button" onClick={() => setTarget(null)} icon={<ConsoleIcon name="back" />}>
            {a("cfStay", locale)}
          </Button>
          <Button type="button" variant="secondary" onClick={leave}>
            {a("cfLeave", locale)}
          </Button>
        </div>
      </Stack>
    </PortalDialog>
  );
}

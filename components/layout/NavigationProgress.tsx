"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function targetOf(event: Event): URL | null {
  if (event instanceof MouseEvent) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    if (!(event.target instanceof Element)) return null;
    const link = event.target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement)) return null;
    if ((link.target && link.target !== "_self") || link.hasAttribute("download")) return null;
    return new URL(link.href);
  }
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.method !== "get") return null;
  if (form.querySelector('input[name^="$ACTION"]')) return null;
  const url = new URL(form.action || window.location.href);
  const data = new FormData(form, (event as SubmitEvent).submitter);
  url.search = new URLSearchParams([...data].filter((entry): entry is [string, string] => typeof entry[1] === "string")).toString();
  return url;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const current = search ? `${pathname}?${search}` : pathname;
  const [pending, setPending] = useState(false);
  const [seen, setSeen] = useState(current);
  if (seen !== current) {
    setSeen(current);
    setPending(false);
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const start = (event: Event) => {
      const url = targetOf(event);
      if (!url || url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setPending(true);
      clearTimeout(timer);
      timer = setTimeout(() => setPending(false), 15000);
    };
    document.addEventListener("click", start);
    document.addEventListener("submit", start);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", start);
      document.removeEventListener("submit", start);
    };
  }, []);

  return <div aria-hidden="true" className="nav-progress" data-active={pending || undefined} />;
}

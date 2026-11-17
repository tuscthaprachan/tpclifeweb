"use client";

import { useEffect } from "react";

/**
 * Puts the error prefix at the front of the page title while the page shows an
 * error summary, so a screen reader hears that something went wrong when the
 * page loads. The server cannot know in advance: a rejected answer is only
 * read, once, when the page is drawn.
 */
export function ErrorTitle({ prefix }: { prefix: string }) {
  useEffect(() => {
    const apply = () => {
      if (!document.title.startsWith(prefix)) document.title = `${prefix}${document.title}`;
    };
    apply();
    const node = document.querySelector("title");
    if (!node) return;
    const observer = new MutationObserver(apply);
    observer.observe(node, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [prefix]);
  return null;
}

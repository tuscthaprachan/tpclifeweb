"use client";

import { useSyncExternalStore, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@/components/ui";

const subscribe = () => () => {};

/**
 * `Dialog` rendered into `document.body`. Inside the content form a plain
 * `Dialog` would sit in the `<form>`, so pressing Enter in one of its inputs
 * would submit the whole page. React events still bubble to the owner.
 */
export function PortalDialog(props: ComponentProps<typeof Dialog>) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return mounted ? createPortal(<Dialog {...props} />, document.body) : null;
}

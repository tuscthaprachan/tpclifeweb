"use client";

import type { ReactNode } from "react";
import { useContentForm } from "@/components/admin/content/context";
import { NotificationBanner } from "@/components/ui";

/** The "prices saved" notice, hidden while the form shows errors from a later try so the two do not contradict each other. */
export function SavedBanner({ title, children }: { title: string; children: ReactNode }) {
  const { errors } = useContentForm();
  if (Object.keys(errors).length > 0) return null;
  return (
    <NotificationBanner variant="success" title={title}>
      {children}
    </NotificationBanner>
  );
}

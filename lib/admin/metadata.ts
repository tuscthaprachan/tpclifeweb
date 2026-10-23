import "server-only";

import type { Metadata } from "next";
import { getAdminLocale } from "@/lib/admin/locale";
import { A, type AdminKey } from "@/lib/i18n/admin";

/** `<title>` for a console page, in the active language. */
export async function adminTitle(key: AdminKey): Promise<Metadata> {
  const locale = await getAdminLocale();
  return { title: A[key][locale] };
}
